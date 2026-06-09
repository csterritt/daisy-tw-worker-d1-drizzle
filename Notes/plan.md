# Plan: Fix Sensitive User Identifiers in Logs

## Problem
Sensitive user identifiers (email addresses) are being logged in account-management flows:
- `src/routes/profile/handle-delete-account.ts:39` - logs user.email on delete attempt
- `src/routes/profile/handle-delete-account.ts:57` - logs user.email on successful delete
- `src/routes/profile/handle-change-password.ts:73` - logs user.email on password change
- Error logs include raw caught errors from auth/database layers

## Solution
1. Replace email logging with internal user ID (user.id)
2. Sanitize error logging - don't log raw third-party/auth errors
3. Use structured logging format with request context

## Implementation Steps

### 1. Create a logging utility (src/lib/logger.ts)
- Structured logging functions that redact sensitive data
- Functions: `logInfo`, `logError`, `logWarn`
- Accept userId instead of email
- Sanitize error objects before logging

### 2. Update handle-delete-account.ts
- Import logger utility
- Replace `console.log('Deleting account for user:', user.email)` with `logInfo('Deleting account', { userId: user.id })`
- Replace `console.log('Account deleted successfully for user:', user.email)` with `logInfo('Account deleted successfully', { userId: user.id })`
- Sanitize error logs: `logError('Delete account error', { userId: user.id, error: sanitizeError(result.error) })`
- Sanitize catch block error: `logError('Delete account handler error', { userId: user.id, error: sanitizeError(error) })`

### 3. Update handle-change-password.ts
- Import logger utility
- Replace `console.log('Password changed successfully for user:', user.email)` with `logInfo('Password changed successfully', { userId: user.id })`
- Sanitize error logs in catch blocks

### 4. Run tests to verify
- Run e2e tests for delete account and change password
- Run unit tests

## Pitfalls
- Need to ensure user.id is always available (it is, from AuthUser type)
- Error sanitization must not lose critical debugging info for internal errors
- Must maintain existing log levels (info/error)
