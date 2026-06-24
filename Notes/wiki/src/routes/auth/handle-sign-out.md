# handle-sign-out.ts

**Source:** `src/routes/auth/handle-sign-out.ts`

## Purpose

POST handler for sign-out (`POST /auth/sign-out`). Calls Better Auth to invalidate the session and clear cookies.

## Export

### `handleSignOut(app): void`

### Flow

1. Constructs a `POST /api/auth/sign-out` request and calls `auth.handler(authRequest)`
2. If successful (200), copies Set-Cookie headers from the auth response onto a redirect to `/auth/sign-out`
3. On failure, manually removes `better-auth.session_token` and `better-auth.session_data` cookies, then redirects to `/auth/sign-out`
4. On error, redirects to `/auth/sign-out` with error message

## Cross-references

- [build-sign-out.md](build-sign-out.md) — GET confirmation page

---

See [source-code.md](../../../source-code.md) for the full catalog.
