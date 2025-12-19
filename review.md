# Code Review Checklist

## Scope & approach

- [x] Reviewed `src/index.ts` request pipeline, middleware ordering, and route registration.
- [x] Reviewed Better Auth integration (`src/lib/auth.ts`, `src/routes/auth/*`).
- [x] Reviewed cookie + redirect UX (`src/lib/cookie-support.ts`, `src/lib/redirects.tsx`, `src/routes/build-layout.tsx`, `src/routes/build-root.tsx`).
- [x] Reviewed protected-route enforcement (`src/middleware/signed-in-access.ts`, `src/routes/build-private.tsx`, `src/routes/profile/*`).
- [x] Reviewed DB access patterns (`src/db/*`, `src/lib/db-access.ts`) and generated Drizzle migrations (`drizzle/*.sql`).
- [x] Reviewed dev/test-only endpoints (`src/routes/test/*`, `src/routes/handle-set-db-failures.ts`) and production-cleaning/deploy scripts.
- [x] Reviewed Playwright e2e tests (`e2e-tests/**`) and test-only DB/SMTP helpers.

### Recommendations

- **[recommendation]** Keep this checklist format and update it whenever you change auth/session/cookie behavior; it makes regressions much easier to spot.

## High-level architecture (as implemented)

- **Server/runtime**: Cloudflare Worker running a Hono app (Wrangler `main: src/index.ts`).
- **DB**: Cloudflare D1 accessed through Drizzle (`src/db/client.ts`, `src/db/schema.ts`).
- **Auth**: Better Auth with Drizzle adapter (`src/lib/auth.ts`).
- **Session exposure to routes**:
  - Global middleware (`setupBetterAuthMiddleware`) calls `auth.api.getSession()` and stores `user`, `session`, and `authSession` in the Hono context.
  - Protected routes use `signedInAccess`.
- **UX flows**:
  - Sign-in POSTs to Better Auth endpoint `/api/auth/sign-in/email`, but you intercept it (`setupBetterAuthResponseInterceptor`) to translate JSON responses into redirects + flash messages.
  - Sign-up handlers call `auth.api.signUpEmail()` and redirect to `/auth/await-verification`.
  - Password reset uses Better Auth APIs plus local pages and Mailpit in tests.

### Recommendations

- **[recommendation]** Consider documenting (in README) that the sign-in endpoint is intercepted and behaves like a normal form POST (redirect-based UX), not a JSON API.

## Correctness review

- [x] Verified middleware ordering and route declarations in `src/index.ts` (secure headers, CSRF, body limit, renderer, DB init, auth middleware, interceptor, auth handler, routes).
- [x] Verified `signedInAccess` blocks protected routes by checking presence of `user` + `session` set by Better Auth middleware.
- [x] Verified sign-in UX behavior:
  - `/api/auth/sign-in/email` request is intercepted and converted to a redirect flow.
  - Session cookies from Better Auth responses are forwarded onto redirect responses.
- [x] Verified sign-up behavior across modes:
  - `OPEN_SIGN_UP`: `handleSignUp` uses Better Auth API and redirects to await verification.
  - `GATED_SIGN_UP`: code is consumed before account creation.
  - `INTEREST_SIGN_UP`: email is added to `interestedEmails` and redirects back to sign-in with a message.
  - `BOTH_SIGN_UP`: combines both flows.
- [x] Verified email verification route behavior (`/auth/verify-email`) uses `auth.api.verifyEmail()` and renders a success/failure page.
- [x] Verified password reset flow:
  - Request reset: `auth.api.requestPasswordReset()` then redirect to waiting page.
  - Reset: `auth.api.resetPassword()` then redirect to sign-in.
- [x] Verified profile actions:
  - Change password uses `auth.api.changePassword()` with `revokeOtherSessions: true`.
  - Delete account deletes DB user and clears Better Auth cookies.

### Notable correctness issues

- **[P1] Better Auth debug route is unreachable**: `app.all('/api/auth/*', ...)` will match `/api/auth/test` before the later `app.get('/api/auth/test', ...)`.
- **[P1] `handleResendEmail` callback URL construction is brittle**: uses `c.req.url.split('/')`.
- **[P0] `process.env` is used in request-handling logic** (see Safety section): this can break correctness in real Worker deployments.

### Recommendations

- **[recommendation]** Replace the callback URL construction with `new URL(c.req.url).origin`.
- **[recommendation]** Remove the unreachable Better Auth test route or register it before the wildcard.

## Consistency review

- [x] Reviewed naming and message consistency across routes (`MESSAGES`, `ERROR_MESSAGES`, and redirect helpers).
- [x] Reviewed consistent use of cookie helpers (`addCookie`, `removeCookie`, `addSimpleCookie`) vs direct `Set-Cookie` string appends.
- [x] Reviewed consistency between UI expectations and server responses (alerts populated via cookies, navbar behavior based on `c.get('user')`).
- [x] Reviewed consistency of validation approach (Valibot schemas + `validateRequest`).

### Notable consistency issues

- **[P2] Inconsistent error vs message cookie usage**: some error paths use `redirectWithMessage` instead of `redirectWithError`, changing alert styling/semantics.
- **[P2] `process.env.SIGN_UP_MODE` is read in TSX route builders** while other logic conceptually belongs in Worker bindings.

### Recommendations

- **[recommendation]** Standardize: use `redirectWithError` for errors, `redirectWithMessage` for non-errors.
- **[recommendation]** Standardize configuration reads: prefer Worker `Bindings` for runtime config and reserve `process.env` for local tooling (scripts).

## Safety (security) review

- [x] Reviewed CSRF protection configuration (`hono/csrf`) and origin allow-list logic.
- [x] Reviewed cookie defaults (`COOKIES.STANDARD_COOKIE_OPTIONS`) and how cookies are set/cleared.
- [x] Reviewed secure headers configuration (`secureHeaders`, CSP, permissions policy).
- [x] Reviewed handling of secrets and trusted origins in Better Auth config.
- [x] Reviewed dev/test endpoints exposure and how they are excluded (or not) in production.
- [x] Reviewed logging patterns for leakage of sensitive data.

### High-risk safety issues

- **[P0] `process.env` used in Worker request-path**
  - **Where**: `src/index.ts` (SIGN_UP_MODE, CSRF origin, env validation), `src/lib/auth.ts` (secret + origins + baseURL), route builders (`build-sign-in.tsx`, `build-sign-up.tsx`).
  - **Why it matters**: Worker runtime configuration should be from bindings (`c.env`). If `secret` becomes `undefined`, the auth system may be unsafe or unstable.

- **[P0] Dev/test endpoints are live without an in-process environment guard**
  - **Where**: `/test/database/*`, `/test/*` SMTP config endpoints, `/auth/set-db-failures/*`.
  - **Why it matters**: If production-cleaning is skipped/misapplied, these endpoints can mutate prod state.

- **[P0] Sensitive logging**
  - **Where**: request headers in `better-auth-handler.ts`, tokens/URLs in `email-service.ts`.
  - **Why it matters**: leaks cookies, verification tokens, and reset tokens.

- **[P1] Potential XSS injection in root sign-out message display**
  - **Where**: `build-root.tsx` reads cookie and injects into the DOM via `innerHTML`.

- **[P1] CSP directives likely have invalid quoting**
  - **Where**: `STANDARD_SECURE_HEADERS.contentSecurityPolicy` includes values like `"'https:'"`.

### Recommendations

- **[recommendation]** Move runtime config reads to bindings (`c.env`), especially `BETTER_AUTH_SECRET`, `SIGN_UP_MODE`, and trusted origins.
- **[recommendation]** Add runtime guards to dev/test endpoints (return `404` unless `env.PLAYWRIGHT === '1'` or `env.NODE_ENV !== 'production'`).
- **[recommendation]** Remove token/header logging (or strictly gate it to non-production).
- **[recommendation]** Replace `innerHTML` usage with DOM creation + `textContent`.
- **[recommendation]** Validate CSP syntax and correct the quoting (add an automated test; see E2E section).

## Resilience & operational behavior review

- [x] Reviewed DB access layer retry strategy (`async-retry` + `Result`) and error reporting.
- [x] Reviewed rate limiting strategy for resend-verification and forgot-password (based on `account.updatedAt`).
- [x] Reviewed session invalidation behaviors:
  - Password change uses `revokeOtherSessions: true`.
  - Sign-out attempts to forward Better Auth cookie-clearing headers, with a manual fallback.
- [x] Reviewed caching controls for authenticated pages (`setupNoCacheHeaders`).

### Notable resilience risks

- **[P2] Rate limiting depends on `account.updatedAt`**: if an account row is missing (or join returns null), rate limiting effectively becomes disabled.
- **[P2] Gated sign-up code consumption happens before user creation**: strong single-use semantics but can lead to “lost” codes if account creation fails.
- **[P2] Interested-email insertion has a race window**: existence check + insert can fail under concurrency.

### Recommendations

- **[recommendation]** Consider increasing the production retry backoff (the constants already have production toggles).
- **[recommendation]** Decide and document the intended semantics for gated codes on failed sign-ups (consume vs rollback).
- **[recommendation]** Switch `addInterestedEmail` to “insert then treat unique constraint as already exists”.

## E2E test coverage review (Playwright)

- [x] Reviewed sign-in tests (`e2e-tests/sign-in/*`).
- [x] Reviewed sign-up tests (`e2e-tests/sign-up/*`) including Mailpit-based email verification flows.
- [x] Reviewed password reset tests (`e2e-tests/reset-password/*`) including Mailpit link extraction and rate limiting.
- [x] Reviewed profile tests (`e2e-tests/profile/*`) including change-password and delete-account flows.
- [x] Reviewed test harness utilities (`e2e-tests/support/*`) including DB clear/seed endpoints and SMTP override endpoints.

### Coverage gaps (recommended tests to add)

- [ ] Add a **security headers smoke test** that asserts the presence/shape of `Content-Security-Policy`, `Referrer-Policy`, etc. on key pages.
- [ ] Add an e2e test that asserts **dev/test endpoints are inaccessible** in a production-like build.
- [ ] Add a test asserting **delete-account invalidates the existing session immediately** (attempt `/private` after deletion without re-signing-in).
- [ ] Add a test that verifies the **gated sign-up code consumption behavior** (explicitly assert consume-vs-not-consume on failure).

### Recommendations

- **[recommendation]** Add the security headers smoke test first; it will catch CSP regressions quickly.
- **[recommendation]** Add one “production safety” test (or CI job) that ensures `/test/*` endpoints are not reachable in a production build.

## Tooling / migrations / production-cleaning review

- [x] Reviewed `drizzle/*.sql` migrations:
  - Core Better Auth tables: `user`, `account`, `session`, `verification`.
  - Additional app tables: `singleUseCode`, `interestedEmails`.
  - Migration `0003_wandering_steel_serpent.sql` drops the redundant unique index on `singleUseCode.code` (PK already enforces uniqueness).
- [x] Reviewed `build-schema-update.sh`:
  - Generates `schema.sql` by concatenating migrations and makes DDL idempotent (`IF NOT EXISTS`).
  - Prompts before remote updates and uses `schema-prod.sql` for remote.
- [x] Reviewed `clean-for-production.rb`:
  - Removes `PRODUCTION:*` markers and can uncomment `PRODUCTION:UNCOMMENT` lines.
  - Edits files in-place across all files matching `rg -l PRODUCTION`.
- [x] Reviewed `prod_deploy.sh`:
  - Runs `clean-for-production.rb`, does `git reset --hard`, generates version, snapshots an HTML build, rebuilds CSS, commits, and merges dev->main.

### Tooling risks

- **[P2] `clean-for-production.rb` relies on hard-coded paths** (`/opt/homebrew/bin/git`, `/opt/homebrew/bin/rg`), which can break on non-mac environments.
- **[P2] `prod_deploy.sh` includes destructive operations** (e.g. `git reset --hard HEAD`).

### Recommendations

- **[recommendation]** Add a runtime safety guard in code even if you keep `clean-for-production.rb` (defense in depth).
- **[recommendation]** Consider removing the hard-coded Homebrew paths or detecting commands via `PATH`.

## Summary (prioritized issues)

- **P0**
  - `process.env` usage in Worker request path (risk of missing secret and incorrect runtime config).
  - Dev/test endpoints lack runtime environment guards.
  - Sensitive logging of headers/tokens.
- **P1**
  - Root-page sign-out message uses `innerHTML` (XSS sink).
  - CSP directive quoting likely incorrect.
  - Resend-email callback URL construction brittle.
  - Unreachable Better Auth debug route.
- **P2**
  - Redirect message vs error consistency.
  - Gated-code consumption semantics on failed sign-up.
  - Waitlist insert race window.
  - Tooling portability/destructiveness.

## Next steps

1. Fix P0 items (env sourcing, runtime guards, logging).
2. Fix P1 items (XSS sink, CSP correctness, URL building, unreachable route).
3. Add the 1–2 most valuable e2e tests (security headers + gated-code semantics).
