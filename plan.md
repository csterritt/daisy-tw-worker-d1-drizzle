# Fix: Password reset token reflected into redirect URLs without URL encoding

## Problem

In `handle-reset-password.ts`, the `token` value (from user-controlled form input or query string) is interpolated directly into redirect URLs at two locations:
- Line 36: `${PATHS.AUTH.RESET_PASSWORD}?token=${tokenEntered}` (validation failure branch)
- Line 78: `${PATHS.AUTH.RESET_PASSWORD}?token=${token}` (general error branch)

A token containing `&`, `#`, `%0d%0a`, or other reserved characters can alter the resulting query string, break the reset form state, or produce unsafe redirect headers.

Additionally, the `token` field in `ResetPasswordFormSchema` has no `maxLength` or pattern constraint.

## Assumptions

- No database schema changes are needed; the fix is purely in application logic.
- Better Auth tokens use only URL-safe characters in practice, but we should not rely on that.

## Plan

1. **Write failing e2e test (Red)** — Add a test to `e2e-tests/reset-password/` that submits a token containing `&injected=true` and verifies the redirect URL has the token correctly encoded (i.e., `%26injected%3Dtrue`) rather than a broken query string.
2. **Add token validation (Green)** — Add `maxLength(512, ...)` to the `token` field in `ResetPasswordFormSchema` in `src/lib/validators.ts`.
3. **Fix URL encoding (Green)** — Replace bare `${token}` / `${tokenEntered}` interpolation in `handle-reset-password.ts` with `encodeURIComponent(token)` / `encodeURIComponent(tokenEntered)` at lines 36 and 78.
4. **Verify** — Run all tests to confirm fix is correct and no regressions.

## Pitfalls

- The validation-failure branch (line 36) uses `rawBody.token` (pre-validation), so `tokenEntered` must also be encoded.
- The `encodeURIComponent` call on the already-validated `token` (line 78) is also required since validation only checks length, not reserved-character content.
