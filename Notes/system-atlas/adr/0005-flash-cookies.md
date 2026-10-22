# 0005 — Flash messages ride redirects as one-shot cookies

**Status:** accepted (in force) · **Context:** mini-auth, a Cloudflare Worker app.

## Decision

POST handlers never render HTML. They return a 303 via
`redirectWithMessage` / `redirectWithError` (`src/lib/redirects.tsx`),
which appends a `MESSAGE_FOUND` or `ERROR_FOUND` Set-Cookie. The shared
layout (`useLayout`) reads the cookie on the next GET, renders it as an
alert, and deletes it. `EMAIL_ENTERED` carries the address between
verification pages the same way. Project rule: never call `c.redirect`
directly.

## Why

- Post/Redirect/Get is the only way to keep "refresh the page" safe when
  POSTs can have side effects (claim a code, send an email).
- Without client JS there is no other channel that survives the redirect —
  the cookie is the message bus.
- One-shot semantics are free: read it, render it, delete it. Messages
  can't linger and reappear on unrelated pages.

## Consequences

- Message text travels through the browser — only ever put display-safe
  strings in flash cookies (they're httpOnly + SameSite=Strict, but the
  browser still holds them).
- A page that forgets to delete its cookie would replay the alert — the
  layout owns deletion centrally to prevent that.
- Long messages are limited by cookie size (~4kb) — fine for one-liners,
  wrong for anything bigger.
