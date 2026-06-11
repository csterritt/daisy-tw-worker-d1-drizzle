# database.ts

**Source:** `src/routes/test/database.ts`

## Purpose

Dev-only test endpoints for database operations used by E2E tests. Mounted at `/test/database`.

## Exports

### `testDatabaseRouter`

Hono sub-router with routes:

| Method | Path                              | Purpose                                                                                     |
| ------ | --------------------------------- | ------------------------------------------------------------------------------------------- |
| `DELETE` | `/clear`                          | Truncates all tables (user, session, account, singleUseCode, interestedEmail)               |
| `DELETE` | `/clear-sessions`                 | Deletes all sessions only                                                                   |
| `POST`   | `/seed`                           | Seeds test users, accounts, and single-use codes                                            |
| `GET`    | `/status`                         | Returns record counts for all tables                                                        |
| `POST`   | `/set-verification-timestamp/:email` | Sets `lastVerificationEmailAt` to now for a user by email (for rate-limit tests)           |
| `GET`    | `/code-exists/:code`              | Checks if a single-use code exists and is unclaimed                                         |
| `DELETE` | `/clear-rate-limit-cache`         | Clears the in-memory password-reset rate-limit cache                                        |

## Cross-references

- [e2e-tests/support/db-helpers.md](../../../e2e-tests/support/db-helpers.md) — helpers that call these endpoints

---

See [source-code.md](../../../source-code.md) for the full catalog.