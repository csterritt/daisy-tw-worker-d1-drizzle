# 03-page-navigation-buttons.spec.ts

**Source:** `e2e-tests/gated-sign-up/03-page-navigation-buttons.spec.ts`

## Purpose

Navigation element tests on the gated sign-up page.

## Test cases

- `sign-in page shows Create Account button` — verifies the sign-in page has a "Create Account" button that navigates to gated sign-up
- `can navigate between sign-in and gated sign-up pages` — navigates between sign-in and gated sign-up pages using the navigation buttons
- `gated sign-up page has correct form elements` — verifies form elements on gated sign-up page (name, email, password, code inputs, submit button, sign-in link, and h2 title containing "Create Account")

## Cross-references

- [finders.md](../../support/finders.md) — `clickLink`, `isElementVisible`
- [page-verifiers.md](../../support/page-verifiers.md) — `verifyOnSignInPage`, `verifyOnGatedSignUpPage`
- [mode-helpers.md](../../support/mode-helpers.md) — `skipIfNotMode`
- [navigation-helpers.md](../../support/navigation-helpers.md) — `navigateToSignIn`, `navigateToGatedSignUp`

---

See [e2e-tests.md](../../e2e-tests.md) for the full catalog.