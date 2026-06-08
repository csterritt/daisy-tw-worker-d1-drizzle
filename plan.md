# Fix: Invite codes burned on duplicate-email gated sign-up

## Problem

In `processGatedSignUp` (`src/lib/sign-up-utils.ts:341-345`), when Better Auth returns a synthetic duplicate-account response and `userAlreadyExists` is true, the handler redirects to the await-verification page without calling `releaseClaimedCode()`. This permanently consumes the invite code even though no new account was created, allowing an attacker to exhaust invitation codes by submitting with known existing emails.

## Assumptions

- No database schema changes are needed; the fix is purely in application logic.
- The existing `releaseClaimedCode()` helper already handles the DB release correctly.

## Plan

1. **Update failing test (Red)** — Change `e2e-tests/gated-sign-up/05-code-consumption-semantics.spec.ts` test "code IS consumed when sign-up fails due to duplicate email" to expect the code is NOT consumed (`existsAfter toBe true`), and update the test name/comment accordingly.
2. **Fix the bug (Green)** — Add `await releaseClaimedCode()` before the redirect in the `userAlreadyExists` branch (`src/lib/sign-up-utils.ts:343-344`).
3. **Verify** — Run all tests to confirm fix is correct and no regressions.

## Pitfalls

- **Both branches of `isSyntheticDuplicateResponse`** — The `userAlreadyExists` branch needs the release; the non-`userAlreadyExists` branch (genuine duplicate from a race) should also be considered, but per the task only the `userAlreadyExists` path is the documented vulnerability.
