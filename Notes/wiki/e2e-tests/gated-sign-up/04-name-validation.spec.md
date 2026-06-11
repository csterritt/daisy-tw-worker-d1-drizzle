# 04-name-validation.spec.ts

**Source:** `e2e-tests/gated-sign-up/04-name-validation.spec.ts`

## Purpose

Validates name field restrictions on the gated sign-up form. Ensures only allowed characters (letters, numbers, hyphens, underscores, spaces) are accepted.

## Test cases

- `rejects names with special characters` — `<script>alert("xss")</script>` is rejected with `INVALID_NAME_CHARACTERS` error
- `rejects name with @ symbol` — `User@Name` is rejected with `INVALID_NAME_CHARACTERS` error
- `rejects name with punctuation marks` — `User!Name` is rejected with `INVALID_NAME_CHARACTERS` error
- `accepts valid name with letters and spaces` — `John Doe` is accepted (redirects away from sign-up page)
- `accepts valid name with hyphens and underscores` — `Test-User_123` is accepted (redirects away from sign-up page)

## Cross-references

- [finders.md](../../support/finders.md) — `verifyAlert`
- [page-verifiers.md](../../support/page-verifiers.md) — `verifyOnGatedSignUpPage`
- [test-helpers.md](../../support/test-helpers.md) — `testWithDatabase`
- [mode-helpers.md](../../support/mode-helpers.md) — `skipIfNotMode`
- [navigation-helpers.md](../../support/navigation-helpers.md) — `navigateToGatedSignUp`
- [form-helpers.md](../../support/form-helpers.md) — `submitGatedSignUpForm`
- [test-data.md](../../support/test-data.md) — `GATED_CODES`, `ERROR_MESSAGES`

---

See [e2e-tests.md](../../e2e-tests.md) for the full catalog.