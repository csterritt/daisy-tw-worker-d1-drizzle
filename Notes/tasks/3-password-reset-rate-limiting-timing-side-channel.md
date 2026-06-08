# Password reset rate limiting does not apply to non-existent emails and creates a timing side channel

**Priority:** Medium

**Location:** `src/routes/auth/handle-forgot-password.ts:183-197`; test expectation in `e2e-tests/reset-password/06-password-reset-rate-limiting.spec.ts:75-104`

**Problem:** Known users hit database account lookup, email sending, and timestamp updates; unknown users immediately redirect with no cooldown. The e2e test explicitly documents this behavior. Even though the visible page is the same, response timing and unlimited repeated requests for unknown emails can distinguish existing from non-existing accounts.

**Impact:** User enumeration risk via timing and inconsistent abuse controls.

**Recommendation:** Apply a uniform throttle independent of account existence, such as an IP/email-keyed rate-limit table or cache. Keep response timing and status behavior as uniform as practical for known and unknown emails.
