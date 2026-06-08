## Summary

Implements the `Decision` sections of the actionable items in `Notes/tasks/`. Tasks 5, 6, and 9 are explicitly `IGNORE` per their Decision sections and are untouched.

**Task 1 — invite code no longer burned on failed sign-up** (`sign-up-utils.ts`)
The single-use code is claimed before account creation; previously any later failure left it permanently consumed. Now every failure branch releases it:
```
claimSingleUseCode(code, email)
try { signUpEmail(...) }            // on !response / error response / synthetic dup / non-200 / thrown
  -> releaseClaimedCode()          // releaseSingleUseCode(code, email) — only releases if still held by this email
```

**Task 2 — production email failures surfaced** (`email-service.ts`)
The fetch-based transport returned the `Response` without inspecting it, so a 4xx/5xx was treated as a successful send. Now:
```
const res = await fetch(EMAIL_SEND_URL, ...)
if (!res.ok) throw new Error(`Email send failed with status ${res.status} ...`)
```

**Task 3 — email normalization** (new `lib/email-utils.ts`)
Better Auth stores emails trimmed + lowercased, so app-level lookups missed mixed-case/padded input. Added `normalizeEmail = (e) => e.trim().toLowerCase()` and applied it in `handle-sign-up`, `handle-forgot-password`, `handle-resend-email`, and `processGatedSignUp` before any DB lookup.

**Task 4 — duplicate display-name vs duplicate-email** (`sign-up-utils.ts`)
A `UNIQUE constraint failed: user.name` violation was reported as "account already exists". Added `isDuplicateNameError` (matches `user.name` / `user_name_unique`) and check it **before** the email/constraint heuristic, returning the new `MESSAGES.DISPLAY_NAME_TAKEN`.

**Task 7 — dedicated rate-limit clocks** (`db/schema.ts`, migration `0002`, `db-access.ts`, handlers)
Reset, resend, and post-sign-up all wrote `account.updatedAt` — which Better Auth also writes — so the timers cross-contaminated. Added `account.lastResetEmailAt` and `account.lastVerificationEmailAt` plus `updateResetEmailTimestamp` / `updateVerificationEmailTimestamp`; each flow now reads/writes its own column.

**Task 8 — dead code retained intentionally**
Added `@file` doc comments to `send-email.ts` and `po-notify.ts` marking them as intentionally retained utilities (not wired into any route).

**Task 10 — type-safety cleanup**
Removed redundant `(c as unknown as { get }).get('user')` casts in 7 auth route files (`c.get('user')` is already typed via `ContextVariableMap`). In `index.ts`, replaced the `@ts-ignore` env loop with a typed record view and consolidated the double `as unknown as Bindings` casts. In `time-access.ts`, narrowed two `@ts-ignore` to `@ts-expect-error` with explanations. In `email-service.ts`, replaced `globalThis as any` with a typed cast.

**Task 11 — scoped account join** (`db-access.ts`)
`getUserWithAccountByEmail` now `leftJoin`s on `account.userId AND account.providerId = 'credential'`, so future multi-provider accounts don't yield an arbitrary/stale row for rate-limit checks. The new timestamp writes are scoped the same way.

## Tests
- New: `tests/email-utils.spec.ts` (4) and `tests/sign-up-name-classification.spec.ts` (7) — all pass.
- Full unit suite run per-file: all pass except the 2 pre-existing `send-email.spec.ts` failures (present on `dev` before this change; unrelated to it).
- `npx tsc --noEmit`: clean except the same 2 pre-existing `send-email.spec.ts` errors.

## Notes
- Wiki updated per the repo's `Notes/wiki/AGENT.md` schema (`source-code.md`, `unit-tests.md`, new per-file pages, `log.md`).
- `package-lock.json` had unrelated `dev: true` churn from npm re-resolution; deliberately left out of this PR.
- Migration `0002` adds the two nullable columns; needs to be applied to D1 (`wrangler d1 migrations apply`).

Link to Devin session: https://app.devin.ai/sessions/3beb1752b9eb40ad8fe11991f8e8f61f