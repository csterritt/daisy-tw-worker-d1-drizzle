# build-reset-password.tsx

**Source:** `src/routes/auth/build-reset-password.tsx`

## Purpose

Password reset form page (`/auth/reset-password`). Requires a valid `token` query parameter.

## Export

### `buildResetPassword(app): void`

Route: `GET /auth/reset-password?token=`

### Behavior

1. Reads `token` query param
2. If no token → renders invalid-token page
3. Otherwise renders the password reset form with the token as a hidden field

### Reset form fields

- Page with `data-testid='reset-password-page'`, form has `noValidate`
- **Token** — hidden input with `name='token'` and `value={token}`
- **New Password** — `data-testid='new-password-input'`, `minLength=8`, `autoFocus`
- **Confirm Password** — `data-testid='confirm-password-input'`, `minLength=8`
- **Submit** — `data-testid='reset-password-action'` (text: "Update Password")
- "Back to Sign In" link — `data-testid='back-to-sign-in-from-reset'`

### Invalid token page

- Page with `data-testid='invalid-token-page'`
- "Invalid Reset Link" alert
- "Request New Reset Link" button (`/auth/forgot-password`) — `data-testid='request-new-reset-action'`
- "Back to Sign In" link — `data-testid='back-to-sign-in-from-invalid'`

## Cross-references

- [handle-reset-password.md](handle-reset-password.md) — POST handler

---

See [source-code.md](../../../source-code.md) for the full catalog.
