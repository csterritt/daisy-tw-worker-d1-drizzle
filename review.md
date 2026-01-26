# Code Review (src/)

## Assumptions

- **[Runtime]** This is a Cloudflare Workers app using Hono + D1 + Drizzle.
- **[Production goal]** Files whose lines are marked `PRODUCTION:REMOVE` are stripped/disabled before deploying.
- **[Auth]** `better-auth` is the authoritative auth/session system; custom cookies are only for UX messaging (flash messages, remembered email, etc.).

## Answer

The core auth flows are present and generally follow a reasonable “validate -> call better-auth -> redirect w/ message” pattern, but there are several **high-risk production issues**: sensitive logging (tokens/headers/env keys), test/debug endpoints that can mutate data, and some cookie/security inconsistencies.

## Plan

- **[3] Harden security defaults**: cookie options (`secure`, `SameSite` alignment), origin validation, rate limit constants, and input validation for path params.
- **[4] Add minimal tests**: validation + auth route behavior + “test routes not mounted in prod”.

## Pitfalls

- **[Breaking auth]** Over-aggressive cookie changes can break better-auth session handling across redirects.
- **[Security regressions]** Keeping debug/test routes or verbose logging in production is a common source of data leaks and account takeover opportunities.

---

# Findings

## Critical

- **[Sensitive data leakage via logs]**
  - **Where**: `src/routes/auth/better-auth-handler.ts`, `src/lib/auth.ts`, `src/lib/email-service.ts`, `src/index.ts`.
  - **Issue**: Logging includes request headers (`Object.fromEntries(c.req.raw.headers.entries())`), environment keys (`envKeys`), and **tokens / URLs containing tokens** (`sendVerificationEmail` / `sendResetPassword` log `url` + `token`).
  - **Risk**: Session cookies, auth tokens, password reset links, and secrets can end up in logs.
  - **Recommendation**: Remove these logs entirely or gate them behind a strict debug flag; never log tokens, cookie headers, or env keys.

- **[Test/debug endpoints can mutate prod data]**
  - **Where**: `src/index.ts` mounts `testDatabaseRouter`, `testSignUpModeRouter`, `testSmtpRouter`, plus `handleSetDbFailures`, `handleSetClock`, `handleResetClock` marked `PRODUCTION:REMOVE`.
  - **Issue**: Routes like `DELETE /test/database/clear` wipe tables; `/test/set-smtp-config` changes global behavior.
  - **Risk**: If deployed, these are catastrophic (data loss, forced email failures, environment probing).
  - **Recommendation**: Do not mount these routers unless `NODE_ENV !== 'production'` _and_ an explicit allowlist is present (auth, secret header, IP allowlist). CSRF skipping for `/test/` also increases risk.

- **[Unvalidated cookie write primitive]**
  - **Where**: `src/routes/handle-set-db-failures.ts`.
  - **Issue**: Writes a cookie with attacker-controlled name `:name` and value `:times`.
  - **Risk**: Cookie injection / clobbering other cookies in the app’s scope (depending on `setCookie` behavior and allowed characters). Even if it only affects your domain, it’s an unnecessary capability.
  - **Recommendation**: Remove in prod; in dev-only, restrict `name` to a known allowlist (e.g. `DB_FAIL_COUNT`, `DB_FAIL_INCR`).

## High

- **[Cookie security inconsistencies]**
  - **Where**: `src/constants.ts` (`COOKIES.STANDARD_COOKIE_OPTIONS`), `src/routes/auth/handle-sign-out.ts`, `src/routes/profile/handle-delete-account.ts`.
  - **Issues**:
    - `STANDARD_COOKIE_OPTIONS` has `httpOnly: true` and `sameSite: 'Strict'` but `secure` is commented out.
    - Manual better-auth cookie clearing uses `SameSite=lax` (not aligned with your standard).
  - **Risk**: Missing `Secure` increases exposure on non-HTTPS; inconsistent attributes can cause cookies to not overwrite/clear as intended.
  - **Recommendation**: Decide on cookie policy and apply consistently; in production, set `secure: true` and ensure manual clears match actual cookie attributes.

- **[Time manipulation using client-controlled cookie]**
  - **Where**: `src/lib/time-access.ts` uses cookie `delta` to offset time.
  - **Issue**: Any client can set `delta` and affect server-side logic that relies on `getCurrentTime` (rate limits, expirations, etc.) if used beyond tests.
  - **Recommendation**: Ensure this is dev-only or enforce that only privileged/test mode can set/use it.

## Medium

- **[Potentially brittle sign-up flow assumptions]**
  - **Where**: `src/routes/auth/handle-sign-up.ts`, `handle-gated-sign-up.ts`, `handle-gated-interest-sign-up.ts`.
  - **Issue**: You treat `signUpResponse` as `unknown` and then check `'status' in signUpResponse` and `'error' in signUpResponse`. If better-auth returns a `Response` object vs a structured JSON, these checks may not behave as intended.
  - **Recommendation**: Type the API response (or normalize it) and handle each case explicitly.

- **[Rate limit constant is set to 3 seconds]**
  - **Where**: `src/constants.ts` (`DURATIONS.EMAIL_RESEND_TIME_IN_MILLISECONDS: 3 * 1000`).
  - **Issue**: This is effectively no rate limiting and invites abuse.
  - **Recommendation**: Ensure production uses a realistic value (and remove the dev constant entirely from builds).

- **[Excessive / noisy logging]**
  - **Where**: Many handlers (e.g. `handle-interest-sign-up.ts`).
  - **Issue**: Lots of debug logs, some include user emails.
  - **Recommendation**: Centralize logging with log levels and redact PII.

- **[Type safety gaps / `any` usage]**
  - **Where**: `src/lib/redirects.tsx` (`Context<any, any, any>`), `src/routes/auth/handle-reset-password.ts` casts `(body as any)?.token`, other handlers cast `c` to `unknown` to access `.get`.
  - **Issue**: Harder to reason about correctness; increases runtime edge cases.
  - **Recommendation**: Define a single Hono `Variables` type for `user`, `session`, `db` and use it everywhere.

- **[Email implementation duplication / inconsistency]**
  - **Where**: `src/lib/email-service.ts` vs `src/lib/send-email.ts`.
  - **Issue**: Two different strategies (HTTP API vs SMTP) and two different password bindings (`SMTP_SERVER_PASS` vs `SMTP_SERVER_PASSWORD`).
  - **Recommendation**: Pick one abstraction and one set of binding names; delete the unused implementation.

- **[Minor style/maintainability issues]**
  - **Where**: `src/middleware/guard-sign-up-mode.ts` has an import after a constant declaration.
  - **Issue**: Inconsistent import ordering; makes linting harder.

## Low

- **[Account schema: `user.name` is unique]**
  - **Where**: `src/db/schema.ts` (`name: ...unique()`).
  - **Issue**: Enforcing unique names is usually unexpected and can cause sign-up failures (two users named “Chris”).
  - **Recommendation**: Only keep unique constraints where required (email); verify better-auth requirements.

- **[CSRF applied globally but explicitly skipped for `/test/*`]**
  - **Where**: `src/index.ts`.
  - **Issue**: In dev that’s convenient; in production it’s a vulnerability if test routes are accessible.
  - **Recommendation**: Don’t mount `/test/*` in prod; otherwise don’t skip CSRF.

# Test Coverage

- **[Current state]** No test files found under `src/` (`*.test.*`).
- **[Recommendation]** Add a small suite covering:
  - validation schemas (happy + unhappy paths)
  - sign-in / sign-up handlers (redirect + cookie setting)
  - “test/debug routes are not mounted in production”
