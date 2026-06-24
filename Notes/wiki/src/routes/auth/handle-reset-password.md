# handle-reset-password.ts

**Source:** `src/routes/auth/handle-reset-password.ts`

## Purpose

POST handler for password reset completion (`POST /auth/reset-password`). Validates the reset token and new password.

## Export

### `handleResetPassword(app): void`

### Flow

1. Parses request body
2. Validates with `ResetPasswordFormSchema` (token, password, confirmPassword)
3. If invalid → truncates error at first comma, redirects to `/auth/reset-password?token=...` (if token present) or `/auth/forgot-password` with error
4. Calls `auth.api.resetPassword({ body: { newPassword: password, token } })`
5. On success → redirects to `/auth/sign-in` with `'Your password has been successfully reset. You can now sign in with your new password.'`
6. On token error (invalid/expired) → redirects to `/auth/forgot-password` with `'The reset link is invalid or has expired. Please request a new password reset link.'`
7. On other error → redirects to `/auth/reset-password?token=...` with `'An error occurred while resetting your password. Please try again.'`
8. On handler error → redirects to `/auth/forgot-password` with `'An error occurred. Please try again.'`

## Cross-references

- [build-reset-password.md](build-reset-password.md) — GET page
- [lib/validators.md](../../lib/validators.md) — `ResetPasswordFormSchema`

---

See [source-code.md](../../../source-code.md) for the full catalog.
