# Fix: Retry wrapper doesn't actually retry on Result failures

## Problem

`async-retry` only retries when the operation **throws**. Our DB operations return `Result.err()` on failure (no throw), so `withRetry` sees a resolved promise and never retries.

## Assumptions

- Fix at the `withRetry` level (not lower-level DB calls).
- Retry all errors for now; transient-error filtering can be added later.
- Add a basic unit test for retry behavior.

## Plan

1. **Modify `withRetry`** — Inside the retry callback, check if the result is `Result.err`; if so, throw the error so `async-retry` sees it and retries.
2. **Wrap final error** — After retries exhaust, catch the thrown error and return `Result.err`.
3. **Add unit test** — Confirm that transient failures trigger retries and eventually succeed or fail after max attempts.

## Pitfalls

- **Non-transient errors waste retries** — e.g., "unique constraint violated" shouldn't retry. Consider filtering later.
- **Double-wrapping errors** — Ensure the final `Result.err` contains the original error, not a nested wrapper.
- **Test isolation** — Mock the DB with a counter to simulate transient failures; avoid real DB calls in unit tests.
