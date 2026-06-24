# handle-set-db-failures.ts

**Source:** `src/routes/handle-set-db-failures.ts`

## Purpose

Dev-only test route to simulate database failures for resilience testing. Uses cookies to count how many times a specific DB operation should fail before succeeding.

## Export

### `handleSetDbFailures(app): void`

Route: `GET /auth/set-db-failures/:name/:times`

- `:name` — must be one of `DB_FAIL_COUNT` or `DB_FAIL_INCR` (validated against an allow-list)
- `:times` — numeric value to set the cookie to

Sets a cookie with the given `:name` to the value `:times` using `addCookie`.

Redirects to `PATHS.ROOT` (with error message if params are invalid).

Used by E2E tests to verify retry logic in `db-access.ts`.

## Cross-references

- [lib/db-access.md](../lib/db-access.md) — reads these cookies to simulate failures
- [lib/test-routes.md](../lib/test-routes.md) — enabled only in test/dev mode

---

See [source-code.md](../../source-code.md) for the full catalog.
