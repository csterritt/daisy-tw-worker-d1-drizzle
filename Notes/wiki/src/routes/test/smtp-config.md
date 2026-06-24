# smtp-config.ts

**Source:** `src/routes/test/smtp-config.ts`

## Purpose

Dev-only test endpoint for SMTP configuration. Mounted at `/test`.

## Exports

### `getTestSmtpConfig()`

Returns the current test SMTP config override (`{ host?, port? }` or `null`). Used by `email-service.ts` to check for test overrides.

### `testSmtpRouter`

Hono sub-router with routes:

| Method | Path                 | Purpose                                          |
| ------ | -------------------- | ------------------------------------------------ |
| `POST` | `/set-smtp-config`   | Overrides SMTP host/port for testing (JSON body) |
| `POST` | `/reset-smtp-config` | Clears the SMTP config override                  |

Mounted at `/test` in `index.ts`.

## Cross-references

- [e2e-tests/support/email-helpers.md](../../../e2e-tests/support/email-helpers.md) — helpers that call these endpoints

---

See [source-code.md](../../../source-code.md) for the full catalog.
