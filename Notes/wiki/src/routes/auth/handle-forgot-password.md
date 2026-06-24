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
10. Calls `sendPasswordResetEmail(env, email, origin)` which calls `auth.api.requestPasswordReset`
11. If email send fails with email-related error → redirects to `/auth/forgot-password` with `'Unable to send password reset email. Please try again later.'`
12. On success → updates `account.lastResetEmailAt` timestamp
13. Redirects to `/auth/waiting-for-reset` with `MESSAGES.RESET_PASSWORD_MESSAGE`

### Internal helpers

- `emailRateLimitCache` — exported in-memory `Map<string, number>` for rate limiting (exported for test-only cache clearing)
- `checkAndUpdateInMemoryRateLimit(email)` — checks/updates in-memory cache
- `checkRateLimit(lastResetEmailAt)` — checks database timestamp (`account.lastResetEmailAt`)
- `sendPasswordResetEmail(env, email, origin)` — calls `auth.api.requestPasswordReset`, returns `{ success, isEmailError? }`
- `updateEmailTimestamp(db, userId)` — updates `account.lastResetEmailAt` via `updateResetEmailTimestamp`
- `redirectToWaitingPage(c, email)` — sets `EMAIL_ENTERED` cookie and redirects to waiting-for-reset
- `processPasswordReset(c, db, userData, email)` — orchestrates the flow for known users: checks DB rate limit, sends reset email, handles email errors, updates timestamp

## Cross-references

- [build-forgot-password.md](build-forgot-password.md) — GET page
- [build-waiting-for-reset.md](build-waiting-for-reset.md) — waiting page
- [lib/db-access.md](../../lib/db-access.md) — `getUserWithAccountByEmail`, `updateResetEmailTimestamp`

---

See [source-code.md](../../../source-code.md) for the full catalog.