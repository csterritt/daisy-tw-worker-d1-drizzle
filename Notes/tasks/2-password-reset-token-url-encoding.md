# Password reset token is reflected into redirect URLs without URL encoding

**Priority:** High

**Location:** `src/routes/auth/handle-reset-password.ts:33-38` and `src/routes/auth/handle-reset-password.ts:76-79`

**Problem:** The handler interpolates attacker-controlled `token` directly into `?token=${token}`. A token containing `&`, `#`, `%0d%0a`, or other reserved characters can alter the resulting query string, break the reset form state, or potentially produce unsafe redirect headers depending on framework/runtime behavior.

**Impact:** Correctness and security hardening issue around a sensitive credential-recovery flow.

**Recommendation:** Build redirect targets with `URLSearchParams` or `encodeURIComponent(token)`, and add a max length/pattern validation for reset tokens in `ResetPasswordFormSchema`.
