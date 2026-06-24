# build-email-confirmation.tsx

**Source:** `src/routes/auth/build-email-confirmation.tsx`

## Purpose

Handles email verification token callback (`/auth/verify-email`) and shows a confirmation page (`/auth/email-sent`).

## Export

### `buildEmailConfirmation(app): void`

### `GET /auth/verify-email`

1. Reads `token` query param and `callbackUrl` query param
2. Validates `callbackUrl` via `validateCallbackUrl`
3. If no token → renders failure page
4. Calls `auth.api.verifyEmail({ query: { token, callbackURL } })`
5. On success → renders `alert-success` with `data-testid='email-confirmation-page'`, "Email Confirmed!" and a "Sign In Now" button (`data-testid='sign-in-after-confirmation'`)
6. On failure/invalid token → renders `alert-error` with `data-testid='email-confirmation-page'`, "Confirmation Failed" and a "Back to Sign In" button (`data-testid='back-to-sign-in'`)

### `GET /auth/email-sent`

1. Reads `EMAIL_ENTERED` cookie
2. If no cookie → redirects to `/auth/sign-in` with `'Please sign up to continue.'`
3. Removes the `EMAIL_ENTERED` cookie after reading
4. Renders a page with `data-testid='email-sent-page'` confirming the email was sent, with a "Back to Sign In" button (`data-testid='back-to-sign-in-from-sent'`)

## Cross-references

- [lib/url-validation.md](../../lib/url-validation.md) — `validateCallbackUrl`

---

See [source-code.md](../../../source-code.md) for the full catalog.
