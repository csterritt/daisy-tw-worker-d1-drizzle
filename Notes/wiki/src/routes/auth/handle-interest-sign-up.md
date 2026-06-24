# handle-interest-sign-up.ts

**Source:** `src/routes/auth/handle-interest-sign-up.ts`

## Purpose

POST handler for interest/waitlist sign-up (`POST /auth/interest-sign-up`). Only active in `INTEREST_SIGN_UP` mode.

## Export

### `handleInterestSignUp(app): void`

### Flow

1. Checks if user is already signed in → redirects to `/private` with `MESSAGES.ALREADY_SIGNED_IN`
2. Parses request body
3. Validates email with `InterestSignUpFormSchema`
4. If invalid → sets `EMAIL_ENTERED` cookie (if email present in body), redirects to `/auth/interest-sign-up` with error
5. Normalizes email (trim + lowercase)
6. Adds email to `interestedEmail` table via `addInterestedEmail`
7. If DB error → sets `EMAIL_ENTERED` cookie, redirects to `/auth/interest-sign-up` with `'Sorry, there was an error processing your request. Please try again.'`
8. If already in waitlist → redirects to `/auth/sign-in` with `'Thanks! Your email is already on our waitlist. We\'ll notify you when we\'re accepting new accounts.'`
9. Otherwise → redirects to `/auth/sign-in` with `'Thanks! You\'ve been added to our waitlist. We\'ll notify you when we start accepting new accounts.'`

## Cross-references

- [build-interest-sign-up.md](build-interest-sign-up.md) — GET page
- [lib/db-access.md](../../lib/db-access.md) — `addInterestedEmail`

---

See [source-code.md](../../../source-code.md) for the full catalog.
