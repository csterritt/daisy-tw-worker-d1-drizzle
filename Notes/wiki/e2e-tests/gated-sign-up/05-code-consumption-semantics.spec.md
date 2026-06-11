# 05-code-consumption-semantics.spec.ts

**Source:** `e2e-tests/gated-sign-up/05-code-consumption-semantics.spec.ts`

## Purpose

Ensures single-use codes are consumed/invalidated after successful sign-up and that codes are NOT consumed when sign-up fails at validation or due to duplicate email.

## Test cases

- `code is consumed only after successful sign-up` — verifies code exists before sign-up, completes successful sign-up, then verifies code is consumed (deleted from database)
- `code is NOT consumed when sign-up fails due to invalid email format` — attempts sign-up with invalid email, verifies validation error, then verifies code still exists
- `code is NOT consumed when sign-up fails due to duplicate email` — attempts sign-up with existing email (seeded user), verifies redirect to await-verification page (security: don't reveal email exists), then verifies code is released (not consumed) to prevent attackers from exhausting invite codes
- `user can retry with same code after validation failure` — first attempt fails with short password, verifies code still exists; second attempt succeeds with valid password, verifies code is now consumed

## Cross-references

- [test-helpers.md](../../support/test-helpers.md) — `testWithDatabase`
- [mode-helpers.md](../../support/mode-helpers.md) — `skipIfNotMode`
- [db-helpers.md](../../support/db-helpers.md) — `checkCodeExists`
- [navigation-helpers.md](../../support/navigation-helpers.md) — `navigateToGatedSignUp`
- [form-helpers.md](../../support/form-helpers.md) — `submitGatedSignUpForm`
- [page-verifiers.md](../../support/page-verifiers.md) — `verifyOnGatedSignUpPage`, `verifyOnAwaitVerificationPage`
- [finders.md](../../support/finders.md) — `verifyAlert`

---

See [e2e-tests.md](../../e2e-tests.md) for the full catalog.