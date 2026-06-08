# Test coverage does not include several security and edge-case regressions

**Priority:** Low

**Location:** `tests/`, `e2e-tests/`

**Problem:** There is good happy-path and broad e2e coverage, but notable gaps remain: malformed reset token encoding, oversized reset/change passwords, duplicate-email gated sign-up not consuming codes, cookie value bounds, and timing/abuse behavior for unknown password-reset emails.

**Impact:** Reduced confidence that security-sensitive edge cases will be caught by automated tests before they reach production.

**Recommendation:** Add focused unit tests for validation and URL construction, plus e2e coverage for corrected invite-code semantics.
