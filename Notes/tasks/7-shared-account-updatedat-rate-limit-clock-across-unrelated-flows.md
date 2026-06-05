# Shared `account.updatedAt` rate-limit clock across unrelated flows

**`src/routes/auth/handle-forgot-password.ts:46-56`, `src/routes/auth/handle-resend-email.ts:90-103`, `src/lib/sign-up-utils.ts:304`**

Password reset, resend-verification, and post-sign-up all write to `account.updatedAt` as a rate-limiting timestamp. Additionally, better-auth itself may update `account.updatedAt` when it touches the account row (e.g., during password change).

This coupling means: (a) resending a verification email resets the user's password-reset rate-limit timer and vice versa, (b) better-auth internal account updates can spuriously trigger rate-limiting for the user on unrelated flows.

## Recommendation

Introduce a dedicated column (or separate table) per rate-limited action — e.g., `lastResetEmailAt`, `lastVerificationEmailAt` — to decouple the timers.

## Decision:

Implement the recommendation to introduce a dedicated column (or separate table) per rate-limited action — e.g., `lastResetEmailAt`, `lastVerificationEmailAt` — to decouple the timers.
