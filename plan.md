# Fix: handleResendEmail callback URL construction

## Problem

In `src/routes/auth/handle-resend-email.ts` (line 126), the callback URL is constructed using string splitting:

```typescript
callbackURL: `${c.req.url.split('/')[0]}//${c.req.url.split('/')[2]}${PATHS.AUTH.SIGN_IN}`,
```

This approach is brittle because:

- It assumes a specific URL structure (scheme at index 0, host at index 2)
- It can break with query strings, ports, or unexpected path formats
- It's harder to read and maintain

## Solution

Replace with the standard `URL` API:

```typescript
callbackURL: `${new URL(c.req.url).origin}${PATHS.AUTH.SIGN_IN}`,
```

This is:

- More robust (handles all valid URL formats correctly)
- Clearer in intent
- Standard JavaScript API

## Steps

1. Edit `src/routes/auth/handle-resend-email.ts` line 126
2. Replace the split-based construction with `new URL(c.req.url).origin`
3. Run existing tests to verify no regressions
