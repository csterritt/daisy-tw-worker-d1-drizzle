# Unit tests duplicate implementation logic instead of testing production code

**Priority:** Medium

**Location:** `tests/db-access-retry.spec.ts:24-45` and `tests/sign-up-utils.spec.ts:12-31`

**Problem:** These tests reimplement `withRetry`, duplicate error pattern arrays, and simulate user-facing sign-up error mapping rather than importing the actual functions. A production bug or later behavior change could leave the tests green because they validate a copy, not the implementation.

**Impact:** False confidence and weak regression coverage for critical retry/error-sanitization code.

**Recommendation:** Export testable helpers where appropriate or test through public functions with mocked dependencies. At minimum, import `isDuplicateEmailError`, `isDuplicateNameError`, `isConstraintError`, and any retry wrapper behavior from production modules instead of duplicating them in tests.
