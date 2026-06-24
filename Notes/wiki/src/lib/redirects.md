# redirects.tsx

**Source:** `src/lib/redirects.tsx`

## Purpose

Helper functions that create 303 redirect responses with flash-message cookies.

## Exports

### `redirectWithMessage(c, redirectUrl, message): Response`

If `message.trim() !== ''`, manually constructs a `Set-Cookie` header for `COOKIES.MESSAGE_FOUND` (URL-encoded) with `STANDARD_COOKIE_OPTIONS` and appends it to the response, then returns `c.redirect(redirectUrl, HTML_STATUS.SEE_OTHER)`.

### `redirectWithError(c, redirectUrl, errorMessage): Response`

Always manually constructs a `Set-Cookie` header for `COOKIES.ERROR_FOUND` (URL-encoded) with `STANDARD_COOKIE_OPTIONS` and appends it to the response, then returns `c.redirect(redirectUrl, HTML_STATUS.SEE_OTHER)`.

## Cross-references

- [constants.md](../constants.md) — `HTML_STATUS.SEE_OTHER`, `COOKIES`

---

See [source-code.md](../../source-code.md) for the full catalog.
