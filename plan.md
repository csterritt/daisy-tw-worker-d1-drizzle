# Fix: User-facing errors may leak internal details

## Problem

In `handleSignUpResponseError`, the raw `errorMessage` from auth responses is returned directly to users via `Registration failed: ${errorMessage}`. This can expose internal details (DB errors, stack traces, etc.) to end users.

## Assumptions

- Users should see generic, friendly error messages.
- Raw error details should be logged server-side for debugging.
- The `handleSignUpApiError` function already uses a generic message (`MESSAGES.REGISTRATION_GENERIC_ERROR`), so only `handleSignUpResponseError` needs fixing.

## Plan

1. **Log the raw error** in `handleSignUpResponseError` before returning a response.
2. **Return a generic message** instead of interpolating `errorMessage` into the user-facing string.
3. **Add unit test** to verify that internal error details are not exposed in the response.

## Pitfalls

- **Reduced debugging clarity for users** — If users can't describe their error, support gets harder. Mitigate by logging with a correlation ID if needed later.
- **Over-generalization** — Some errors (like "invalid email format") are safe to show. Consider a whitelist of safe error messages if UX suffers.
