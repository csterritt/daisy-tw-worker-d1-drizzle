# Fix: Waitlist insert race window

## Problem

In `src/lib/db-access.ts`, the `addInterestedEmailActual` function has a race condition:

```typescript
const addInterestedEmailActual = async (db, email) => {
  // Step 1: Check if email exists
  const existingEmails = await db
    .select()
    .from(interestedEmails)
    .where(eq(interestedEmails.email, email))

  if (existingEmails.length > 0) {
    return Result.ok(false) // Already exists
  }

  // RACE WINDOW: Another request could insert the same email here

  // Step 2: Insert the email
  await db.insert(interestedEmails).values({ email })
  return Result.ok(true)
}
```

Between the SELECT and INSERT, another concurrent request could insert the same email, causing:

- A unique constraint violation error
- The function returns an error instead of gracefully handling "already exists"

## Current schema

The `interestedEmails` table already has a unique constraint on `email` (it's the primary key):

```typescript
export const interestedEmails = sqliteTable('interestedEmails', {
  email: text('email').primaryKey().unique(),
})
```

## Solution: Insert-first approach

Instead of check-then-insert, use insert-first and catch the unique constraint error:

```typescript
const addInterestedEmailActual = async (db, email) => {
  try {
    await db.insert(interestedEmails).values({ email })
    return Result.ok(true) // Successfully added
  } catch (e) {
    // Check if it's a unique constraint violation
    if (isUniqueConstraintError(e)) {
      return Result.ok(false) // Already exists - not an error
    }
    return Result.err(e instanceof Error ? e : new Error(String(e)))
  }
}
```

This approach:

- Eliminates the race window entirely
- Uses the database's atomicity guarantees
- Is actually simpler (one query instead of two)
- Handles concurrent requests correctly

## Implementation steps

1. In `lib/db-access.ts`:
   - Add helper function `isUniqueConstraintError` to detect SQLite unique constraint errors
   - Rewrite `addInterestedEmailActual` to insert first, catch unique constraint as "already exists"

2. Test the change:
   - Existing tests should still pass
   - The behavior is the same from the caller's perspective
