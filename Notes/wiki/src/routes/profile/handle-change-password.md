# handle-change-password.ts

**Source:** `src/routes/profile/handle-change-password.ts`

## Purpose

POST handler for changing password (`POST /profile`). Requires authentication.

## Export

### `handleChangePassword(app): void`

### Flow

Middleware chain: `secureHeaders(STANDARD_SECURE_HEADERS)`, `signedInAccess`

1. Gets current user from context
2. Parses request body
3. Validates with `ChangePasswordFormSchema` (currentPassword, newPassword, confirmPassword)
4. If invalid → truncates error at first comma, redirects to `/profile` with error
5. Calls `auth.api.changePassword({ body: { currentPassword, newPassword, revokeOtherSessions: true }, headers: c.req.raw.headers })`
6. On success → redirects to `/profile` with `'Your password has been successfully changed.'`
7. On password error (incorrect/invalid) → redirects to `/profile` with `'Current password is incorrect. Please try again.'`
8. On other error → redirects to `/profile` with `'An error occurred while changing your password. Please try again.'`
9. On handler error → redirects to `/profile` with `'An error occurred. Please try again.'`

## Cross-references

- [build-profile.md](build-profile.md) — GET page
- [lib/validators.md](../../lib/validators.md) — `ChangePasswordFormSchema`

---

See [source-code.md](../../../source-code.md) for the full catalog.
