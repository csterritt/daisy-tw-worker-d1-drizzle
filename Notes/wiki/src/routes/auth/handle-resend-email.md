# handle-resend-email.ts

**Source:** `src/routes/auth/handle-resend-email.ts`

## Purpose

POST handler to resend verification email (`POST /auth/resend-email`). Active in all sign-up modes that use email verification. Includes rate limiting.

## Export

### `handleResendEmail(app): void`

### Flow

1. Parses request body for `email`
2. Validates with `ResendEmailFormSchema`
3. If invalid → redirects to `/auth/await-verification` with error
4. Looks up user via `getUserWithAccountByEmail` — if not found or DB error, redirects to await-verification with success message (security: don't reveal existence)
5. If user is already verified → redirects to `/auth/sign-in` with `'Your email is already verified. You can sign in now.'`
6. Checks rate limit using `lastVerificationEmailAt` from the account record vs `DURATIONS.EMAIL_RESEND_TIME_IN_MILLISECONDS`
7. If rate limited → redirects to await-verification with remaining time message
8. Otherwise → calls `auth.api.sendVerificationEmail` and updates `lastVerificationEmailAt` timestamp
9. Redirects to `/auth/await-verification` with `MESSAGES.NEW_VERIFICATION_EMAIL`

## Cross-references

- [constants.md](../../constants.md) — `DURATIONS.EMAIL_RESEND_TIME_IN_MILLISECONDS`

---

See [source-code.md](../../../source-code.md) for the full catalog.
