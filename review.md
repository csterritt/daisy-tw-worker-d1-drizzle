# Code Review (src/)

## Assumptions

- Review scoped to `src/` only (no infra/config files).
- Worker runtime is Cloudflare Workers without Node globals unless `nodejs_compat` is enabled.
- Test-only routes are gated by runtime config and not exposed by default.

## Answer (Findings)

### High

- **Gated sign-up codes are not consumed atomically.** Codes are validated, then sign-up happens, then the code is consumed; concurrent requests can reuse a code and failures to consume don’t block account creation. Use a single atomic delete/check or a transaction. @src/routes/auth/handle-gated-sign-up.ts#58-133 @src/routes/auth/handle-gated-interest-sign-up.ts#73-148 @src/lib/db-access.ts#174-198
- **Retry wrapper doesn’t actually retry on Result failures.** `async-retry` only retries on thrown errors, but operations return `Result.err`, so transient DB errors won’t retry. Either throw on `Result.err` or move retry to the lower-level DB calls. @src/lib/db-access.ts#38-60
- **Email service may crash in non-Node worker runtimes.** `process.argv` is referenced unguarded and will throw if `process` is undefined; this can break sign-up/reset flows. Gate this check or rely only on bindings. @src/lib/email-service.ts#42-50

### Medium

- **Environment validation is inconsistent and non-blocking.** Startup validation logs but does not fail; runtime middleware checks only a subset of required bindings, so missing email config can cause runtime failures. Consolidate and fail fast. @src/index.ts#62-103 @src/middleware/guard-sign-up-mode.ts#17-47
- **User-facing errors may leak internal details.** Raw `errorMessage` from auth responses is returned to the user; prefer generic messages and log the raw error. @src/lib/sign-up-utils.ts#120-145
- **Callback URL is not validated.** `callbackUrl` from query is forwarded to verification without allowlisting; validate against trusted origins to avoid open redirects. @src/routes/auth/build-email-confirmation.tsx#129-149
- **Type safety gaps (`any`/casts) reduce maintainability.** Several helpers use `Context<any, any, any>` and `as any`, undermining strict typing. @src/lib/cookie-support.ts#21-45 @src/lib/redirects.tsx#17-41 @src/routes/auth/handle-interest-sign-up.ts#44-51

### Low / Maintainability / Performance

- **Sign-up handlers and pages are duplicated**, raising divergence risk; consider shared helpers/components. @src/routes/auth/handle-gated-sign-up.ts#37-133 @src/routes/auth/handle-gated-interest-sign-up.ts#52-148 @src/routes/auth/build-gated-sign-up.tsx#29-139 @src/routes/auth/build-gated-interest-sign-up.tsx#29-189
- **Test DB status endpoint pulls full tables.** Use `count(*)` instead of `select()` to reduce overhead. @src/routes/test/database.ts#238-244
- **Hard-coded CSS asset name** risks stale references after rebuilds; consider a manifest or constant. @src/renderer.tsx#17-20
- **Docs/tests:** Core helpers (DB access, sign-up error mapping) lack unit tests; add targeted tests around retries and error handling. @src/lib/db-access.ts#38-60 @src/lib/sign-up-utils.ts#120-175

## Plan

1. Make gated sign-up code usage atomic (delete+check before account creation, or use a DB transaction).
2. Fix retry semantics to throw on failures or move retries into DB calls; add unit tests for retry + sign-up error mapping.
3. Harden runtime safety: consolidate env validation, validate callback URLs, and remove Node-global usage in worker paths; trim user-facing error details.

## Pitfalls

- Avoid creating duplicate accounts when adding retries/transactions; ensure idempotency and consistent error handling.
- Tightening error messages can reduce UX clarity—keep detailed logs for operators.
- If you rely on Node globals (nodemailer/test tooling), document the required compatibility flags for local/dev vs production.
