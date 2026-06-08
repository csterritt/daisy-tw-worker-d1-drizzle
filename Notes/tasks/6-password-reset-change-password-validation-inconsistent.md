# Password reset and change-password validation are inconsistent with account creation password limits

**Priority:** Medium

**Location:** `src/lib/validators.ts:136-146` and `src/lib/validators.ts:157-167` versus `src/lib/validators.ts:92-96`

**Problem:** Sign-up enforces both minimum and maximum password length, while reset-password and change-password only enforce minimum length. Better Auth may enforce its own max elsewhere, but the app-level validation is inconsistent and can pass oversized payloads deeper into the auth layer.

**Impact:** Inconsistent UX and unnecessary resource usage on sensitive endpoints.

**Recommendation:** Apply the same `maxLength(128, ...)` constraint to reset and change-password schemas, and add tests covering too-long new passwords.
