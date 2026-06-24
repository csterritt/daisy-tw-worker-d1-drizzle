# db-access-retry.spec.ts

**Source:** `tests/db-access-retry.spec.ts`

## Purpose

Tests the retry wrapper logic from `db-access.ts`. Exercises `withRetry` with `true-myth` Result types.

## Key logic tested

### `withRetry(operationName, operation)`

- Returns success immediately when the operation succeeds on the first try
- Retries on `Result.err` and eventually succeeds after transient failures
- Returns `Result.err` after exhausting all retries (1 initial + 5 retries = 6 total calls, per `STANDARD_RETRY_OPTIONS.retries`)
- Retries on thrown exceptions (not just `Result.err`)
- Preserves the original error object after retries exhaust

## Dependencies

- `src/lib/db-access` — `withRetry`
- `src/constants` — `STANDARD_RETRY_OPTIONS`
- `true-myth/result`

---

See [unit-tests.md](../unit-tests.md) for the full catalog.
