# Missing environment variables logged but app still serves requests

**`src/index.ts:59-96`**

`validateEnvironmentVariables()` checks 7 required vars at startup. If any are missing it logs an error repeatedly but does **not** throw or prevent the app from running. Requests will reach route handlers that depend on these vars (e.g., `EMAIL_SEND_URL`, `CLOUDFLARE_D1_TOKEN`) and fail unpredictably at runtime.

The runtime middleware (`validateEnvBindings`) only enforces 2 of the 7 vars (`BETTER_AUTH_SECRET`, `SIGN_UP_MODE`).

## Recommendation

Either add the remaining critical bindings to the runtime middleware, or make the startup validation actually halt (`throw new Error(...)`) when required vars are missing.

## Decision:

Ignore this. There is no way to stop the app from starting if environment variables are missing.
