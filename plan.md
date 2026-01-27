# Fix: Type safety gaps (`any`/casts) reduce maintainability

## Problem

Several helpers use `Context<any, any, any>` and `as any` casts, undermining TypeScript's strict typing:

- `cookie-support.ts` — `Context<E, any, any>` in all three functions
- `redirects.tsx` — `Context<any, any, any>` in both redirect functions
- `handle-interest-sign-up.ts` — `(body as any)?.email` cast

## Assumptions

- Use existing `AppContext` type from `local-types.ts` where full context is needed.
- For generic helpers (cookies, redirects), use a minimal generic constraint that works across all callers.
- The `body as any` cast can be replaced with proper type narrowing or a typed form body interface.

## Plan

1. **Update `cookie-support.ts`** — Replace `Context<E, any, any>` with `Context<E>` (Hono allows partial generics).
2. **Update `redirects.tsx`** — Replace `Context<any, any, any>` with a generic `Context<E>` or use `AppContext`.
3. **Fix `handle-interest-sign-up.ts`** — Replace `(body as any)?.email` with proper type guard or typed access.
4. **Verify** — Run `tsc --noEmit` to confirm no type errors.

## Pitfalls

- **Generic constraints too strict** — If callers have different context shapes, overly strict types will break compilation. Use minimal constraints.
- **Hono's Context generics** — Hono's `Context<E, P, I>` has 3 type params (Env, Path, Input). Using `Context<E>` with defaults should work.
