# better-auth-handler.ts

**Source:** `src/routes/auth/better-auth-handler.ts`

## Purpose

Mounts the Better Auth API handler (`/api/auth/*`) and sets up the session/user context injection middleware.

## Exports

### `setupBetterAuth(app): void`

Registers a catch-all route at `/api/auth/*` that:

1. Calls `createAuth(c.env)` (fresh auth instance per request)
2. Delegates to `auth.handler(c.req.raw)` — Better Auth's native request handler
3. Returns 500 on error

### `setupBetterAuthMiddleware(app): void`

Global middleware that runs `auth.api.getSession()` on every request and injects the result into the Hono context:

- `user` — `session.user`
- `session` — `session.session`
- `authSession` — full `{ user, session }`

Sets `user`, `session`, and `authSession` to `null` when no session exists or on error.

## Cross-references

- [lib/auth.md](../../lib/auth.md) — `createAuth`
- [index.md](../../index.md) — middleware chain registration order

---

See [source-code.md](../../../source-code.md) for the full catalog.
