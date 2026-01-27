# Fix: Atomic Sign-Up Code Consumption

## Problem

Gated sign-up codes are not consumed atomically. The current flow:

1. `validateSingleUseCode` (SELECT) - checks code exists
2. `signUpEmail` - creates account
3. `consumeSingleUseCode` (DELETE) - removes code

Race condition: Two concurrent requests can both pass step 1 before either reaches step 3.

## Solution

Use an atomic UPDATE with a "claimed by email" pattern instead of SELECT + DELETE.

## Plan

### 1. Schema Change

Add `email` column to `singleUseCode` table:

- Type: `text`, nullable, default `null`
- `null` = unclaimed, non-null = claimed by that email

### 2. New DB Function

Create `claimSingleUseCode(db, code, email)` in `db-access.ts`:

```sql
UPDATE singleUseCode SET email = ? WHERE code = ? AND email IS NULL
```

- Returns `true` if `rowsAffected === 1` (this request won the race)
- Returns `false` if `rowsAffected === 0` (code invalid or already claimed)

### 3. Update Handlers

Modify `handle-gated-sign-up.ts` and `handle-gated-interest-sign-up.ts`:

- Replace `validateSingleUseCode` + `consumeSingleUseCode` with single `claimSingleUseCode` call
- Claim the code **before** calling `auth.api.signUpEmail`
- If claim fails → reject with "invalid or expired code" message

### 4. Remove Dead Code

- Remove `validateSingleUseCode` export (no longer needed)
- Keep `consumeSingleUseCode` if used elsewhere, or remove

## Files to Modify

- `src/db/schema.ts` - add email column
- `src/lib/db-access.ts` - add `claimSingleUseCode`, remove/deprecate `validateSingleUseCode`
- `src/routes/auth/handle-gated-sign-up.ts` - use new atomic claim
- `src/routes/auth/handle-gated-interest-sign-up.ts` - use new atomic claim

## Pitfalls

- **Burned codes on sign-up failure**: If claim succeeds but `signUpEmail` fails, code is consumed. Accept this or add rollback logic.
- **Migration**: Run `drizzle-kit generate` after schema change to create migration.
- **Existing codes**: Will have `email = NULL`, which is correct (unclaimed).
