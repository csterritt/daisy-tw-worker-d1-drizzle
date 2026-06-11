# 08-password-reset-token-url-encoding.spec.ts

**Source:** `e2e-tests/reset-password/08-password-reset-token-url-encoding.spec.ts`

## Purpose

Verifies that password reset tokens containing reserved URL characters (like `&`, `#`, `=`) are properly URL-encoded in redirects, preventing parameter injection and URL parsing issues.

## Test cases

- `token with reserved characters is URL-encoded in redirect on validation failure` — token `valid-token&injected=true` is URL-encoded in redirect; verifies the token parameter is preserved correctly and `injected` is NOT introduced as a separate query parameter
- `token with reserved characters is URL-encoded in redirect on general error` — token `invalid-token#fragment&extra=1` is URL-encoded; verifies redirect lands on a valid page without broken URL

## Cross-references

- [finders.md](../../support/finders.md) — `fillInput`, `clickLink`, `verifyAlert`
- [page-verifiers.md](../../support/page-verifiers.md) — `verifyOnResetPasswordPage`

---

See [e2e-tests.md](../../e2e-tests.md) for the full catalog.
