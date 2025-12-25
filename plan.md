# Fix: Gated-code consumption semantics on failed sign-up

## Problem

In `src/routes/auth/handle-gated-sign-up.ts`, the single-use sign-up code is consumed (deleted from DB) **before** the user account is created:

```typescript
// Line 55: Code is consumed FIRST
const codeResult = await consumeSingleUseCode(dbClient, trimmedCode)

// Line 81: Account creation happens AFTER
const signUpResponse = await auth.api.signUpEmail({ ... })
```

If account creation fails (e.g., Better Auth error, duplicate email, network issue), the code is already gone. The user loses their invite code with no way to recover it.

### Current behavior

- Code consumed → Account creation fails → **Code is lost forever**

### Impact

- Users with valid codes may be unable to sign up if there's a transient failure
- Codes are a limited resource (presumably issued manually or via invitation system)
- Poor UX: user must request a new code

## Options

### Option A: Consume-after-success (rollback semantics)

Only delete the code after successful account creation.

**Pros**: User can retry with same code if sign-up fails  
**Cons**: Race condition window where same code could be used twice concurrently

### Option B: Keep current behavior + document (consume-first semantics)

Keep the current "consume first" approach but document it clearly.

**Pros**: Strong single-use guarantee, no race conditions  
**Cons**: Codes can be "lost" on transient failures

### Option C: Two-phase approach

1. Mark code as "pending" (add a `usedAt` timestamp but don't delete)
2. Create account
3. Delete code on success, or clear `usedAt` on failure

**Pros**: Best of both worlds  
**Cons**: More complex, requires schema change

## Recommended approach: Option A

Move code consumption after successful account creation. The race condition risk is low (requires exact same code submitted at exact same moment) and can be mitigated by:

- The account creation itself will fail for the second request (duplicate email)
- Add a brief delay or use optimistic locking if needed

## Implementation steps

1. In `handle-gated-sign-up.ts`:
   - Change `consumeSingleUseCode` to `validateSingleUseCode` (check existence without deleting)
   - Move the actual consumption to after successful `signUpEmail` call
2. In `handle-gated-interest-sign-up.ts`:
   - Apply the same pattern

3. In `lib/db-access.ts`:
   - Add `validateSingleUseCode` function (SELECT without DELETE)
   - Keep `consumeSingleUseCode` for the post-success deletion

4. Add/update tests:
   - Test that code is NOT consumed if sign-up fails
   - Test that code IS consumed after successful sign-up
