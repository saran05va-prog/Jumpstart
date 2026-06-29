# Jumpstart Backend

REST API for **Jumpstart**, a learning operating system for tracking roadmaps,
topics, resources, notes, goals and certifications. Spring Boot 3 / Java 21,
MySQL, JWT authentication, Flyway migrations.

This is the MVP backend: real authentication and a real database, covering
the core data model end to end. It does not yet include every feature listed
in the original product brief (AI recommendations, email delivery, file
uploads, multi-tenant organizations) — see [Roadmap](#roadmap-not-yet-built)
below for what's intentionally left for a follow-up phase.

## Tech stack

| Concern        | Choice                                   | Why                                                              |
|-----------------|-------------------------------------------|-------------------------------------------------------------------|
| Language/runtime | Java 21, Spring Boot 3.3                 | Mature ecosystem, long-term support, strong typing for a domain this shaped |
| Web layer        | Spring Web (MVC), Bean Validation         | Standard, well documented, plays well with OpenAPI generation     |
| Persistence       | Spring Data JPA + Hibernate, MySQL 8      | Relational data with real foreign keys (roadmaps→topics, users→everything) |
| Migrations        | Flyway                                   | Versioned, reviewable SQL instead of relying on Hibernate auto-DDL in production |
| Auth              | Spring Security + JWT (jjwt)              | Stateless access tokens; rotating, hashed refresh tokens in the DB |
| API docs          | springdoc-openapi (Swagger UI)            | Self-hosting, always in sync with the code                        |
| Tests             | JUnit 5, Mockito, MockMvc, H2              | Unit tests for logic, integration tests for full request/response cycles |

## Repository layout

```
src/main/java/com/jumpstart/
  config/          Security, CORS and OpenAPI configuration
  common/          Shared exception types, error response shape, pagination wrapper
  security/        JWT issuing/parsing, the auth filter, UserDetails adapter
  user/             User entity, role enum, repository, UserDetailsService
  auth/             Register/login/refresh/logout
  roadmap/          Roadmaps (CRUD, filtering, archive, clone)
  topic/            Topics nested under a roadmap
  resource/         Saved learning resources (videos, docs, repos, ...)
  note/             Markdown notes
  goal/             Daily/weekly/monthly/long-term goals
  certification/    Certificates with computed expiry status
  search/           Cross-entity title search
  health/           Public health check
src/main/resources/
  application*.yml  Base + dev/prod/test profiles
  db/migration/      Flyway SQL migrations
src/test/            Unit + integration tests
```

Each feature module follows the same shape: `Entity → Repository → DTOs →
Service (business rules + ownership checks) → Controller (HTTP only)`.

## Prerequisites

- Docker + Docker Compose (recommended path — no local Java/MySQL needed)
- *or*, for running outside Docker: Java 21 and a MySQL 8 instance

## Run it locally with Docker Compose (recommended)

```bash
cp .env.example .env        # then edit values, especially JWT_SECRET
docker compose up --build
```

This starts MySQL, runs Flyway migrations automatically on boot, and starts
the API on `http://localhost:8080`. Swagger UI is at
`http://localhost:8080/swagger-ui.html`. Adminer (a DB browser) is at
`http://localhost:8081` (server: `db`, user/password from your `.env`).

A demo account is seeded automatically (see `db/migration/V2__seed.sql`):

```
email:    demo@jumpstart.dev
password: Password123!
```

Delete `V2__seed.sql` before your first production deploy if you don't want
demo data in a real environment.

## Run it without Docker

```bash
# 1. Start your own MySQL 8 instance and create a database
mysql -u root -p -e "CREATE DATABASE jumpstart;"

# 2. Export the env vars from .env.example (or use a tool like direnv)
export DB_HOST=localhost DB_PORT=3306 DB_NAME=jumpstart \
       DB_USERNAME=jumpstart DB_PASSWORD=jumpstart \
       JWT_SECRET=$(openssl rand -base64 64)

# 3. Build and run
mvn clean install
mvn spring-boot:run
```

> **A note on verification:** I built and reviewed every file in this
> project carefully against the Spring Boot 3.3 / Spring Security 6 APIs,
> but the sandbox this was generated in has no network access to Maven
> Central, so I could not actually execute `mvn clean install` here to
> prove it compiles. Run it on your machine the moment you can — if
> anything doesn't build, paste me the error and I'll fix it immediately.

## Environment variables

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `SPRING_PROFILES_ACTIVE` | no | `dev` | `dev`, `prod`, or `test` |
| `PORT` | no | `8080` | HTTP port |
| `DB_HOST` / `DB_PORT` / `DB_NAME` / `DB_USERNAME` / `DB_PASSWORD` | yes (prod) | — | MySQL connection |
| `JWT_SECRET` | **yes** | insecure placeholder | HMAC signing key for access tokens — generate with `openssl rand -base64 64` |
| `JWT_ACCESS_EXPIRATION_MS` | no | `900000` (15 min) | Access token lifetime |
| `JWT_REFRESH_EXPIRATION_MS` | no | `604800000` (7 days) | Refresh token lifetime |
| `CORS_ALLOWED_ORIGINS` | yes | `http://localhost:5173` | Comma-separated list of allowed frontend origins |
| `MYSQL_ROOT_PASSWORD` | docker-compose only | — | Root password for the local MySQL container |

The `application-prod.yml` profile has **no defaults** for database
credentials or `JWT_SECRET` on purpose — the app will fail to start in
`prod` if you forget to set them, rather than silently using a weak default.

## Database migrations

Schema changes live in `src/main/resources/db/migration` as
`V<number>__description.sql` files, run automatically by Flyway on startup.
To add a migration: create `V3__your_change.sql`, write plain SQL, and
restart the app — `ddl-auto` is set to `validate`, so Hibernate will refuse
to start if your entities and the actual schema disagree, catching drift
early.

## Testing

```bash
mvn test
```

Tests run against an in-memory H2 database (MySQL compatibility mode), so no
external database is needed. Included:

- `JwtServiceTest` — token generation, expiry, tamper detection
- `RoadmapServiceTest` — ownership rules with Mockito (a non-owner gets 403, an admin doesn't)
- `AuthControllerIT` — full register → login → `/me` flow over real HTTP, plus duplicate-email and bad-password cases
- `RoadmapControllerIT` — create/list/get a roadmap, cross-user access is blocked, validation errors return field-level detail

This is a starting test suite, not full coverage — the natural next modules
to add tests for are `resource`, `note`, `goal`, and `certification` (they
follow the same ownership pattern already proven out for roadmaps).

## API documentation

Once running, open `http://localhost:8080/swagger-ui.html` for interactive
docs, or `http://localhost:8080/v3/api-docs` for the raw OpenAPI JSON. See
also [docs/API.md](docs/API.md) for a plain-text endpoint catalog and
example requests.

## Deploying to production

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for step-by-step instructions
for Railway, Render, and a generic "any VM with Docker" path, including
exactly which environment variables to set.

## Troubleshooting

- **`Flyway validation failed`** — your database already has tables that
  don't match the migrations (e.g. you ran the app once before adding a
  column by hand). Drop the schema and let Flyway rebuild it, or write a new
  migration that reconciles the difference; never edit an already-applied
  migration file.
- **`Connection refused` to MySQL** — if running via Docker Compose, give
  the `db` service a few seconds to become healthy before `api` starts; the
  `depends_on: condition: service_healthy` should handle this, but cold
  starts on slower machines can still race.
- **401 on every request except `/api/auth/*`** — check the `Authorization`
  header is `Bearer <token>` (with the space), and that `JWT_SECRET` is
  identical between the process that issued the token and the one
  validating it (easy to break by changing `.env` mid-session).
- **403 instead of 401** — by design: 401 means "you're not authenticated
  at all," 403 means "you're authenticated but don't own this resource" (or
  lack the role).

## Scaling notes

The current design assumes a single MySQL primary, which is the right
starting point. When you outgrow it: add a read replica and route GET-heavy
endpoints (roadmap/resource listing) to it; add a cache (Redis) in front of
`GET /api/roadmaps/{id}` since roadmap+topics are read far more than
written; and move refresh-token storage to Redis with TTL instead of MySQL
once token volume grows, since it's a high-write, short-lived table. The
service layer already isolates business logic from HTTP, so none of this
requires touching controllers.

## Roadmap (not yet built)

Deliberately out of scope for this pass, in rough priority order: email
delivery (verification, password reset, reminders), file uploads for
certificates/resources (S3-compatible storage), OAuth2 social login, the AI
modules (roadmap generation, skill-gap analysis), organization/multi-tenant
workspaces, and Kubernetes/Terraform deployment manifests. Each is a
substantial feature in its own right — happy to scope and build any of them
next.
