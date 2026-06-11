# 04-page-navigation-buttons.spec.ts

**Source:** `e2e-tests/interest-sign-up/04-page-navigation-buttons.spec.ts`

## Purpose

Navigation button tests on the interest sign-up page. These tests are specific to INTEREST_SIGN_UP mode UI and should NOT run in BOTH_SIGN_UP mode which has different UI.

## Test cases

- `sign-in page shows Join Waitlist button` — verifies the sign-in page has a "Join Waitlist" button that navigates to interest sign-up
- `can navigate between sign-in and interest sign-up pages` — navigates between sign-in and interest sign-up pages using the navigation buttons
- `interest sign-up page has correct form elements` — verifies form elements on interest sign-up page (email input, submit button, sign-in link, banner, and h2 title containing "Join the Waitlist")

## Cross-references

- [finders.md](../../support/finders.md) — `clickLink`, `isElementVisible`
- [page-verifiers.md](../../support/page-verifiers.md) — `verifyOnSignInPage`, `verifyOnInterestSignUpPage`
- [mode-helpers.md](../../support/mode-helpers.md) — `skipIfNotExactMode`
- [navigation-helpers.md](../../support/navigation-helpers.md) — `navigateToSignIn`, `navigateToInterestSignUp`

---

See [e2e-tests.md](../../e2e-tests.md) for the full catalog.