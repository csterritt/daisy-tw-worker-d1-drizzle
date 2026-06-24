# handle-gated-sign-up.ts

**Source:** `src/routes/auth/handle-gated-sign-up.ts`

## Purpose

POST handler for gated sign-up (`POST /auth/sign-up`). Only active in `GATED_SIGN_UP` mode.

## Export

### `handleGatedSignUp(app): void`

### Flow

1. Parses request body
2. Validates with `GatedSignUpFormSchema`
3. If invalid → redirects to `/auth/sign-up` with error
4. Delegates to `processGatedSignUp` from `sign-up-utils.ts` which handles code claiming, user existence check, sign-up API call, timestamp update, and redirect
5. On error → redirects to `/auth/sign-up` with `MESSAGES.REGISTRATION_GENERIC_ERROR`

## Cross-references

- [lib/sign-up-utils.md](../../lib/sign-up-utils.md) — `processGatedSignUp`
- [lib/db-access.md](../../lib/db-access.md) — `claimSingleUseCode`

---

See [source-code.md](../../../source-code.md) for the full catalog.
