# API Guide

Base URL (local): `http://localhost:8080`. Interactive docs: `/swagger-ui.html`.

Every response that can fail returns this shape:

```json
{
  "timestamp": "2026-06-21T10:15:00Z",
  "status": 400,
  "code": "VALIDATION_ERROR",
  "message": "One or more fields are invalid",
  "path": "/api/roadmaps",
  "fieldErrors": [{ "field": "title", "message": "must not be blank" }]
}
```

`fieldErrors` is only present for `VALIDATION_ERROR`. Other `code` values:
`RESOURCE_NOT_FOUND` (404), `DUPLICATE_RESOURCE` (409), `UNAUTHORIZED` (401),
`FORBIDDEN` (403), `INTERNAL_ERROR` (500).

## Auth

| Method | Path | Auth | Body |
|---|---|---|---|
| POST | `/api/auth/register` | none | `{ name, email, password, role? }` (`role` ∈ `STUDENT`,`MENTOR`, defaults to `STUDENT`) |
| POST | `/api/auth/login` | none | `{ email, password }` |
| POST | `/api/auth/refresh` | none | `{ refreshToken }` |
| POST | `/api/auth/logout` | none | `{ refreshToken }` |
| GET | `/api/auth/me` | Bearer | — |

`register`/`login`/`refresh` all return:

```json
{
  "accessToken": "eyJ...",
  "refreshToken": "9f2c...",
  "expiresInMs": 900000,
  "user": { "id": 1, "name": "Asha Raman", "email": "asha@example.com", "role": "STUDENT" }
}
```

Example:

```bash
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Asha Raman","email":"asha@example.com","password":"Password123!","role":"STUDENT"}'
```

## Roadmaps

| Method | Path | Notes |
|---|---|---|
| POST | `/api/roadmaps` | `{ title, description?, tag?, colorTheme? }` (`colorTheme` ∈ `MOSS`,`EMBER`,`GOLD`) |
| GET | `/api/roadmaps?tag=&archived=&page=&size=&sort=` | Paginated, owned-by-you only |
| GET | `/api/roadmaps/{id}` | 403 if you don't own it (404 if it doesn't exist at all) |
| PATCH | `/api/roadmaps/{id}` | Same body shape as create |
| PATCH | `/api/roadmaps/{id}/archive?value=true` | Toggle archive |
| POST | `/api/roadmaps/{id}/clone` | Deep-copies the roadmap and all its topics |
| DELETE | `/api/roadmaps/{id}` | Cascades to topics/notes/resources referencing it |

List responses are wrapped for pagination:

```json
{
  "items": [ { "id": 1, "title": "Backend Systems", "progressPercent": 50, "...": "..." } ],
  "page": 0,
  "size": 20,
  "totalItems": 1,
  "totalPages": 1,
  "hasNext": false
}
```

Sorting: `?sort=title,asc` or `?sort=createdAt,desc` (Spring Data syntax).

## Topics

Nested under a roadmap for creation/listing, flat for update/delete:

| Method | Path |
|---|---|
| GET | `/api/roadmaps/{roadmapId}/topics` |
| POST | `/api/roadmaps/{roadmapId}/topics` — `{ title, status, difficulty, estHours, sortOrder }` (`status` ∈ `DONE`,`CURRENT`,`UPCOMING`,`LOCKED`; `difficulty` 1–3) |
| PATCH | `/api/topics/{id}` |
| DELETE | `/api/topics/{id}` |

## Resources

| Method | Path |
|---|---|
| POST | `/api/resources` — `{ title, type, url?, tags?, rating, bookmarked, duration?, roadmapId?, topicId? }` (`type` ∈ `VIDEO`,`DOC`,`ARTICLE`,`PDF`,`REPO`,`BOOK`,`COURSE`) |
| GET | `/api/resources?type=&bookmarked=&q=&page=&size=` |
| PATCH | `/api/resources/{id}` |
| PATCH | `/api/resources/{id}/bookmark` — toggles bookmark, no body |
| DELETE | `/api/resources/{id}` |

## Notes

| Method | Path |
|---|---|
| POST | `/api/notes` — `{ title, content?, roadmapId? }` |
| GET | `/api/notes?q=&page=&size=` — `q` matches the title |
| PATCH | `/api/notes/{id}` |
| DELETE | `/api/notes/{id}` |

## Goals

| Method | Path |
|---|---|
| POST | `/api/goals` — `{ label, cadence, targetValue, progressValue, unit? }` (`cadence` ∈ `DAILY`,`WEEKLY`,`MONTHLY`,`LONGTERM`) |
| GET | `/api/goals?cadence=&page=&size=` |
| PATCH | `/api/goals/{id}` |
| DELETE | `/api/goals/{id}` |

## Certifications

| Method | Path |
|---|---|
| POST | `/api/certifications` — `{ title, issuer, issuedDate, expiresDate?, verificationUrl? }` (dates as `YYYY-MM-DD`) |
| GET | `/api/certifications?page=&size=` |
| PATCH | `/api/certifications/{id}` |
| DELETE | `/api/certifications/{id}` |

`status` in the response (`ACTIVE`/`EXPIRING`/`EXPIRED`) is computed from
`expiresDate` at read time, not stored — `EXPIRING` means within 90 days of
`expiresDate`.

## Search

| Method | Path |
|---|---|
| GET | `/api/search?q=` | Title-contains across your roadmaps, notes, and resources, up to 8 results per type |

## Health

| Method | Path | Auth |
|---|---|---|
| GET | `/api/health` | none — for load balancer / uptime checks |
