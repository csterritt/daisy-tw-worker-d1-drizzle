# Single-use code consumed before account creation; no rollback on failure

**`src/lib/sign-up-utils.ts:252-306`**

In `processGatedSignUp`, the single-use code is atomically claimed (line 253) *before* the call to `auth.api.signUpEmail`. If account creation subsequently fails — duplicate email (synthetic response at 291), error response (285), non-200 status (297), or thrown exception (300) — the code has already been permanently consumed (email column set), but no new account was created.

This means a legitimate gated user who happens to supply a pre-existing email address, or who hits a transient error, loses their one-time invite code with no recovery path.

## Recommendation

Either (a) move the code-claim step to *after* successful account creation, or (b) release the code on failure by executing `UPDATE singleUseCode SET email = NULL WHERE code = ? AND email = ?` in the error/catch branches.

## Decision:

Implement option (b) - release the code on failure by executing `UPDATE singleUseCode SET email = NULL WHERE code = ? AND email = ?` in the error/catch branches.

Add test(s) to verify the code is released on failure.
