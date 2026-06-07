# email-utils.spec.ts

**Source:** `tests/email-utils.spec.ts`

## Purpose

Unit tests for `src/lib/email-utils.ts` `normalizeEmail`, ensuring app-level
email normalization matches Better Auth's internal normalization.

## Test cases

- `User@Example.COM` → `user@example.com` (lowercase)
- `'  user@example.com  '` → `user@example.com` (trim)
- `'\t Foo.Bar@Example.Com \n'` → `foo.bar@example.com` (trim + lowercase)
- `user@example.com` → unchanged (already normalized)

## Dependencies

- `src/lib/email-utils`

---

See [unit-tests.md](../unit-tests.md) for the full catalog.
