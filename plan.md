# Password Reset Rate Limiting Fix

## Problem
Unknown emails get no rate limiting in `handle-forgot-password.ts`. Known users hit DB-backed timestamp checks; unknown users bypass all throttling. This creates a timing side channel and allows unlimited requests for non-existent emails.

## Fix (no schema changes)

Add an in-memory rate-limit cache (module-level `Map<string, number>`) keyed by normalized email, checked **before** the DB lookup. This ensures:
- Uniform response path (rate-limit check runs for all emails)
- No DB schema changes needed
- Worker-isolate scoped (adequate for single-worker deployments; acceptable tradeoff)

### Steps

1. Add `emailRateLimitCache: Map<string, number>` in `handle-forgot-password.ts`
2. Move rate-limit check to fire **before** DB lookup, for all emails
3. Keep per-account `checkRateLimit` call in `processPasswordReset` for DB-backed secondary check for known users (keeps `lastResetEmailAt` accurate)
4. Update e2e test `06-password-reset-rate-limiting.spec.ts` line 75-104: change expectation so second request for non-existent email IS rate limited (stays on forgot-password page with error)

## Constraints
- No DB schema changes
- TDD: update the failing test first, then implement
