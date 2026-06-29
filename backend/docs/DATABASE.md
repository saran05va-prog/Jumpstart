# Database

MySQL 8 (Aiven-MySQL compatible — no engine-specific extensions used beyond
standard `InnoDB` tables). Schema is owned by Flyway migrations in
`src/main/resources/db/migration`; Hibernate is set to `ddl-auto: validate`
and will refuse to start if the entities and live schema disagree.

## Entity-relationship overview

```
users (1) ───< (many) roadmaps
users (1) ───< (many) resources
users (1) ───< (many) notes
users (1) ───< (many) goals
users (1) ───< (many) certifications
users (1) ───< (many) refresh_tokens

roadmaps (1) ───< (many) topics
roadmaps (1) ───< (0..many) resources   (optional association)
roadmaps (1) ───< (0..many) notes        (optional association)
topics   (1) ───< (0..many) resources   (optional association)

resources (many) ──< (many) resource_tags   [element collection, not a real M:N — one row per tag]
```

## Tables

| Table | Purpose | Notable columns |
|---|---|---|
| `users` | Account + role | `email` unique, `role` (`STUDENT`/`MENTOR`/`ORGANIZATION`/`ADMIN`), `password_hash` (BCrypt) |
| `refresh_tokens` | Hashed, revocable refresh tokens | `token_hash` unique, `expires_at`, `revoked` — raw token is never stored |
| `roadmaps` | A learning path | `owner_id` FK, `tag`, `color_theme`, `archived` |
| `topics` | Ordered steps inside a roadmap | `roadmap_id` FK, `status`, `difficulty` (1–3), `est_hours`, `sort_order` |
| `resources` | Saved learning material | `owner_id` FK, optional `roadmap_id`/`topic_id` FK, `type`, `rating`, `bookmarked` |
| `resource_tags` | Free-text tags per resource | `resource_id` FK, `tag` |
| `notes` | Markdown notes | `owner_id` FK, optional `roadmap_id` FK, `content` (`LONGTEXT`), `word_count` |
| `goals` | Daily/weekly/monthly/long-term targets | `owner_id` FK, `cadence`, `target_value`, `progress_value` |
| `certifications` | Certificates + expiry | `owner_id` FK, `issued_date`, `expires_date` (status is computed, not stored) |

## Indexes

Beyond primary keys and the unique constraints on `users.email` and
`refresh_tokens.token_hash`, every foreign key column that's filtered on
(`owner_id` on five tables, `roadmap_id` on `topics`, `tag` and `type` for
the two list-with-filters endpoints) has a dedicated index — see
`V1__init.sql` for exact `CREATE INDEX` statements.

## Migrations

- `V1__init.sql` — full initial schema.
- `V2__seed.sql` — optional demo user + sample roadmap/topics/resources/note/goal/certification. Safe to delete before a real deploy.

To add a change: create `V3__description.sql` with plain SQL (add column,
new table, backfill, etc.), commit it, and deploy — Flyway tracks applied
migrations in its own `flyway_schema_history` table and only runs new ones.
**Never edit an already-applied migration file**; add a new one instead,
even to fix a typo, once it has run anywhere outside your own machine.

## Cascade behavior

- Deleting a `user` cascades to all of their roadmaps, resources, notes,
  goals, certifications, and refresh tokens (`ON DELETE CASCADE`) — account
  deletion is a single SQL operation away from being complete, which matters
  for data-retention/right-to-erasure requests.
- Deleting a `roadmap` cascades to its `topics` (a topic can't exist without
  its roadmap) but only *nulls out* `roadmap_id` on `resources`/`notes`
  (`ON DELETE SET NULL`) — a resource or note you wrote stays yours even if
  you later delete the roadmap it was originally attached to.
