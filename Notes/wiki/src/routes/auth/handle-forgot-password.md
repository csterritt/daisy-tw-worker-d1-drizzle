# handle-forgot-password.ts

**Source:** `src/routes/auth/handle-forgot-password.ts`

## Purpose

POST handler for forgot password (`POST /auth/forgot-password`). Initiates the password reset flow via Better Auth. Includes both in-memory and database-backed rate limiting.

## Export

### `handleForgotPassword(app): void`

### Flow

1. Parses request body
2. Validates email with `ForgotPasswordFormSchema`
3. If invalid → redirects to `/auth/forgot-password` with error
4. Checks in-memory rate limit cache (`emailRateLimitCache`)
5. If rate limited → redirects with remaining time message
6. Looks up user in database via `getUserWithAccountByEmail`
7. If user not found → still redirects to waiting page (security: don't reveal existence)
8. If user found → checks database rate limit via `account.lastResetEmailAt`
9. If rate limited → redirects with remaining time message
10. Calls `auth.api.requestPasswordReset({ body: { email, redirectTo } })`
11. On success → updates `account.lastResetEmailAt` timestamp
12. Redirects to `/auth/waiting-for-reset` with `MESSAGES.RESET_PASSWORD_MESSAGE`

### Internal helpers

- `emailRateLimitCache` — in-memory `Map<string, number>` for rate limiting
- `checkAndUpdateInMemoryRateLimit(email)` — checks/updates in-memory cache
- `checkRateLimit(accountUpdatedAt)` — checks database timestamp
- `sendPasswordResetEmail(env, email, origin)` — calls Better Auth API
- `updateEmailTimestamp(db, userId)` — updates `account.lastResetEmailAt`
- `redirectToWaitingPage(c, email)` — sets cookie and redirects
- `processPasswordReset(c, db, userData, email)` — orchestrates the flow for known users

## Cross-references

- [build-forgot-password.md](build-forgot-password.md) — GET page
- [build-waiting-for-reset.md](build-waiting-for-reset.md) — waiting page
- [lib/db-access.md](../../lib/db-access.md) — `getUserWithAccountByEmail`, `updateResetEmailTimestamp`

---

See [source-code.md](../../../source-code.md) for the full catalog.