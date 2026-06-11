# types.d.ts

**Source:** `src/types.d.ts`

## Purpose

Ambient type declarations for Cloudflare Workers bindings and Hono context variables.

## Types

### `Bindings` interface

- `PROJECT_DB: D1Database` — D1 database binding

### Hono `ContextVariableMap` augmentation

- `db: DrizzleD1Database<typeof schema>` — Drizzle database client
- `user: AuthUser | null` — authenticated user from Better Auth
- `session: AuthSession | null` — auth session
- `authSession: AuthSessionResponse | null` — auth session response
- `signInEmail?: string` — email being used for sign-in flow

---

See [source-code.md](../source-code.md) for the full catalog.