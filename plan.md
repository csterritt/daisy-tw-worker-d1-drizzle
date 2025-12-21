## Plan: Change sign-out flow to dedicated /auth/sign-out page

### Goal

When a user signs out:

- Stop setting a JS-readable “simple cookie” for sign-out messaging.
- After the POST sign-out completes, redirect to a new **GET** `/auth/sign-out` page.
- The `/auth/sign-out` page should render:
  - The message: `You have been signed out successfully.`
  - A button that takes the user to the home page.

Update Playwright end-to-end tests to reflect the new sign-out UX.

### Current behavior (baseline)

- POST `/auth/sign-out` (handler: `src/routes/auth/handle-sign-out.ts`) calls Better Auth sign-out, then:
  - Sets `COOKIES.SIGN_OUT_MESSAGE` using `addSimpleCookie`.
  - Redirects to `/`.
- The home page (`src/routes/build-root.tsx`) reads `SIGN_OUT_MESSAGE` cookie in JS and injects an alert.

### Implementation checklist

#### 1) Add new sign-out “landing page” route

- [x] **Create** a new route builder file:
  - `src/routes/auth/build-sign-out.tsx`
- [x] **Route**: `GET /auth/sign-out`
- [x] **UI requirements**:
  - [x] Add a root element with `data-testid='sign-out-page'`.
  - [x] Display the exact text: `You have been signed out successfully.`
  - [x] Add a button linking to `/` with `data-testid='go-home-action'`.
- [x] Apply `secureHeaders(STANDARD_SECURE_HEADERS)`.
- [x] Apply `setupNoCacheHeaders(c)` (recommended, since this page is session-adjacent).
- [x] Register `buildSignOut(app)` in `src/index.ts` near other auth page builders.

#### 2) Modify POST /auth/sign-out to redirect to GET /auth/sign-out (no cookies)

- [x] Update `src/routes/auth/handle-sign-out.ts`:
  - [x] Remove all use of `addSimpleCookie` and `COOKIES.SIGN_OUT_MESSAGE`.
  - [x] Replace `redirectWithMessage(... PATHS.ROOT ...)` with a **303 redirect** to `PATHS.SIGN_OUT`.
    - Rationale: 303 ensures the browser follows with `GET` even though the initial request is `POST`.
  - [x] Preserve existing behavior of forwarding Better Auth “clear session cookie” headers onto the redirect response.
  - [x] In the fallback path (manual cookie clearing), still redirect to `PATHS.SIGN_OUT` (303).

#### 3) Remove sign-out “simple cookie” infrastructure

- [x] Update `src/lib/cookie-support.ts`:
  - [x] Remove `addSimpleCookie`.
  - [x] Remove `removeSimpleCookie` if unused after this refactor.
- [x] Update `src/constants.ts`:
  - [x] Remove `COOKIES.SIGN_OUT_MESSAGE` if no longer used.
- [x] Update `src/routes/build-root.tsx`:
  - [x] Remove the sign-out cookie-reading JavaScript block (the page should no longer try to display sign-out messaging).

#### 4) Update E2E tests and helpers for the new flow

- [x] Add a new page verifier in `e2e-tests/support/page-verifiers.ts`:
  - `verifyOnSignOutPage(page)` checks `data-testid='sign-out-page'`.
- [x] Update `e2e-tests/support/auth-helpers.ts`:
  - [x] Update `signOutAndVerify(page)`:
    - [x] Click `data-testid='sign-out-action'`.
    - [x] Verify `verifyOnSignOutPage(page)`.
    - [x] Click `data-testid='go-home-action'`.
    - [x] Verify `verifyOnStartupPage(page)`.
- [x] Update `e2e-tests/sign-in/05-sign-out-successfully.spec.ts`:
  - [x] After clicking sign out:
    - [x] Verify we land on the sign-out page.
    - [x] Verify the page contains `ERROR_MESSAGES.SIGN_OUT_SUCCESS`.
    - [x] Click the “Home” button and verify startup page.
  - [x] Keep the existing “private page redirects to sign-in” assertion (should still pass).
- [x] Update any other tests that depend on `signOutAndVerify()` expecting to be on the startup page immediately.
  - Known references:
    - `e2e-tests/general/03-test-body-size-limit.spec.ts`
    - `e2e-tests/general/04-test-secure-headers.spec.ts`

### Verification

- [x] Manual sanity check:
  - [x] Sign in → click Sign out → verify you land on `/auth/sign-out`.
  - [x] Click “Home” → returns to `/`.
  - [x] Attempt `/private` → redirected to `/auth/sign-in`.
- [x] Run Playwright suite (at minimum):
  - [x] `e2e-tests/sign-in/05-sign-out-successfully.spec.ts`
  - [x] Any tests using `signOutAndVerify`.
