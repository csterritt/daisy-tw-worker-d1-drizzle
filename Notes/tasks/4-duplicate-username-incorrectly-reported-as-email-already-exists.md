# Duplicate username incorrectly reported as "email already exists"

**`src/lib/sign-up-utils.ts:32-43, 129-132, 191-196`**

The `user.name` column has a UNIQUE constraint. If a sign-up attempt uses a name that's already taken (but a novel email), the resulting SQLITE_CONSTRAINT error matches `isConstraintError` patterns, causing the generic handler to display: *"An account with this email already exists."* This is factually wrong (the email is new; the name is duplicate), confuses users, and indirectly reveals that a name is taken.

## Recommendation

Inspect the constraint error message to distinguish name vs. email uniqueness violations and show an appropriate message ("That display name is already in use").

## Decision:

Implement the recommendation to inspect the constraint error message to distinguish name vs. email uniqueness violations and show an appropriate message ("That display name is already in use").

Add test(s) to verify the correct message is shown for duplicate username.
