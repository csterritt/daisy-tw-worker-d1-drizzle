# Invite codes can be burned by attempting gated sign-up with an existing email

**Priority:** High

**Location:** `src/lib/sign-up-utils.ts:286-356`, especially `src/lib/sign-up-utils.ts:341-345`; codified by `e2e-tests/gated-sign-up/05-code-consumption-semantics.spec.ts:71-97`

**Problem:** `processGatedSignUp` claims a single-use code before account creation. If Better Auth returns the synthetic duplicate-account response and `userAlreadyExists` is true, the handler redirects without calling `releaseClaimedCode()`. This lets anyone who knows or guesses an existing account email consume valid invite codes without creating an account.

**Impact:** Availability/security issue for invite-only flows. An attacker can exhaust invitation codes and deny legitimate users access.

**Recommendation:** Release the claimed code for duplicate-account outcomes. Update the e2e test that currently expects duplicate-email failures to consume the code.
