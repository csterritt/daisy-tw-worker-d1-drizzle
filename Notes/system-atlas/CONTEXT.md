# Context — the words this system uses

Glossary only, domain-model style: the nouns, one line each. For the full picture open `atlas.html` (interactive) or read `SYSTEM.md` (generated).

## People and places

- **Worker** — the single Cloudflare Worker (`src/index.ts`) every request passes through.
- **D1** — Cloudflare's SQLite database, bound as `PROJECT_DB`; the only state store.
- **Mailpit** — the dev SMTP sink; catches every email the app sends, UI on :8025.

## Auth vocabulary

- **better-auth** — the library that owns credentials, sessions, verification and reset tokens.
- **Session** — a 30-day token in `better-auth.session_token`, resolved to `c.var.user` per request.
- **Sign-up mode** — `SIGN_UP_MODE` env var choosing which sign-up routes exist: `OPEN`, `GATED`, `INTEREST`, `BOTH`, or `NONE`.
- **Invite code** — a row in `singleUseCode`; `email IS NULL` means unclaimed. Claimed atomically, released on failure.
- **Waitlist** — the `interestedEmail` table; emails of people who asked in while sign-up is closed.

## Plumbing vocabulary

- **Flash cookie** — a one-shot `MESSAGE_FOUND` / `ERROR_FOUND` cookie set on a 303, rendered as an alert by the layout, then deleted.
- **`EMAIL_ENTERED`** — cookie remembering the address on verification/reset pages.
- **Rate-limit clock** — `account.lastResetEmailAt` / `lastVerificationEmailAt`; dedicated columns because better-auth rewrites `updatedAt`.
- **PRODUCTION markers** — `// PRODUCTION:REMOVE` / `UNCOMMENT` comments that `clean-for-production.rb` rewrites before deploy.
- **`data-testid`** — kebab-case attributes (`name-action`) that are the Playwright contract.
- **Test hooks** — `/test/*` routes plus clock/DB-failure toggles, mounted only when `ENABLE_TEST_ROUTES` or `PLAYWRIGHT` is set.
