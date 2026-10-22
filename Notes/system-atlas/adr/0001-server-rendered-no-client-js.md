# 0001 — Server-rendered JSX, no client-side JS

**Status:** accepted (in force) · **Context:** mini-auth, a Cloudflare Worker app.

## Decision

All pages are server-rendered TSX through Hono's JSX renderer (`src/renderer.tsx`,
`src/routes/build-*.tsx`, `src/routes/build-layout.tsx`). The only JavaScript
served to browsers is the flash-message script in `build-root.tsx`. Form
validation is HTML attributes only. Project rules make client-side code
opt-in: it requires explicit permission.

## Why

- Simplest possible request model: GET renders, POST redirects. Nothing to
  hydrate, no state to sync.
- The app's real logic (auth, rate limits, code claim) must run server-side
  anyway; a JS layer would only duplicate it.
- Cheaper in production: most visitors can be served by the static asset
  layer without a Worker invocation.

## Consequences

- Flash messages must travel on redirects → the flash-cookie mechanism
  (ADR 0005) exists because of this choice.
- No optimistic UI; every error is a full round-trip — acceptable for auth.
- Reversing this means introducing a client framework; treat as a new
  project decision, not an edit.
