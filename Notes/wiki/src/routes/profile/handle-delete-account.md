# handle-delete-account.ts

**Source:** `src/routes/profile/handle-delete-account.ts`

## Purpose

POST handler for account deletion (`POST /profile/delete`). Permanently deletes the user and all associated data.

## Export

### `handleDeleteAccount(app): void`

### Flow

Middleware chain: `secureHeaders(STANDARD_SECURE_HEADERS)`, `signedInAccess`

1. Gets current user from context (`c.get('user')`)
2. If no user → redirects to `/auth/sign-in` with `'Please sign in to delete your account.'`
3. Calls `deleteUserAccount(db, user.id)` to delete from DB (cascade deletes sessions and accounts)
4. If DB error → redirects to `/profile` with `'An error occurred while deleting your account. Please try again.'`
5. If user not found in DB → redirects to `/profile` with `'Unable to delete account. Please try again.'`
6. Manually removes `better-auth.session_token` and `better-auth.session_data` cookies
7. Redirects to `/auth/sign-in` with `'Your account has been successfully deleted.'`
8. On handler error → redirects to `/profile` with `'An error occurred. Please try again.'`

## Cross-references

- [build-delete-confirm.md](build-delete-confirm.md) — confirmation page
- [lib/db-access.md](../../lib/db-access.md) — `deleteUserAccount`

---

See [source-code.md](../../../source-code.md) for the full catalog.
