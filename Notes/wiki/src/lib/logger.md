# logger.ts

**Source:** `src/lib/logger.ts`

## Purpose

Structured logging utility that redacts sensitive user data. Provides JSON-formatted log output with automatic sanitization of sensitive fields.

## Exports

### `sanitizeError(error): Record<string, unknown>`

Sanitizes an error object for safe logging:
- For `Error` instances: returns `{ name, message, stack }` (stack only in non-production)
- For plain objects: redacts keys containing `password`, `token`, `secret`, `key`, `email`, `authorization`
- For other values: returns `{ value: String(error) }`

### `logInfo(message, context): void`

Logs an info-level message with structured context as JSON.

### `logError(message, context): void`

Logs an error-level message with structured context as JSON.

### `logWarn(message, context): void`

Logs a warning-level message with structured context as JSON.

---

See [source-code.md](../../source-code.md) for the full catalog.
