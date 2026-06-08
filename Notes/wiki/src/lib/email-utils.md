# email-utils.ts

**Source:** `src/lib/email-utils.ts`

## Purpose

Provides a single canonical way to normalize email addresses before app-level
database lookups. Better Auth stores emails normalized (trimmed + lowercased)
internally, so handlers that query by email must normalize the same way or
mixed-case / padded input will silently fail to match an existing user.

## Exports

### `normalizeEmail(email): string`

Returns `email.trim().toLowerCase()`.

## Used by

- [sign-up-utils.md](sign-up-utils.md) — `processGatedSignUp`
- [routes/auth/handle-sign-up.md](../routes/auth/handle-sign-up.md)
- [routes/auth/handle-forgot-password.md](../routes/auth/handle-forgot-password.md)
- [routes/auth/handle-resend-email.md](../routes/auth/handle-resend-email.md)

---

See [source-code.md](../../source-code.md) for the full catalog.
