# Sensitive user identifiers are logged in account-management flows

**Priority:** Medium

**Location:** `src/routes/profile/handle-delete-account.ts:39` and `src/routes/profile/handle-delete-account.ts:57`; similar pattern in `src/routes/profile/handle-change-password.ts:73`

**Problem:** Successful account deletion and password changes log full user email addresses. Error logs also often include raw caught errors from auth/database layers.

**Impact:** Logs may retain personal data and sensitive operational details longer than necessary.

**Recommendation:** Prefer structured logs with request IDs and internal user IDs, redact or hash emails, and avoid logging raw third-party/auth errors unless they are sanitized or reserved for restricted debug sinks.
