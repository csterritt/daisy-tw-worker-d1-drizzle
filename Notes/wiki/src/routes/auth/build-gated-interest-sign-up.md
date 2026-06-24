# build-gated-interest-sign-up.tsx

**Source:** `src/routes/auth/build-gated-interest-sign-up.tsx`

## Purpose

Combined sign-up page (`/auth/sign-up`). Active in `INTEREST_SIGN_UP` mode when gated codes are also available. Contains both the gated sign-up form (with code) and the interest/waitlist form on the same page.

## Export

### `buildGatedInterestSignUp(app): void`

Route: `GET /auth/sign-up`

### Behavior

1. Authenticated users are redirected to `/private` with `'You are already signed in.'`
2. Renders the combined form

### Page layout

- Card with `data-testid='sign-up-page-banner'`, title "Create Account"
- Description text about having a sign-up code or joining the waitlist
- **"Sign Up with Code"** section with `<GatedSignUpForm />` component
- **Divider** (`OR`)
- **"Join the Waitlist"** section:
  - Email field — `data-testid='interest-email-input'`
  - Submit button — `data-testid='interest-action'` (text: "Join Waitlist")
  - Form has `noValidate` set

### Navigation

- "Sign In Instead" link — `data-testid='go-to-sign-in-action'`

## Cross-references

- [components/gated-sign-up-form.md](../../components/gated-sign-up-form.md)
- [handle-gated-interest-sign-up.md](handle-gated-interest-sign-up.md) — POST handler

---

See [source-code.md](../../../source-code.md) for the full catalog.
