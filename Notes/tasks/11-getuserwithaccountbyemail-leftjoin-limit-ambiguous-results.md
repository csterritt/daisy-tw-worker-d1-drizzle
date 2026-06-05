# `getUserWithAccountByEmail` leftJoin + limit(1) may produce ambiguous results

**`src/lib/db-access.ts:86-98`**

If a user has multiple account rows (e.g., multiple auth providers in the future), the query picks one arbitrarily. The `accountUpdatedAt` used for rate-limiting may come from a stale row.

## Recommendation

If multi-provider is planned, scope the join to `providerId = 'credential'`.

## Decision:

Implement the recommendation to scope the join to `providerId = 'credential'`.
