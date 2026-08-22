# Plan: Import Recent Authentication Safety Fixes from `expense-log`

## Goal

Bring the authentication and authorization improvements landed in the adjacent `expense-log` repository back into this authentication base project, adapting expense-specific tests to this project's `/private` and profile routes.

## Source history reviewed

The relevant recent `expense-log` commits are:

- `d1d3912` (2026-08-19), which added `Notes/review-auth-4.md` and identified the underlying authorization risks.
- `bd9564e` (2026-08-19), which blocked direct use of Better Auth's public email-sign-up endpoint.
- `8d1aa9d` (2026-08-20), which made password-change and account-deletion session revocation immediate and stopped relying on hard-coded Better Auth cookie names in the deletion flow.
- `3e12ab7` (2026-08-20), which expanded tests to cover actual HTTP authorization boundaries and production test-route gating.

The later `6700211` commit was also inspected but is expense/idempotency work, not an authentication change to import.

`expense-log` currently uses Better Auth `1.6.26`, while this project uses `1.6.29`. Do not downgrade the dependency; verify the imported behavior against the version already installed here.

## Current gaps in this project

| Area               | This project                                                                                                                          | Improved `expense-log` behavior                                                                      |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Raw sign-up API    | `/api/auth/sign-up/email` is forwarded by the `/api/auth/*` catch-all in every sign-up mode.                                          | The exact raw endpoint is rejected with 404 before Better Auth handles it.                           |
| Session validation | Better Auth's cookie cache can authorize from cookie data for five minutes.                                                           | Cookie caching is disabled so revoked/deleted sessions are checked against the database immediately. |
| Password change    | Calls `auth.api.changePassword`, so response cookie headers are unavailable to the Hono redirect.                                     | Calls Better Auth's HTTP handler and forwards all `Set-Cookie` headers to the redirect.              |
| Account deletion   | Manually removes `better-auth.session_token` and `better-auth.session_data`.                                                          | Uses Better Auth's sign-out response and forwards its configured cookie-clearing headers.            |
| Revocation tests   | Existing tests only check the active browser and later credential use.                                                                | Two-browser-context tests prove that another existing session loses access immediately.              |
| Boundary tests     | Individual page-navigation tests cover some GET routes, but protected mutation boundaries and the raw sign-up API are not enumerated. | A table-driven E2E suite exercises every protected method/path and every sign-up mode.               |
| Test-route gating  | `isTestRouteEnabled` has no direct unit coverage here.                                                                                | Bun tests prove test routes default off and cannot be enabled in production.                         |

## Implementation plan

Follow red/green/refactor for each section: add the smallest failing test first, confirm the expected failure with `-x`, implement only enough production code to pass it, rerun it, and then refactor without changing behavior.

### 1. Close the raw Better Auth sign-up bypass

#### Tests first

Create `e2e-tests/general/06-auth-routes-require-auth.spec.ts` and add a valid direct `POST /api/auth/sign-up/email` request.

- Define all five modes (`OPEN_SIGN_UP`, `NO_SIGN_UP`, `GATED_SIGN_UP`, `INTEREST_SIGN_UP`, and `BOTH_SIGN_UP`).
- Use `skipIfNotExactMode` so each server configuration executes its own matrix case.
- Expect a 404 response in every mode. This includes open mode: all account creation must pass through this project's custom handler, rather than allowing callers to bypass app-level validation and flow control.
- Keep the request independent of the browser UI and use the Playwright `request` fixture so the test covers the external HTTP boundary.

#### Minimal implementation

- Add `PATHS.AUTH.SIGN_UP_EMAIL_API` in `src/constants.ts`.
- In `src/routes/auth/better-auth-handler.ts`, compare `c.req.path` with that constant before constructing/dispatching to Better Auth and return an empty 404 response for the exact path.
- Block the exact path for every method handled by `app.all`, matching `expense-log`; custom sign-up handlers remain functional because they call `auth.api.signUpEmail()` internally rather than making a public HTTP request through the catch-all.

#### Refactor/check

- Keep the path centralized in `PATHS`; do not duplicate the literal in production code.
- Confirm neighboring Better Auth endpoints such as sign-in, sign-out, verification, password reset, and session lookup still reach the library handler.

### 2. Make revocation and account deletion immediate

#### Tests first

Extend the existing profile E2E files before changing production code:

1. In `e2e-tests/profile/02-can-change-password.spec.ts`, add a test that signs the seeded user into two independent browser contexts, changes the password in the first context, and immediately requests `/private` in the second. The second context must be redirected to sign-in without waiting for the old five-minute cache window.
2. In `e2e-tests/profile/06-delete-account-confirm.spec.ts`, add the equivalent two-context test for account deletion. After deletion in the first context, the second context's immediate request to `/private` must be redirected to sign-in.
3. Always close the extra browser context in `finally` so a failing assertion cannot leak state into later tests.

#### Minimal implementation

- In `src/lib/auth.ts`, set `session.cookieCache.enabled` to `false` and remove its `maxAge`. This forces protected requests to observe database session revocation/deletion immediately.
- In `src/routes/profile/handle-change-password.ts`:
  - Build a same-origin request to `/api/auth/change-password` with the incoming session headers, JSON content type, current password, new password, and `revokeOtherSessions: true`.
  - Call `auth.handler()` so the response headers are available.
  - Preserve the current user-facing error handling for a non-success response.
  - Append every Better Auth `Set-Cookie` header to the `redirectWithMessage` response before returning it.
  - Adapt the source change carefully enough that the outer catch does not reference a `user` variable scoped inside the `try` block.
- In `src/routes/profile/handle-delete-account.ts`:
  - Keep the existing successful database deletion as the prerequisite.
  - Send the current request headers through `createAuth(c.env).handler()` to `/api/auth/sign-out`.
  - Append every returned `Set-Cookie` header to the success redirect.
  - Remove the hard-coded `better-auth.session_token`/`better-auth.session_data` deletion and the now-unused `removeCookie` import. This lets Better Auth clear whichever cookie names and secure prefixes its configuration uses.

#### Refactor/check

- If `DURATIONS.FIVE_MINUTES_IN_SECONDS` becomes unused, remove it after the tests are green.
- Review the repeated `Set-Cookie` forwarding loops in the response interceptor, sign-out, password-change, and account-deletion handlers. Extract a small server-side helper only if it reduces duplication without broadening the change; otherwise retain the simple inline form used by `expense-log`.
- Do not add client-side code.

### 3. Cover the real authorization boundaries

#### Tests first

Complete `e2e-tests/general/06-auth-routes-require-auth.spec.ts` with a table of every route currently guarded by `signedInAccess`:

- `GET /private`
- `GET /profile`
- `POST /profile`
- `GET /profile/delete-confirm`
- `POST /profile/delete`

For each entry, issue a signed-out request with the correct HTTP method, an allowed `Origin` header, and redirects disabled. Assert status 303 and a `Location` containing `/auth/sign-in`. Keeping the matrix at the raw request level ensures tests do not accidentally pass because UI navigation avoided a mutation route.

Retain the existing focused browser tests for error messages and page rendering; the new suite complements rather than replaces them.

Also add:

- An E2E assertion that the explicitly enabled `/test/sign-up-mode` endpoint is reachable by the test runner, proving the test environment is exercising the expected route configuration.
- `tests/test-routes.spec.ts` using `bun:test`, with table-driven cases proving that test routes:
  - are disabled by default in development;
  - can be enabled by the explicit development flag;
  - can be enabled by the Playwright flag outside production;
  - remain disabled in production despite either flag.

#### Minimal implementation

No application change should be needed for the currently protected-route matrix or `isTestRouteEnabled`; these tests lock in the existing guards and expose future omissions. If a test reveals that a listed route is not guarded, add `signedInAccess` at that route's external boundary before changing test expectations.

#### Refactor/check

- Keep the protected-route list in one table so future authenticated routes can be added in one place.
- Use existing support helpers and constants where they fit, especially `skipIfNotExactMode`, `BASE_URLS`, `ERROR_MESSAGES`, and page verifiers.
- Use kebab-case `data-testid` values only if a new rendered assertion requires one; the planned request-level tests should not need new markup.

## Verification sequence

1. Run `bun test tests/*` after adding the test-route unit coverage.
2. Start the default server with `npm run dev-open-sign-up` and run each changed E2E file separately with `-x`, fixing one failure at a time:
   - `npx playwright test e2e-tests/general/06-auth-routes-require-auth.spec.ts -x`
   - `npx playwright test e2e-tests/profile/02-can-change-password.spec.ts -x`
   - `npx playwright test e2e-tests/profile/06-delete-account-confirm.spec.ts -x`
3. Repeat the general authorization file with `npm run dev-no-sign-up`, `npm run dev-gated-sign-up`, `npm run dev-interest-sign-up`, and `npm run dev-both-sign-up` so each raw-sign-up matrix case actually runs.
4. Run the complete Playwright suite with `npx playwright test -x` in open-sign-up mode, then in each remaining sign-up mode, addressing the first failure before continuing.
5. Run `npm run fmt:check` and `npm run build` after all tests pass.
6. Review the final diff for accidental dependency changes, public raw signup exposure, hard-coded Better Auth cookie names in the modified deletion flow, and any protected route missing from the boundary table.

## Explicit non-goals and follow-ups

- Do not copy expense-specific routes, constants, or `/expenses` assertions; adapt the test matrix to this base project's protected routes.
- Do not downgrade Better Auth or copy `expense-log`'s origin/production configuration as part of these focused fixes.
- `expense-log`'s review also recommended credentials or Cloudflare Access protection for destructive test routes and an expiring lease for claimed invitation codes. Those recommendations have not been implemented in the reviewed recent source commits, so they are not importable fixes and should not be represented as completed by this work. They merit separate hardening tasks for a reusable authentication base.
