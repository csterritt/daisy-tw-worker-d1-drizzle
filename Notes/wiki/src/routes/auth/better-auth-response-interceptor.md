# better-auth-response-interceptor.ts

**Source:** `src/routes/auth/better-auth-response-interceptor.ts`

## Purpose

Intercepts `POST` requests to the better-auth sign-in email API endpoint to convert JSON responses into user-friendly redirects with flash messages. Handles unverified sign-ins, invalid credentials, and other error states.

## Export

### `setupBetterAuthResponseInterceptor(app): void`

Intercepts `POST /api/auth/sign-in/email`.

### Sign-in flow

1. `captureEmailMiddleware` runs first — parses form data to extract `email` and stores it as `signInEmail` in context
2. `signInHandler` converts form data to JSON (for better-auth compatibility) and calls `auth.handler(jsonRequest)`
3. If response status is 200 (success):
   - Parses JSON to get `user` object
   - If `user.emailVerified` is false and URL includes `/sign-up` → sets `EMAIL_ENTERED` cookie, redirects to `/auth/email-sent` with `'Account created! Please check your email to verify your account.'`
   - If `user.emailVerified` is false (sign-in) → redirects to `/auth/sign-in` with `MESSAGES.VERIFY_EMAIL_BEFORE_SIGN_IN`
   - If `user.emailVerified` is true → copies Set-Cookie headers from auth response, redirects to `/private` with `'Welcome! You have been signed in successfully.'`
4. If response is an error:
   - **401** → redirects to `/auth/sign-in` with `'Invalid email or password. Please check your credentials and try again.'`
   - **403** → parses JSON for `error.code`; if `EMAIL_NOT_VERIFIED` and email captured → sets `EMAIL_ENTERED` cookie, redirects to `/auth/await-verification`; otherwise redirects to `/auth/sign-in` with verify message
   - **400** → redirects to `/auth/sign-in` with `'Please check your email and password and try again.'`
   - **500+** → redirects to `/auth/sign-in` with `MESSAGES.GENERIC_ERROR_TRY_AGAIN`
5. Falls back to returning the original response if no handler matched

## Cross-references

- [lib/redirects.md](../../lib/redirects.md) — `redirectWithMessage`, `redirectWithError`
- [constants.md](../../constants.md) — `PATHS`, `COOKIES`, `MESSAGES`

---

See [source-code.md](../../../source-code.md) for the full catalog.
