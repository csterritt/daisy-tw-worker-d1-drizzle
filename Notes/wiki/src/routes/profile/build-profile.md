# build-profile.tsx

**Source:** `src/routes/profile/build-profile.tsx`

## Purpose

User profile page (`/profile`). Requires authentication via `signedInAccess` middleware. Displays account information and provides forms to change password or delete account.

## Export

### `buildProfile(app): void`

Route: `GET /profile`

Middleware chain:

1. `secureHeaders(STANDARD_SECURE_HEADERS)`
2. `signedInAccess`

### Page content

- Page with `data-testid='profile-page'`
- "Back" button to `/private` — `data-testid='go-back-action'`
- User info section showing name (`data-testid='profile-name'`) and email (`data-testid='profile-email'`)
- **Change Password** form (`POST /profile`, `noValidate`):
  - Current password — `data-testid='current-password-input'`
  - New password — `data-testid='new-password-input'`, `minLength=8`
  - Confirm new password — `data-testid='confirm-password-input'`, `minLength=8`
  - Humorous question of the day — `data-testid='humorous-question'`
  - Submit — `data-testid='change-password-action'`
- **Delete Account** section with link to `/profile/delete-confirm` — `data-testid='delete-account-action'`

## Cross-references

- [handle-change-password.md](handle-change-password.md) — POST handler
- [build-delete-confirm.md](build-delete-confirm.md) — deletion confirmation page

---

See [source-code.md](../../../source-code.md) for the full catalog.
