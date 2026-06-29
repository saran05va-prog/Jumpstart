# Contributing

## Branch & commit conventions

- Branch from `main`: `feature/<short-description>` or `fix/<short-description>`.
- Keep commits scoped to one logical change; write the "why" in the commit
  body if it isn't obvious from the diff.

## Before opening a PR

```bash
mvn clean verify   # compiles + runs the full test suite
```

If you touched the schema, add a new `V<n>__description.sql` migration
rather than editing an existing one (see `docs/DATABASE.md`).

## Adding a new feature module

Follow the existing pattern (e.g. mirror `goal/` or `certification/`, the
two smallest complete examples):

1. `Entity` extending `Auditable` if it needs `createdAt`/`updatedAt`.
2. `Repository` interface (add `JpaSpecificationExecutor` only if you need
   dynamic filtering).
3. `dto/<Name>Request.java` and `dto/<Name>Response.java` as records, with a
   static `from(entity)` factory on the response.
4. `Service` — owns transactions and ownership/permission checks. Controllers
   should never touch a repository directly.
5. `Controller` — thin, HTTP-only.
6. A Flyway migration for the new table.
7. At least one unit test (service-level ownership rule) and one
   integration test (full request/response via MockMvc).

## Code style

- Constructor injection via Lombok's `@RequiredArgsConstructor`, not field
  injection (`@Autowired` on fields).
- DTOs are Java records — immutable, no Lombok needed on them.
- Keep controllers free of `if`/`try` business logic; that belongs in the
  service layer where it can be unit tested without spinning up MockMvc.
