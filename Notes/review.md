# Code Review Findings

Reviewed the application code plus the `tests` and `e2e-tests` directories. Per request, this review ignores `PRODUCTION:` comments and code explicitly tied to those markers.

## High Priority

- **Invite codes can be burned by attempting gated sign-up with an existing email**
  - **Location:** `src/lib/sign-up-utils.ts:286-356`, especially `src/lib/sign-up-utils.ts:341-345`; codified by `e2e-tests/gated-sign-up/05-code-consumption-semantics.spec.ts:71-97`
  - **Problem:** `processGatedSignUp` claims a single-use code before account creation. If Better Auth returns the synthetic duplicate-account response and `userAlreadyExists` is true, the handler redirects without calling `releaseClaimedCode()`. This lets anyone who knows or guesses an existing account email consume valid invite codes without creating an account.
  - **Impact:** Availability/security issue for invite-only flows. An attacker can exhaust invitation codes and deny legitimate users access.
  - **Recommendation:** Pre-check for an existing user before claiming the invite code, or release the claimed code for duplicate-account outcomes. Update the e2e test that currently expects duplicate-email failures to consume the code.

- **Password reset token is reflected into redirect URLs without URL encoding**
  - **Location:** `src/routes/auth/handle-reset-password.ts:33-38` and `src/routes/auth/handle-reset-password.ts:76-79`
  - **Problem:** The handler interpolates attacker-controlled `token` directly into `?token=${token}`. A token containing `&`, `#`, `%0d%0a`, or other reserved characters can alter the resulting query string, break the reset form state, or potentially produce unsafe redirect headers depending on framework/runtime behavior.
  - **Impact:** Correctness and security hardening issue around a sensitive credential-recovery flow.
  - **Recommendation:** Build redirect targets with `URLSearchParams` or `encodeURIComponent(token)`, and add a max length/pattern validation for reset tokens in `ResetPasswordFormSchema`.

## Medium Priority

- **Password reset rate limiting does not apply to non-existent emails and creates a timing side channel**
  - **Location:** `src/routes/auth/handle-forgot-password.ts:183-197`; test expectation in `e2e-tests/reset-password/06-password-reset-rate-limiting.spec.ts:75-104`
  - **Problem:** Known users hit database account lookup, email sending, and timestamp updates; unknown users immediately redirect with no cooldown. The e2e test explicitly documents this behavior. Even though the visible page is the same, response timing and unlimited repeated requests for unknown emails can distinguish existing from non-existing accounts.
  - **Impact:** User enumeration risk via timing and inconsistent abuse controls.
  - **Recommendation:** Apply a uniform throttle independent of account existence, such as an IP/email-keyed rate-limit table or cache. Keep response timing and status behavior as uniform as practical for known and unknown emails.

- **Unit tests duplicate implementation logic instead of testing production code**
  - **Location:** `tests/db-access-retry.spec.ts:24-45` and `tests/sign-up-utils.spec.ts:12-31`
  - **Problem:** These tests reimplement `withRetry`, duplicate error pattern arrays, and simulate user-facing sign-up error mapping rather than importing the actual functions. A production bug or later behavior change could leave the tests green because they validate a copy, not the implementation.
  - **Impact:** False confidence and weak regression coverage for critical retry/error-sanitization code.
  - **Recommendation:** Export testable helpers where appropriate or test through public functions with mocked dependencies. At minimum, import `isDuplicateEmailError`, `isDuplicateNameError`, `isConstraintError`, and any retry wrapper behavior from production modules instead of duplicating them in tests.

- **E2E test isolation helpers hard-code localhost and bypass Playwright fixtures**
  - **Location:** `e2e-tests/support/db-helpers.ts:5-159` and `playwright.config.ts:7-9`
  - **Problem:** DB helper functions call `fetch('http://localhost:3000/...')` directly instead of using Playwright's `request` fixture or a configured `baseURL`. `testWithDatabase` accepts `{ page, request }`, but setup/cleanup ignores `request` and hard-codes the server URL.
  - **Impact:** Tests are less portable, harder to run on non-default ports, and can accidentally target the wrong local service. This also makes CI configuration brittle; there is no Playwright `webServer` or npm script for e2e execution in `package.json`.
  - **Recommendation:** Define `baseURL` and `webServer` in `playwright.config.ts`, add an e2e npm script, and pass/use the Playwright `request` fixture in database helpers instead of global `fetch` with a fixed URL.

- **Password reset and change-password validation are inconsistent with account creation password limits**
  - **Location:** `src/lib/validators.ts:136-146` and `src/lib/validators.ts:157-167` versus `src/lib/validators.ts:92-96`
  - **Problem:** Sign-up enforces both minimum and maximum password length, while reset-password and change-password only enforce minimum length. Better Auth may enforce its own max elsewhere, but the app-level validation is inconsistent and can pass oversized payloads deeper into the auth layer.
  - **Impact:** Inconsistent UX and unnecessary resource usage on sensitive endpoints.
  - **Recommendation:** Apply the same `maxLength(128, ...)` constraint to reset and change-password schemas, and add tests covering too-long new passwords.

- **Sensitive user identifiers are logged in account-management flows**
  - **Location:** `src/routes/profile/handle-delete-account.ts:39` and `src/routes/profile/handle-delete-account.ts:57`; similar pattern in `src/routes/profile/handle-change-password.ts:73`
  - **Problem:** Successful account deletion and password changes log full user email addresses. Error logs also often include raw caught errors from auth/database layers.
  - **Impact:** Logs may retain personal data and sensitive operational details longer than necessary.
  - **Recommendation:** Prefer structured logs with request IDs and internal user IDs, redact or hash emails, and avoid logging raw third-party/auth errors unless they are sanitized or reserved for restricted debug sinks.

## Low Priority

- **Test coverage does not include several security and edge-case regressions**
  - **Location:** `tests/`, `e2e-tests/`
  - **Problem:** There is good happy-path and broad e2e coverage, but notable gaps remain: malformed reset token encoding, oversized reset/change passwords, duplicate-email gated sign-up not consuming codes, cookie value bounds, and timing/abuse behavior for unknown password-reset emails.
  - **Recommendation:** Add focused unit tests for validation and URL construction, plus e2e coverage for corrected invite-code semantics.

- **Documentation and scripts do not make the full test strategy obvious**
  - **Location:** `package.json:4-16`, `playwright.config.ts:7-9`
  - **Problem:** `package.json` only exposes `test:unit`; e2e tests exist but are not represented by a script or self-contained Playwright server config.
  - **Recommendation:** Add scripts such as `test:e2e` and `test`, and document required environment/setup for running e2e tests reliably.

## Positive Notes

- **Validation is centralized:** Form validation uses Valibot schemas, and email normalization is consistently applied in key handlers.
- **Database writes use parameterized Drizzle APIs:** I did not see string-concatenated SQL in the reviewed paths.
- **Invite-code claiming is atomic:** The `UPDATE ... WHERE email IS NULL` approach is a sound basis for race-safe code claiming, but the duplicate-email release semantics need correction.
- **E2E breadth is strong:** The suite covers many auth modes and profile/reset flows; the main issue is portability and a few security edge cases.
