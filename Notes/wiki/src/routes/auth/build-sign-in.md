# build-sign-in.tsx

**Source:** `src/routes/auth/build-sign-in.tsx`

## Purpose

Sign-in page builder (`/auth/sign-in`).

## Export

### `buildSignIn(app): void`

Route: `GET /auth/sign-in/:validationSuccessful?`

### Behavior

1. Already-authenticated users are redirected to `/private` with `'You are already signed in.'`
2. If `validationSuccessful` path param is `'true'`, renders a success banner: `'Your email has been verified successfully. You may now sign in.'`
3. Otherwise renders the standard sign-in form

### Sign-in form fields

- **Email** — `type='email'`, `data-testid='email-input'`
- **Password** — `type='password'`, `data-testid='password-input'`
- **Submit** — `data-testid='submit'`

### Navigation

- "Forgot your password?" link (`/auth/forgot-password`) — `data-testid='forgot-password-action'`
- Sign-up link — conditional on `SIGN_UP_MODE`:
  - `NO_SIGN_UP` → no link shown
  - `INTEREST_SIGN_UP` → link to `/auth/interest-sign-up` with text "Join Waitlist" — `data-testid='go-to-sign-up-action'`
  - `OPEN_SIGN_UP` or `GATED_SIGN_UP` → link to `/auth/sign-up` with text "Create Account" — `data-testid='go-to-sign-up-action'`

## Cross-references

- [local-types.md](../../local-types.md) — `AppContext`
- [lib/redirects.md](../../lib/redirects.md) — `redirectWithMessage`

---

See [source-code.md](../../../source-code.md) for the full catalog.
