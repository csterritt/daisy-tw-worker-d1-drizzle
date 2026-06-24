# db-helpers.ts

**Source:** `e2e-tests/support/db-helpers.ts`

## Purpose

Database manipulation helpers for E2E tests. Calls the dev-only test endpoints at `/test/database/*` to clear, seed, and inspect the database.

## Exports

### `clearDatabase(request?): Promise<void>`

DELETE `/test/database/clear` — truncates all auth-related tables. Accepts optional Playwright request context; falls back to `fetch` with `SERVER_BASE_URL`.

### `clearSessions(request?): Promise<void>`

DELETE `/test/database/clear-sessions` — removes all session rows. Same request/fetch pattern.

### `setVerificationTimestamp(email, request?): Promise<void>`

POST `/test/database/set-verification-timestamp/{email}` — sets `lastVerificationEmailAt` to now, starting the rate-limit cooldown.

### `checkCodeExists(code, request?): Promise<boolean>`

GET `/test/database/code-exists/{code}` — checks if a single-use code exists in the database.

### `clearRateLimitCache(request?): Promise<void>`

DELETE `/test/database/clear-rate-limit-cache` — clears the in-memory password-reset rate-limit cache on the server.

### `seedDatabase(request?): Promise<void>`

POST `/test/database/seed` — seeds the database with test users, accounts, and single-use codes. Logs how many were created.

---

See [e2e-tests.md](../../e2e-tests.md) for the full catalog.
