# Dead code: `send-email.ts` and `po-notify.ts`

`sendEmail`, `sendOtpToUserViaEmail`, and `pushoverNotify` are exported but never imported/used anywhere in the codebase. Additionally, `sendOtpToUserViaEmailActual` (send-email.ts:112) incorrectly throws a `Result.err(...)` object instead of an `Error`, which would confuse async-retry.

## Recommendation

Remove dead modules, or mark them as intentionally retained for future use.

## Decision:

Mark the dead modules as intentionally retained for future use.
