# handle-gated-interest-sign-up.ts

**Source:** `src/routes/auth/handle-gated-interest-sign-up.ts`

## Purpose

POST handler for combined gated + interest sign-up. Only active in `INTEREST_SIGN_UP` mode (when gated codes are also available). Registers two separate POST routes: one for gated sign-up and one for interest/waitlist sign-up.

## Export

### `handleGatedInterestSignUp(app): void`

### Flow

### `POST /auth/sign-up` (gated sign-up)

1. Parses request body
2. Validates with `GatedSignUpFormSchema`
3. If invalid → redirects to `/auth/sign-up` with error
4. Delegates to `processGatedSignUp` from `sign-up-utils.ts`

### `POST /auth/interest-sign-up` (interest/waitlist)

1. Checks if user is already signed in → redirects to `/private` with `MESSAGES.ALREADY_SIGNED_IN`
2. Parses request body
3. Validates with `InterestSignUpFormSchema`
4. If invalid → sets `EMAIL_ENTERED` cookie, redirects to `/auth/sign-up` with error
5. Normalizes email (trim + lowercase)
6. Adds email to `interestedEmail` table via `addInterestedEmail`
7. If already in waitlist → redirects to `/auth/sign-in` with waitlist message
8. Otherwise → redirects to `/auth/sign-in` with success message

## Cross-references

- [lib/sign-up-utils.md](../../lib/sign-up-utils.md) — `processGatedSignUp`
- [lib/db-access.md](../../lib/db-access.md) — `claimSingleUseCode`, `addInterestedEmail`

---

See [source-code.md](../../../source-code.md) for the full catalog.
