# Proposal: Replace `process.env` with Worker Bindings in Request Path

## Problem Description

### The Issue

The codebase currently uses `process.env` to access environment variables in multiple locations that execute during request handling. This is problematic for Cloudflare Workers because:

1. **`process.env` is a Node.js construct, not a Worker construct.** In the Cloudflare Worker runtime, environment variables and secrets are exposed through **bindings** (`c.env` in Hono, or the `env` parameter in the Worker fetch handler), not through `process.env`.

2. **Wrangler shimming is development-only.** During local development, Wrangler provides a compatibility shim that populates `process.env` from `.dev.vars` and `wrangler.jsonc`. However, in deployed Workers, this shim may not behave identically, and relying on it for production is fragile.

3. **Secrets may become `undefined` in production.** If `BETTER_AUTH_SECRET` is accessed via `process.env` in a deployed Worker and the shim doesn't populate it correctly, the auth system may initialize with an undefined secret—creating a critical security vulnerability or runtime crash.

4. **Configuration reads at module initialization time are problematic.** Some `process.env` reads happen at the top level of modules (e.g., `src/index.ts` route registration, `src/lib/auth.ts` origin configuration). Worker modules are instantiated once and reused across requests, but bindings are only available per-request via the context.

### Affected Locations

| File                                | Variable(s)                                             | Context                          |
| ----------------------------------- | ------------------------------------------------------- | -------------------------------- |
| `src/index.ts`                      | `SIGN_UP_MODE`, `ALTERNATE_ORIGIN`, env validation loop | Route registration & CSRF origin |
| `src/lib/auth.ts`                   | `BETTER_AUTH_SECRET`, `ALTERNATE_ORIGIN`                | Auth secret & trusted origins    |
| `src/lib/send-email.ts`             | `SMTP_SERVER_*`                                         | Email configuration              |
| `src/routes/auth/build-sign-in.tsx` | `SIGN_UP_MODE`                                          | Conditional UI rendering         |
| `src/routes/test/sign-up-mode.ts`   | `SIGN_UP_MODE`                                          | Test endpoint                    |

### Why This Matters

- **Security risk**: If `BETTER_AUTH_SECRET` is `undefined`, session tokens may be signed with a predictable or empty key.
- **Correctness risk**: Route registration based on `SIGN_UP_MODE` happens at module load time. If the mode isn't correctly sourced, the wrong routes may be registered (or missing).
- **Reliability risk**: The application may work locally but fail in production due to differences in how `process.env` is shimmed.

## Proposed Solution

### Design Principles

1. **All runtime configuration must come from Worker bindings (`c.env`).**
2. **Reserve `process.env` for build-time tooling only** (scripts, migrations, non-Worker contexts).
3. **Configuration that affects route registration must be handled carefully** since it happens at module load time before any request context exists.

### Implementation Strategy

#### Phase 1: Request-Path Configuration (Must Fix)

These are the highest priority because they affect security and correctness during request handling.

##### 1.1 Fix `src/lib/auth.ts` — Pass bindings to `createAuth()`

**Current code:**

```typescript
secret: process.env.BETTER_AUTH_SECRET,
```

**Proposed change:**

- Modify `createAuth()` to accept an `env: Bindings` parameter.
- Pass `env.BETTER_AUTH_SECRET` instead of `process.env.BETTER_AUTH_SECRET`.
- Update all call sites to pass `c.env`.

```typescript
export const createAuth = (env: Bindings, db: DrizzleClient) => {
  return betterAuth({
    // ...
    secret: env.BETTER_AUTH_SECRET,
  })
}
```

##### 1.2 Fix `src/lib/send-email.ts` — Pass bindings to `sendEmail()`

**Current code:**

```typescript
const port = process.env.SMTP_SERVER_PORT
const host = process.env.SMTP_SERVER_HOST
// etc.
```

**Proposed change:**

- Add an `env: Bindings` parameter to `sendEmail()`.
- Access SMTP configuration from `env.*`.

```typescript
export const sendEmail = async (
  env: Bindings,
  to: string,
  subject: string,
  content: string
): Promise<void> => {
  const port = env.SMTP_SERVER_PORT
  const host = env.SMTP_SERVER_HOST
  // ...
}
```

##### 1.3 Fix `src/routes/test/sign-up-mode.ts` — Use `c.env`

**Current code:**

```typescript
const currentMode = process.env.SIGN_UP_MODE || SIGN_UP_MODES.NO_SIGN_UP
```

**Proposed change:**

```typescript
const currentMode = c.env.SIGN_UP_MODE || SIGN_UP_MODES.NO_SIGN_UP
```

#### Phase 2: Route Registration Configuration (Architectural Change)

The route registration in `src/index.ts` uses `process.env.SIGN_UP_MODE` at module load time to decide which routes to register. This is problematic because:

- Bindings (`c.env`) are not available at module load time.
- Route registration happens once when the module is first imported.

**Options:**

##### Option A: Move to Wrangler `vars` (Recommended for this project)

Configure `SIGN_UP_MODE` as a Wrangler var in `wrangler.jsonc`:

```jsonc
{
  "vars": {
    "SIGN_UP_MODE": "OPEN_SIGN_UP",
  },
}
```

Then access it via `c.env.SIGN_UP_MODE` in request handlers.

For route registration, since it happens at module load time, we have two sub-options:

**A1: Register all routes, guard at runtime**

Register all sign-up route handlers unconditionally, but add a runtime guard that returns 404 if the mode doesn't match:

```typescript
// Register all routes
buildSignUp(app)
buildGatedSignUp(app)
buildInterestSignUp(app)
// etc.

// In each handler, check mode:
app.get(PATHS.AUTH.SIGN_UP, async (c) => {
  if (c.env.SIGN_UP_MODE !== SIGN_UP_MODES.OPEN_SIGN_UP) {
    return build404Page(c)
  }
  // ... render sign-up page
})
```

**A2: Lazy route registration on first request (Complex)**

Use a middleware that checks if routes are registered and registers them on the first request when `c.env` is available. This is more complex and not recommended.

##### Option B: Keep `process.env` for route registration, validate at startup

If `process.env` is reliably populated by Wrangler in production (via `.dev.vars` equivalent or Wrangler secrets), you could keep the current approach but add validation. However, this is fragile and not recommended.

#### Phase 3: UI Conditional Rendering

`src/routes/auth/build-sign-in.tsx` uses `process.env.SIGN_UP_MODE` in JSX to conditionally render the "Create Account" link.

**Proposed change:**

- Pass the sign-up mode as a parameter to the render function.
- The route handler reads `c.env.SIGN_UP_MODE` and passes it to the renderer.

```typescript
const renderSignIn = (signUpMode: string) => {
  return (
    // ...
    {signUpMode !== SIGN_UP_MODES.NO_SIGN_UP && (
      // render sign-up link
    )}
  )
}

// In route handler:
const signUpMode = c.env.SIGN_UP_MODE || SIGN_UP_MODES.NO_SIGN_UP
return c.render(useLayout(c, renderSignIn(signUpMode)))
```

## Implementation Checklist

### Phase 1: Request-Path Fixes (P0 — Security Critical)

- [ ] Update `src/lib/auth.ts`:
  - [ ] Add `env: Bindings` parameter to `createAuth()`.
  - [ ] Replace `process.env.BETTER_AUTH_SECRET` with `env.BETTER_AUTH_SECRET`.
  - [ ] Replace `process.env.ALTERNATE_ORIGIN` with `env.ALTERNATE_ORIGIN`.
- [ ] Update all `createAuth()` call sites to pass `c.env`:
  - [ ] `src/index.ts` (middleware and interceptor)
  - [ ] `src/routes/auth/handle-sign-out.ts`
  - [ ] `src/routes/auth/handle-sign-up.ts`
  - [ ] `src/routes/auth/handle-gated-sign-up.ts`
  - [ ] `src/routes/auth/handle-interest-sign-up.ts`
  - [ ] `src/routes/auth/handle-gated-interest-sign-up.ts`
  - [ ] `src/routes/auth/handle-resend-email.ts`
  - [ ] `src/routes/auth/handle-forgot-password.ts`
  - [ ] `src/routes/auth/handle-reset-password.ts`
  - [ ] `src/routes/auth/build-email-confirmation.tsx`
  - [ ] `src/routes/profile/handle-change-password.ts`
  - [ ] `src/routes/profile/handle-delete-account.ts`
- [ ] Update `src/lib/send-email.ts`:
  - [ ] Add `env: Bindings` parameter to `sendEmail()`.
  - [ ] Replace `process.env.SMTP_SERVER_*` with `env.SMTP_SERVER_*`.
- [ ] Update all `sendEmail()` call sites to pass `env`.
- [ ] Update `src/routes/test/sign-up-mode.ts`:
  - [ ] Replace `process.env.SIGN_UP_MODE` with `c.env.SIGN_UP_MODE`.

### Phase 2: Route Registration (P1 — Correctness)

- [ ] Add `SIGN_UP_MODE` to `wrangler.jsonc` vars.
- [ ] Choose and implement route guarding strategy:
  - [ ] Option A1 (recommended): Register all routes, add runtime mode guards.
  - [ ] Create a `guardSignUpMode(mode: string)` middleware helper.
- [ ] Update `src/index.ts` to remove `process.env.SIGN_UP_MODE` conditionals.

### Phase 3: UI Rendering (P2 — Cleanup)

- [ ] Update `src/routes/auth/build-sign-in.tsx`:
  - [ ] Accept `signUpMode` as a parameter to render function.
  - [ ] Pass `c.env.SIGN_UP_MODE` from route handler.
- [ ] Apply same pattern to any other UI that conditionally renders based on env.

### Phase 4: Validation & Cleanup

- [ ] Update env validation in `src/index.ts` to use bindings, not `process.env`.
- [ ] Remove or mark as `// PRODUCTION:REMOVE` any remaining `process.env` reads.
- [ ] Update `.windsurfrules.md` or README with guidance on env access.

## Risks and Mitigations

| Risk                                   | Mitigation                                                    |
| -------------------------------------- | ------------------------------------------------------------- |
| Breaking existing functionality        | Run full e2e test suite after each phase                      |
| Missing call sites                     | Use `grep -r "process.env"` to find all usages                |
| Runtime errors from undefined bindings | Add validation middleware that checks required bindings early |
| Complex refactor of route registration | Phase 2 can be done incrementally; start with runtime guards  |

## Testing Strategy

1. After Phase 1: Run all auth-related e2e tests.
2. After Phase 2: Run full test suite with different `SIGN_UP_MODE` values.
3. Manual verification: Deploy to a staging Worker and verify auth works correctly.

## References

- [Cloudflare Workers Environment Variables](https://developers.cloudflare.com/workers/configuration/environment-variables/)
- [Cloudflare Workers Secrets](https://developers.cloudflare.com/workers/configuration/secrets/)
- [Hono Environment Variables in Cloudflare Workers](https://hono.dev/docs/getting-started/cloudflare-workers#bindings)
