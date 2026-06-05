# Email not normalized before app-level DB lookups

**`src/routes/auth/handle-forgot-password.ts:179`, `src/routes/auth/handle-resend-email.ts:46`, `src/lib/sign-up-utils.ts:304`**

better-auth internally normalizes emails to lowercase when storing users, but the app's own database queries (`getUserWithAccountByEmail`, `getUserIdByEmail`, `updateAccountTimestampAfterSignUp`) pass the raw, un-trimmed, mixed-case form input directly. SQLite text comparison is case-sensitive by default.

Result: a user who signed up with `"User@Example.com"` (stored as `"user@example.com"` by better-auth) cannot successfully trigger forgot-password or resend-verification if they type `"User@Example.com"` or `" user@example.com "` — they silently get the "if account exists" message without any email being sent. The interest-sign-up handlers correctly do `.trim().toLowerCase()` but the others do not.

## Recommendation

Normalize email to `email.trim().toLowerCase()` at the top of every POST handler before passing to DB queries. Consider a shared helper.

## Decision:

Implement the recommendation to normalize email to `email.trim().toLowerCase()` at the top of every POST handler before passing to DB queries.

Add test(s) to verify the normalization works correctly.
