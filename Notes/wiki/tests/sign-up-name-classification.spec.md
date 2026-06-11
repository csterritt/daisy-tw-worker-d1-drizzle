# sign-up-name-classification.spec.ts

**Source:** `tests/sign-up-name-classification.spec.ts`

## Purpose

Unit tests for the duplicate-name vs duplicate-email classification in `src/lib/sign-up-utils.ts`. A unique violation on `user.name` must be reported as a display-name error, not as "account already exists".

## Test cases

- `UNIQUE constraint failed: user.name` → `isDuplicateNameError` = true
- `... user_name_unique` (named index) → `isDuplicateNameError` = true
- mixed case `USER.NAME` → `isDuplicateNameError` = true (case-insensitive)
- `UNIQUE constraint failed: user.email` → `isDuplicateNameError` = false
- unrelated error (`SQLITE_BUSY`) → `isDuplicateNameError` = false
- Ordering: a `user.name` violation matches both the name check and the broad email/unique heuristic, so callers must check the name case first; a `user.email` violation matches only the email heuristic.

## Dependencies

- `src/lib/sign-up-utils` (`isDuplicateNameError`, `isDuplicateEmailError`)

---

See [unit-tests.md](../unit-tests.md) for the full catalog.