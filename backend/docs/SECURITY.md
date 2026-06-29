# Security

## Authentication

- Passwords are hashed with **BCrypt** (`BCryptPasswordEncoder`, default
  strength) — never stored or logged in plaintext.
- **Access tokens** are JWTs (HMAC-SHA256), 15 minutes by default
  (`JWT_ACCESS_EXPIRATION_MS`). They carry `sub` (email), `uid`, and `role`
  claims and are verified on every request by `JwtAuthenticationFilter`.
- **Refresh tokens** are 64 bytes of `SecureRandom`, base64url-encoded. Only
  their SHA-256 hash is persisted (`refresh_tokens.token_hash`) — a database
  leak does not expose usable tokens. Every refresh **rotates** the token:
  the old one is marked `revoked` and a new pair is issued, so reuse of an
  old refresh token is rejected outright.
- There is no session state on the server beyond the refresh token table —
  the API is fully stateless for access-token-authenticated requests, which
  is what makes horizontal scaling (more API instances behind a load
  balancer) trivial.

## Authorization

Two layers, intentionally separate:

1. **Role** (`STUDENT`/`MENTOR`/`ORGANIZATION`/`ADMIN`) — coarse, "can you
   call this endpoint at all" gating via Spring Security's
   `hasRole(...)`/`@PreAuthorize`. Self-registration is restricted to
   `STUDENT` and `MENTOR` (enforced by `@Pattern` on `RegisterRequest.role`)
   — `ORGANIZATION` and `ADMIN` accounts must be provisioned directly in the
   database or via a future admin tool, not through public sign-up.
2. **Ownership** — fine-grained, "can you touch *this row*" gating, checked
   in every service method (`roadmap.owner.id.equals(requesterId)`).
   `ADMIN` bypasses ownership checks everywhere, which is the intended
   support/back-office escape hatch — treat granting the `ADMIN` role as a
   privileged operation in its own right.

A request that fails authentication returns `401` with code `UNAUTHORIZED`;
a request that's authenticated but not allowed returns `403` with code
`FORBIDDEN`. Don't conflate the two in client error handling — `401` means
"log in again," `403` means "this isn't yours."

## Input validation

Every request DTO uses Bean Validation (`@NotBlank`, `@Email`, `@Size`,
`@Min`/`@Max`, `@Positive`, `@Pattern`) and controllers are annotated
`@Valid`. Validation failures never reach a service or the database — they
short-circuit in `GlobalExceptionHandler` with field-level detail.

## Transport & secrets

- CORS is locked to an explicit allow-list (`CORS_ALLOWED_ORIGINS`) —
  there is no wildcard `*` origin anywhere.
- `JWT_SECRET` has **no usable default** in the `prod` profile; the app will
  fail to start in production rather than silently sign tokens with a
  guessable key. Generate one with `openssl rand -base64 64` and store it in
  your hosting provider's secret manager, not in a committed file.
- `.env` is git-ignored; `.env.example` documents every variable without
  real values.
- Run behind TLS in production (the `application-prod.yml` JDBC URL sets
  `useSSL=true` for the database connection; terminate HTTPS for the API
  itself at your load balancer / hosting platform).

## OWASP-relevant protections already in place

| Risk | Mitigation |
|---|---|
| Broken access control | Role + ownership checks on every mutating and most read endpoints |
| Cryptographic failures | BCrypt for passwords, SHA-256-hashed refresh tokens, no secrets in source |
| Injection | JPA/Hibernate parameterized queries and `Specification` predicates everywhere — no string-concatenated SQL |
| Insecure design (mass assignment) | DTOs are explicit allow-lists of fields; entities are never bound directly from request bodies |
| Security misconfiguration | CORS allow-list, CSRF disabled deliberately (stateless JWT API, not cookie-based), explicit `permitAll()` list rather than a broad default |
| Identification & auth failures | Refresh token rotation, short-lived access tokens, generic "email or password is incorrect" message (doesn't reveal which one was wrong) |

## What's not implemented yet (be aware before going to production)

- **Rate limiting.** There's no throttling on `/api/auth/login` or
  `/api/auth/register` yet, which means brute-force/credential-stuffing and
  registration-spam are both currently possible. Adding `bucket4j` (or a
  reverse-proxy-level limiter like nginx `limit_req` / Cloudflare) in front
  of `/api/auth/**` should be a near-term priority, not a someday item.
- **Audit logging.** Mutations aren't currently written to an audit trail.
  Straightforward to add as a `@EntityListeners`-based listener or an AOP
  aspect around service methods if/when compliance requires it.
- **Email verification enforcement.** The `email_verified` column exists,
  but nothing currently blocks an unverified account from using the API —
  there's no email-sending infrastructure yet to make verification real.
- **Account lockout after repeated failed logins.** Same category as rate
  limiting — worth pairing them.

None of these are "the app is insecure" — they're "the app's authn/authz
core is solid, and here are the operational hardening steps that
production traffic, not an MVP demo, actually requires."
