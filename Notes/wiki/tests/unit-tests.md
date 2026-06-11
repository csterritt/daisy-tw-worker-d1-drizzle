# Unit Tests Catalog

Catalog of all unit tests under `tests/` (7 spec files), organized by module. Each file links to its individual wiki page.

## Validators (`tests/validators.spec.ts`)

- [tests/validators.spec.ts](./validators.spec.md) — Unit tests for password max length validation across all form schemas in `src/lib/validators.ts`. Ensures the 128-character maximum is enforced consistently.

## Email Utils (`tests/email-utils.spec.ts`)

- [tests/email-utils.spec.ts](./email-utils.spec.md) — Unit tests for `src/lib/email-utils.ts` `normalizeEmail`, ensuring app-level email normalization matches Better Auth's internal normalization.

## Sign-Up Name Classification (`tests/sign-up-name-classification.spec.ts`)

- [tests/sign-up-name-classification.spec.ts](./sign-up-name-classification.spec.md) — Unit tests for the duplicate-name vs duplicate-email classification in `src/lib/sign-up-utils.ts`. A unique violation on `user.name` must be reported as a display-name error, not as "account already exists".

## DB Access Retry (`tests/db-access-retry.spec.ts`)

- [tests/db-access-retry.spec.ts](./db-access-retry.spec.md) — Unit tests for database access retry logic in `src/lib/db-access.ts`. Verifies retry behavior on transient D1 errors.

## Send Email (`tests/send-email.spec.ts`)

- [tests/send-email.spec.ts](./send-email.spec.md) — Unit tests for `src/lib/send-email.ts` low-level email sending via Nodemailer or fetch-based transport.

## Sign-Up Utils (`tests/sign-up-utils.spec.ts`)

- [tests/sign-up-utils.spec.ts](./sign-up-utils.spec.md) — Unit tests for shared sign-up validation and processing utilities in `src/lib/sign-up-utils.ts`.

## Time Access (`tests/time-access.spec.ts`)

- [tests/time-access.spec.ts](./time-access.spec.md) — Unit tests for time-related utilities (clock manipulation for testing) in `src/lib/time-access.ts`.

## URL Validation (`tests/url-validation.spec.ts`)

- [tests/url-validation.spec.ts](./url-validation.spec.md) — Unit tests for URL validation helpers for redirects and origins in `src/lib/url-validation.ts`.

---

See [source-code.md](../source-code.md) for the source modules covered by these tests.
See [e2e-tests.md](../e2e-tests.md) for end-to-end tests.
