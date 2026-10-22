# 0004 — Dedicated rate-limit columns, never `updatedAt`

**Status:** accepted (in force) · **Context:** mini-auth, a Cloudflare Worker app.

## Decision

Email cooldowns are tracked on two dedicated columns,
`account.lastResetEmailAt` and `account.lastVerificationEmailAt`
(`src/db/schema.ts`), written through `db-access` helpers after each send.
Resend-verification and forgot-password read their own column before
sending again. Forgot-password additionally keeps an isolate-local Map so
unknown emails are throttled identically (no existence oracle).

## Why

- `account.updatedAt` was tried first — better-auth rewrites it on its own
  account updates, so a cooldown could be silently reset or extended by
  unrelated auth activity.
- Two clocks, not one: a reset send must not postpone a verification
  resend and vice versa.
- Keeping clocks in D1 means they survive Worker restarts and are shared
  across isolates — the in-memory Map is only the unknown-email side
  channel and losing it is harmless (it just re-limits quickly).

## Consequences

- Window duration is a constant (`EMAIL_RESEND_TIME_IN_MILLISECONDS`),
  not per-account — no per-user tuning without a schema change.
- The isolate-local cache is best-effort: on a multi-isolate deployment
  an unknown email could slip one extra request per isolate.
- Any third email type needs a third column — add it in `schema.ts`,
  don't reuse these.
