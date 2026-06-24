# sign-up-utils.ts

**Source:** `src/lib/sign-up-utils.ts`

## Purpose

Shared logic for all sign-up flows (open, gated, interest). Handles duplicate-email detection, synthetic duplicate responses from better-auth, error extraction, and the full gated-sign-up process.

## Types

### `GatedSignUpData`

`{ code, name, email, password }`

## Internal constants

### `DUPLICATE_EMAIL_PATTERNS`

`['already exists', 'duplicate', 'unique constraint', 'unique', 'violates unique']`

### `CONSTRAINT_ERROR_PATTERNS`

`['constraint', 'sqlite_constraint']`

### `DUPLICATE_NAME_PATTERNS`

`['user.name', 'user_name_unique']` — patterns that indicate a unique violation on the display-name column rather than email.

## Exports

### `isSyntheticDuplicateResponse(response): boolean`

Detects better-auth's special duplicate response shape: `{ token: null, user: { emailVerified: false } }`. Returned when `requireEmailVerification=true` and a duplicate email signs up.

### `getResponseStatus(response): number | null`

Extracts `.status` from a `Response` or an object with a `status` property.

### `isDuplicateEmailError(errorMessage): boolean`

Checks if the error message matches any `DUPLICATE_EMAIL_PATTERNS` or contains both `'email'` and `'exists'`.

### `isConstraintError(errorMessage): boolean`

Checks if the error message matches any `CONSTRAINT_ERROR_PATTERNS`.

### `isDuplicateNameError(errorMessage): boolean`

Checks if the error message matches any `DUPLICATE_NAME_PATTERNS`.

### `extractErrorMessage(error): string`

Returns `error.message` if an `Error`, otherwise `String(error)`.

### `handleSignUpResponseError(c, response, email, fallbackPath): Response | null`

If the response is an error object:

- Duplicate name → redirects to `fallbackPath` with `MESSAGES.DISPLAY_NAME_TAKEN`
- Duplicate email → sets `EMAIL_ENTERED` cookie and redirects to `await-verification` with `MESSAGES.ACCOUNT_ALREADY_EXISTS`
- Otherwise → redirects to `fallbackPath` with `MESSAGES.REGISTRATION_GENERIC_ERROR`

### `handleSignUpApiError(c, error, email, fallbackPath): Response`

Catches better-auth API exceptions. Checks for duplicate name, duplicate email, and constraint errors; falls back to generic error redirect.

### `updateAccountTimestampAfterSignUp(db, email): Promise<void>`

Looks up user by email and updates `account.lastVerificationEmailAt` via `updateVerificationEmailTimestamp`. Logs on failure but does not throw.

### `redirectToAwaitVerification(c, email): Response`

Sets `EMAIL_ENTERED` cookie and redirects to `/auth/await-verification`.

### `processGatedSignUp(c, data): Promise<Response>`

Full gated sign-up flow:

1. Atomically claim the single-use code via `claimSingleUseCode`
2. Check if user already exists by email
3. Call `auth.api.signUpEmail` with `callbackURL`
4. Handle synthetic duplicates and error responses (releasing the code on failure)
5. Update verification email timestamp
6. Redirect to await-verification

## Cross-references

- [db-access.md](db-access.md) — `claimSingleUseCode`, `getUserIdByEmail`, `updateVerificationEmailTimestamp`, `releaseSingleUseCode`
- [validators.md](validators.md) — validation schemas
- [constants.md](../constants.md) — `PATHS`, `COOKIES`, `MESSAGES`

---

See [source-code.md](../../source-code.md) for the full catalog.
