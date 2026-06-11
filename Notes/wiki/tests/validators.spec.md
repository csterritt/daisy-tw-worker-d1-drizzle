# validators.spec.ts

**Source:** `tests/validators.spec.ts`

## Purpose

Unit tests for password max length validation across all form schemas in `src/lib/validators.ts`. Ensures the 128-character maximum is enforced consistently.

## Test cases

### `SignUpFormSchema`
- Rejects password longer than 128 characters → error contains `'Password must be at most 128 characters long'`
- Accepts password of exactly 128 characters
- Accepts valid password (16 chars)

### `GatedSignUpFormSchema`
- Rejects password longer than 128 characters
- Accepts password of exactly 128 characters

### `ResetPasswordFormSchema`
- Rejects password longer than 128 characters
- Accepts password of exactly 128 characters
- Accepts valid password

### `ChangePasswordFormSchema`
- Rejects new password longer than 128 characters
- Accepts new password of exactly 128 characters
- Accepts valid new password

## Dependencies

- `src/lib/validators`

---

See [unit-tests.md](../unit-tests.md) for the full catalog.
