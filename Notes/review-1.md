# Code Review Results — `daisy-tw-worker-d1-drizzle` (dev branch)

**Files reviewed**: 30+ source files under `src/`
**Issues found**: 2 high priority / 5 medium priority / 4 low priority

---

## High Priority

### 1. Single-use code consumed before account creation; no rollback on failure

**`src/lib/sign-up-utils.ts:252-306`**

In `processGatedSignUp`, the single-use code is atomically claimed (line 253) *before* the call to `auth.api.signUpEmail`. If account creation subsequently fails — duplicate email (synthetic response at 291), error response (285), non-200 status (297), or thrown exception (300) — the code has already been permanently consumed (email column set), but no new account was created.

This means a legitimate gated user who happens to supply a pre-existing email address, or who hits a transient error, loses their one-time invite code with no recovery path.

> **Recommendation:** Either (a) move the code-claim step to *after* successful account creation, or (b) release the code on failure by executing `UPDATE singleUseCode SET email = NULL WHERE code = ? AND email = ?` in the error/catch branches.

---

### 2. Production email transport silently swallows send failures

**`src/lib/email-service.ts:101-122`**

The production `sendMail` implementation calls `fetch(env.EMAIL_SEND_URL, ...)` but **never checks the response status**. If the email API returns a 4xx/5xx, `fetch` still resolves successfully — so `sendConfirmationEmail` (line 179) and `sendPasswordResetEmail` (line 249) both proceed to log "email sent successfully" and return without throwing.

This means confirmation and password-reset emails can silently fail in production while the user is told to "check your inbox."

> **Recommendation:** Check `response.ok` (or at minimum `response.status`) and throw on non-2xx:
> ```ts
> const response = await fetch(env.EMAIL_SEND_URL, { ... })
> if (!response.ok) {
>   throw new Error(`Email API returned ${response.status}: ${await response.text()}`)
> }
> return response
> ```

---

## Medium Priority

### 3. Email not normalized before app-level DB lookups

**`src/routes/auth/handle-forgot-password.ts:179`, `src/routes/auth/handle-resend-email.ts:46`, `src/lib/sign-up-utils.ts:304`**

better-auth internally normalizes emails to lowercase when storing users, but the app's own database queries (`getUserWithAccountByEmail`, `getUserIdByEmail`, `updateAccountTimestampAfterSignUp`) pass the raw, un-trimmed, mixed-case form input directly. SQLite text comparison is case-sensitive by default.

Result: a user who signed up with `"User@Example.com"` (stored as `"user@example.com"` by better-auth) cannot successfully trigger forgot-password or resend-verification if they type `"User@Example.com"` or `" user@example.com "` — they silently get the "if account exists" message without any email being sent. The interest-sign-up handlers correctly do `.trim().toLowerCase()` but the others do not.

> **Recommendation:** Normalize email to `email.trim().toLowerCase()` at the top of every POST handler before passing to DB queries. Consider a shared helper.

---

### 4. Duplicate username incorrectly reported as "email already exists"

**`src/lib/sign-up-utils.ts:32-43, 129-132, 191-196`**

The `user.name` column has a UNIQUE constraint. If a sign-up attempt uses a name that's already taken (but a novel email), the resulting SQLITE_CONSTRAINT error matches `isConstraintError` patterns, causing the generic handler to display: *"An account with this email already exists."* This is factually wrong (the email is new; the name is duplicate), confuses users, and indirectly reveals that a name is taken.

> **Recommendation:** Inspect the constraint error message to distinguish name vs. email uniqueness violations and show an appropriate message ("That display name is already in use").

---

### 5. Missing environment variables logged but app still serves requests

**`src/index.ts:59-96`**

`validateEnvironmentVariables()` checks 7 required vars at startup. If any are missing it logs an error repeatedly but does **not** throw or prevent the app from running. Requests will reach route handlers that depend on these vars (e.g., `EMAIL_SEND_URL`, `CLOUDFLARE_D1_TOKEN`) and fail unpredictably at runtime.

The runtime middleware (`validateEnvBindings`) only enforces 2 of the 7 vars (`BETTER_AUTH_SECRET`, `SIGN_UP_MODE`).

> **Recommendation:** Either add the remaining critical bindings to the runtime middleware, or make the startup validation actually halt (`throw new Error(...)`) when required vars are missing.

---

### 6. Destructive test routes protected only by env variable gating

**`src/routes/test/database.ts:25-34` (DELETE /test/database/clear wipes all data)**

The test endpoint that nukes the entire database (`session`, `account`, `user`, `singleUseCode`, `interestedEmail`) is protected solely by the `isTestRouteEnabled` guard, which returns `true` if `NODE_ENV !== 'production'` AND (`ENABLE_TEST_ROUTES==='true'` OR `PLAYWRIGHT==='1'`). Additionally, CSRF is explicitly skipped for `/test/*` routes (index.ts:118).

If a deployment inadvertently sets NODE_ENV to anything other than `'production'` while also having ENABLE_TEST_ROUTES or PLAYWRIGHT set, these destructive endpoints become accessible without CSRF protection.

> **Recommendation:** Consider adding a secondary defense: a shared test-secret header check, or IP allowlisting in the test-route middleware, so a single misconfigured env var isn't sufficient to expose DB wipe.

---

### 7. Shared `account.updatedAt` rate-limit clock across unrelated flows

**`src/routes/auth/handle-forgot-password.ts:46-56`, `src/routes/auth/handle-resend-email.ts:90-103`, `src/lib/sign-up-utils.ts:304`**

Password reset, resend-verification, and post-sign-up all write to `account.updatedAt` as a rate-limiting timestamp. Additionally, better-auth itself may update `account.updatedAt` when it touches the account row (e.g., during password change).

This coupling means: (a) resending a verification email resets the user's password-reset rate-limit timer and vice versa, (b) better-auth internal account updates can spuriously trigger rate-limiting for the user on unrelated flows.

> **Recommendation:** Introduce a dedicated column (or separate table) per rate-limited action — e.g., `lastResetEmailAt`, `lastVerificationEmailAt` — to decouple the timers.

---

## Low Priority

### 8. Dead code: `send-email.ts` and `po-notify.ts`

`sendEmail`, `sendOtpToUserViaEmail`, and `pushoverNotify` are exported but never imported/used anywhere in the codebase. Additionally, `sendOtpToUserViaEmailActual` (send-email.ts:112) incorrectly throws a `Result.err(...)` object instead of an `Error`, which would confuse async-retry.

> **Recommendation:** Remove dead modules, or mark them as intentionally retained for future use.

---

### 9. Error classification relies on fragile string matching

**`src/routes/auth/handle-reset-password.ts:64-68`, `src/routes/profile/handle-change-password.ts:86-90`**

Errors are classified by checking `message.includes('password')`, `.includes('invalid')`, etc. If better-auth ever changes wording or localizes messages, these branches silently fall through to a generic error.

> **Recommendation:** Where possible, match on error codes or error types rather than message substrings.

---

### 10. 14 occurrences of `@ts-ignore` / `as any` / `as unknown` weaken type safety

Scattered across `src/index.ts`, `src/lib/time-access.ts`, and handler files. Each `@ts-ignore` suppresses a compiler check that could catch regressions.

> **Recommendation:** Investigate and resolve each one (or narrow to `@ts-expect-error` with an explanation).

---

### 11. `getUserWithAccountByEmail` leftJoin + limit(1) may produce ambiguous results

**`src/lib/db-access.ts:86-98`**

If a user has multiple account rows (e.g., multiple auth providers in the future), the query picks one arbitrarily. The `accountUpdatedAt` used for rate-limiting may come from a stale row.

> **Recommendation:** If multi-provider is planned, scope the join to `providerId = 'credential'`.

---

## Summary

The two High-priority items (invite-code consumption race and silent email failures) are the most impactful — one causes data loss (burned codes) and the other causes silent functional breakage in production. The Medium items are correctness/UX issues that degrade the user experience or create defense-in-depth gaps.

Let me know if you'd like me to implement fixes for any of these.
