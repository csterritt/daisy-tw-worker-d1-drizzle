# 0002 — better-auth owns the credential surface

**Status:** accepted (in force) · **Context:** mini-auth, a Cloudflare Worker app.

## Decision

better-auth (`src/lib/auth.ts`) is the only code allowed to hash passwords,
issue session tokens, and create/verify email-verification and password-reset
tokens. It is reached two ways: its own `/api/auth/*` HTTP handler
(`better-auth-handler.ts`), and in-process `auth.api.*` calls from form
handlers. The `/api/auth/sign-up/email` endpoint is deliberately 404'd so
sign-ups can only flow through our mode-aware form handlers.

## Why

- Password hashing, token entropy and session lifecycle are exactly the
  code you do not want to own.
- The Drizzle adapter keeps its four tables (`user`, `session`, `account`,
  `verification`) in the same D1 database as ours.
- Email verification required (`requireEmailVerification`) makes
  "account exists but unconfirmed" a first-class state the UX can use.

## Consequences

- better-auth answers JSON; HTML needs redirects → the sign-in adapter
  (`better-auth-response-interceptor.ts`) exists to translate.
- `account.updatedAt` is untrusted for app logic (better-auth writes it)
  → rate-limit clocks live on dedicated columns (ADR 0004).
- Its schema is effectively a migration boundary: renaming or reshaping
  those tables means coordinating with the library.
