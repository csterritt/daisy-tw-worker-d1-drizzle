# db-access-retry.spec.ts

`tests/db-access-retry.spec.ts`

Tests database access retry logic (src/lib/db-access.ts). Validates that transient D1 failures are retried up to the configured limit and that permanent failures bubble up correctly.

---

See [unit-tests.md](../unit-tests.md) for the full catalog.
