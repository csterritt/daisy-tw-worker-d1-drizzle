# Destructive test routes protected only by env variable gating

**`src/routes/test/database.ts:25-34` (DELETE /test/database/clear wipes all data)**

The test endpoint that nukes the entire database (`session`, `account`, `user`, `singleUseCode`, `interestedEmail`) is protected solely by the `isTestRouteEnabled` guard, which returns `true` if `NODE_ENV !== 'production'` AND (`ENABLE_TEST_ROUTES==='true'` OR `PLAYWRIGHT==='1'`). Additionally, CSRF is explicitly skipped for `/test/*` routes (index.ts:118).

If a deployment inadvertently sets NODE_ENV to anything other than `'production'` while also having ENABLE_TEST_ROUTES or PLAYWRIGHT set, these destructive endpoints become accessible without CSRF protection.

## Recommendation

Consider adding a secondary defense: a shared test-secret header check, or IP allowlisting in the test-route middleware, so a single misconfigured env var isn't sufficient to expose DB wipe.

## Decision:

Ignore this. The test routes are only available in non-production environments and are protected by the `isTestRouteEnabled` guard. Additionally, CSRF is explicitly skipped for `/test/*` routes, which is acceptable for test routes.
