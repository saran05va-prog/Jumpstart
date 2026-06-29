# Architecture

## Layering

Each feature module (`roadmap`, `topic`, `resource`, `note`, `goal`,
`certification`, `auth`) follows the same four-layer shape:

```
Controller   → HTTP only: path/query binding, @Valid, status codes. No business logic.
Service      → business rules, ownership/permission checks, transactions.
Repository   → Spring Data JPA interfaces; Specifications for dynamic filters.
Entity       → JPA-mapped persistence model.
DTO          → Request/Response records, decoupled from entities on purpose.
```

DTOs never expose JPA entities directly: every response is built by a static
`from(entity)` factory method on the DTO record. This means changing a
column name or adding a lazy relationship never silently breaks the API
contract or leaks a Hibernate proxy into a JSON response.

## Why these choices

**Spring Boot 3 / Java 21** — the most common production stack for this kind
of CRUD-and-auth-heavy service; broad hiring pool, long support window, and
records/pattern matching in modern Java keep the DTO layer concise.

**MySQL over Postgres** — the original spec named MySQL/Aiven MySQL
explicitly. Nothing in the schema relies on MySQL-specific features beyond
`LONGTEXT` for note bodies, so moving to Postgres later is a Flyway-script
rewrite, not an application rewrite.

**Flyway over Hibernate `ddl-auto=update`** — `ddl-auto` is set to
`validate`, meaning the app refuses to start if entities and schema
disagree. Schema changes are explicit, versioned SQL files reviewed in pull
requests — this is the difference between "the database changed because
someone ran the app" and "the database changed because someone wrote and
reviewed a migration."

**JWT access tokens + opaque, hashed, rotating refresh tokens** — access
tokens are short-lived (15 min default) and stateless, so most requests need
zero database lookups to authenticate. Refresh tokens are high-entropy
random strings; only their SHA-256 hash is stored, and every refresh
revokes the old token and issues a new pair (rotation), so a stolen-and-
replayed refresh token is detectable (the legitimate user's next refresh
will fail because their token was already consumed).

**Ownership checks in the service layer, not just `@PreAuthorize`** — role
(`STUDENT`/`MENTOR`/`ORGANIZATION`/`ADMIN`) gates *which endpoints* a user
can call; per-row ownership (`roadmap.owner.id == requester.id`) gates
*which rows*. Both matter: a STUDENT role should be able to hit
`POST /api/roadmaps`, but only ever see their own roadmaps. `ADMIN` bypasses
the ownership check everywhere, mirroring a support/back-office use case.

## Request lifecycle

```
Client
  │  Authorization: Bearer <jwt>
  ▼
JwtAuthenticationFilter        – validates signature + expiry, loads UserDetails
  ▼
Spring Security filter chain   – authorizeHttpRequests() route rules
  ▼
Controller                     – @Valid binds + validates the request body
  ▼
Service                        – loads entity, checks ownership, applies the change
  ▼
Repository (JPA)                – translates to SQL via Hibernate
  ▼
DTO.from(entity)                – maps back to a stable response shape
  ▼
GlobalExceptionHandler          – catches anything thrown along the way, returns
                                   a consistent { status, code, message, path } body
```

## What's intentionally not here yet

- **Caching layer.** Every read hits MySQL. Fine at MVP scale; see the
  scaling notes in the main README for where Redis would go first.
- **Event-driven anything.** The brief mentioned "event-driven design where
  appropriate," but at this scale (a handful of REST resources with no
  cross-service workflows) introducing a message broker would add
  operational cost without a corresponding benefit. Revisit if/when
  features like "notify a mentor when a mentee completes a roadmap" appear
  and need to fan out to multiple consumers (email, in-app, analytics).
- **Multi-tenancy.** `ORGANIZATION` exists as a role but there's no
  `organization_id` column anywhere yet — every row is owned by an
  individual user. True multi-tenant workspaces (shared roadmaps, org-wide
  analytics, seat management) are a deliberately separate, larger feature.
