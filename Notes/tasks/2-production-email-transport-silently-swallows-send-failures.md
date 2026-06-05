# Production email transport silently swallows send failures

**`src/lib/email-service.ts:101-122`**

The production `sendMail` implementation calls `fetch(env.EMAIL_SEND_URL, ...)` but **never checks the response status**. If the email API returns a 4xx/5xx, `fetch` still resolves successfully — so `sendConfirmationEmail` (line 179) and `sendPasswordResetEmail` (line 249) both proceed to log "email sent successfully" and return without throwing.

This means confirmation and password-reset emails can silently fail in production while the user is told to "check your inbox."

## Recommendation

Check `response.ok` (or at minimum `response.status`) and throw on non-2xx:

```ts
const response = await fetch(env.EMAIL_SEND_URL, { ... })
if (!response.ok) {
  throw new Error(`Email API returned ${response.status}: ${await response.text()}`)
}
return response
```

## Decision:

Implement the recommendation to check `response.ok` and throw on non-2xx.

Add test(s) to verify the error is thrown on non-2xx.
