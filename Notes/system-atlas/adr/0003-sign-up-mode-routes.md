# 0003 — Sign-up policy is a boot-time route choice

**Status:** accepted (in force) · **Context:** mini-auth, a Cloudflare Worker app.

## Decision

`SIGN_UP_MODE` is read once at boot in `src/index.ts` and decides which
sign-up routes get mounted: `OPEN_SIGN_UP` (form + verification),
`GATED_SIGN_UP` (form + single-use code), `INTEREST_SIGN_UP` (email-only
waitlist), `BOTH_SIGN_UP` (gated form + interest fallback), or
`NO_SIGN_UP` (nothing mounted). Routes that are not mounted do not exist —
there is no runtime toggle.

## Why

- A mode that isn't mounted can't be reached: no flag checks scattered
  through handlers, no way to "accidentally" expose open sign-up.
- Each mode gets its own form schema, page and POST handler, so the four
  policies never entangle.
- Dev servers and e2e runs pick a mode by script (`npm run dev-*`), and
  mode-specific specs skip when the server is in the wrong mode.

## Consequences

- Changing policy means redeploying with a different env var — fine for a
  launch-gating knob, wrong for anything user-facing.
- The same URL (`/auth/sign-up`) means different things per mode; tests
  must read `/test/sign-up-mode` before asserting.
- Gated mode needs a code-supply path (SQL inserts today — no admin UI).
