# Fix: Callback URL is not validated

## Problem

In `/auth/verify-email`, `callbackUrl` from the query string is passed directly to `auth.api.verifyEmail()` without validation. An attacker could craft a malicious verification link that redirects users to an external site after email verification (open redirect vulnerability).

## Assumptions

- Only same-origin redirects should be allowed.
- If `callbackUrl` is invalid or external, fall back to a safe default (e.g., sign-in page).
- Create a reusable validation helper for future use.

## Plan

1. **Create `validateCallbackUrl` helper** in `src/lib/url-validation.ts` — Check if URL is relative or same-origin; return the URL if valid, otherwise return a safe default.
2. **Apply validation in `build-email-confirmation.tsx`** — Wrap `callbackUrl` with the validator before passing to `verifyEmail`.
3. **Add unit test** — Confirm that external URLs are rejected and relative/same-origin URLs are allowed.

## Pitfalls

- **Relative URL edge cases** — URLs like `//evil.com` are protocol-relative and should be rejected.
- **URL parsing errors** — Malformed URLs can throw; handle gracefully.
- **Existing behavior** — The `callbackURL` values set in sign-up handlers are relative paths, which should continue to work.
