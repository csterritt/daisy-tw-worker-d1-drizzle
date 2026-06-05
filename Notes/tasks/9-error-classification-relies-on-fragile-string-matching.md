# Error classification relies on fragile string matching

**`src/routes/auth/handle-reset-password.ts:64-68`, `src/routes/profile/handle-change-password.ts:86-90`**

Errors are classified by checking `message.includes('password')`, `.includes('invalid')`, etc. If better-auth ever changes wording or localizes messages, these branches silently fall through to a generic error.

## Recommendation

Where possible, match on error codes or error types rather than message substrings.

## Decision:

Ignore this. The error classification is not critical and can be improved in the future if needed.
