# Web Application Code Review Template

This document outlines a thorough code review process focusing on **safety**, **consistency**, and **resilience**.

---

## 1. Routing & Endpoint Security

### 1.1 Route Registration Audit

- [ ] Verify all routes in main entry file are intentionally exposed
- [ ] Confirm development/test routes are stripped in production builds
- [ ] Check that 404 handler is registered last to catch unmatched routes
- [ ] Review route path constants for consistency

### 1.2 Authentication & Authorization

- [ ] Audit authentication middleware:
  - Checks both user and session from context
  - Redirects to sign-in with error message if not authenticated
  - Sets appropriate cache headers for authenticated pages
- [ ] Review all protected routes use authentication middleware consistently
- [ ] Verify user ID parameter validation prevents IDOR attacks

### 1.3 CSRF Protection

- [ ] Review CSRF middleware configuration:
  - Applied globally to state-changing endpoints
  - Test endpoint bypass removed in production
  - Origin validation configured correctly
- [ ] Check all POST handlers are covered by CSRF protection

### 1.4 Auth Library Integration

- [ ] Audit auth handler implementation:
  - Session retrieval with proper error handling
  - Error responses don't leak sensitive information
- [ ] Review auth response interceptor:
  - Handles various HTTP status codes appropriately (200, 400, 401, 403, 500+)
  - Email verification flows redirect correctly
  - Form data to JSON conversion for better-auth API
  - Email capture middleware for sign-in requests

---

## 2. Database Access & Data Integrity

### 2.1 Schema Review

- [ ] Audit database schema:
  - Foreign key constraints with appropriate cascade behavior (`onDelete: 'cascade'` on session, account)
  - Indexes defined for query performance
  - Unique constraints on appropriate fields (`user.email`, `session.token`, `singleUseCode.code`, `interestedEmails.email`)
  - Timestamp fields use proper type handling (`mode: 'timestamp'`)
- [ ] Review better-auth compatible tables (`user`, `session`, `account`, `verification`)
- [ ] Review custom tables (`singleUseCode`, `interestedEmails`)

### 2.2 Database Access Layer

- [ ] Review database access module (`lib/db-access.ts`):
  - Retry logic for transient failures (`withRetry` wrapper with `async-retry`)
  - Result type pattern for error handling (`true-myth/result`)
  - Parameterized queries prevent SQL injection (Drizzle ORM)
  - Exception handling converts to Result types (`toResult` wrapper)
- [ ] Audit specific database functions:
  - `getUserWithAccountByEmail` - rate limiting checks
  - `getUserIdByEmail` - user lookup
  - `updateAccountTimestamp` - rate limit tracking
  - `consumeSingleUseCode` - atomic code consumption
  - `addInterestedEmail` / `checkInterestedEmailExists` - waitlist management
- [ ] Check for LIKE wildcard injection in search queries

### 2.3 Transaction Safety

- [ ] Check for race conditions in:
  - Check-then-insert patterns (mitigated by unique constraints?)
  - Read-then-update patterns (acceptable severity?)
  - Atomic operations verify success via row counts
- [ ] Verify atomic operations check affected row counts

### 2.4 Database Client Initialization

- [ ] Review database client creation and middleware:
  - Fresh client created per request
  - Client accessible via context consistently

---

## 3. Input Validation & Sanitization

### 3.1 Validation Schemas

- [ ] Audit all validation schemas (`lib/validators.ts`):
  - `EmailSchema` - pattern, length (1-254 chars)
  - `SignInSchema` - email + password required
  - `SignUpFormSchema` - name (1-100 chars), email, password (8-128 chars)
  - `GatedSignUpFormSchema` - code (8-64 chars), name, email, password
  - `InterestSignUpFormSchema` - email only
  - `ResendEmailFormSchema` - email only
  - `ForgotPasswordFormSchema` - email only
  - `ResetPasswordFormSchema` - token, password, confirmPassword with cross-field validation
  - `ChangePasswordFormSchema` - currentPassword, newPassword, confirmPassword with cross-field validation

### 3.2 Form Data Handling

- [ ] Review form value helper for type safety
- [ ] Check validation return type handling across all handlers
- [ ] Verify all POST handlers validate input before processing

### 3.3 Path Parameter Validation

- [ ] Verify URL path parameters are validated:
  - User IDs checked against authenticated user
  - Resource IDs validated as non-empty
  - Query parameters validated before use

---

## 4. Error Handling & Resilience

### 4.1 Result Type Usage

- [ ] Verify consistent Result type pattern:
  - `.isErr` checked before accessing `.value`
  - `.error` property accessed only after error check
  - Error logging doesn't expose to users

### 4.2 Try-Catch Coverage

- [ ] Review try-catch blocks in:
  - Route handlers (outer try-catch)
  - Database operations
  - Email sending
  - Auth API calls
  - External service calls

### 4.3 Retry Logic

- [ ] Verify retry configuration:
  - Appropriate retry count
  - Timeout values differ for dev/prod
- [ ] Audit which operations use retry logic

### 4.4 Graceful Degradation

- [ ] Check error messages don't leak sensitive information
- [ ] Verify failed operations redirect with user-friendly messages
- [ ] Review rate limiting on sensitive endpoints (password reset, email resend)

---

## 5. Security Headers & Middleware

### 5.1 Security Headers

- [ ] Review security headers configuration:
  - Content Security Policy (CSP)
  - Referrer Policy
  - Permissions Policy
- [ ] Verify security headers middleware applied to all routes
- [ ] Check relaxed security headers are limited to specific routes with justification

### 5.2 Body Limit

- [ ] Review body limit middleware configuration:
  - Applied globally
  - Appropriate limits for dev/prod
  - Error response for oversized requests

### 5.3 Cookie Security

- [ ] Audit cookie options:
  - `httpOnly: true`
  - `sameSite: 'Strict'`
  - `secure: true` in production
- [ ] Review cookie usage for consistency

### 5.4 Cache Control

- [ ] Verify no-cache headers applied to authenticated pages
- [ ] Check no sensitive data is cached

---

## 6. Email & External Services

### 6.1 Email Service

- [ ] Audit email service (`lib/email-service.ts`):
  - Test mode detection logic (`NODE_ENV`, `PLAYWRIGHT`, `process.argv`)
  - Production email endpoint security (Bearer token auth via `EMAIL_SEND_CODE`)
  - Email content XSS review (user name in email templates)
  - TLS settings appropriate for environment (`rejectUnauthorized: false` in test)
- [ ] Review email templates:
  - `sendConfirmationEmail` - verification link, user name
  - `sendPasswordResetEmail` - reset link, user name
- [ ] Verify test SMTP config override mechanism (`getTestSmtpConfig`)

### 6.2 External API Calls

- [ ] Review external API integrations:
  - API keys from environment variables
  - Graceful handling when not configured
  - Development mode skips actual calls
  - Error handling with try-catch
- [ ] Verify API keys not hardcoded

---

## 7. Environment & Configuration

### 7.1 Environment Variables

- [ ] Audit environment validation (`validateEnvironmentVariables` in `index.ts`):
  - Required: `BETTER_AUTH_SECRET`, `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_DATABASE_ID`, `CLOUDFLARE_D1_TOKEN`, `SIGN_UP_MODE`, `EMAIL_SEND_URL`, `EMAIL_SEND_CODE`
  - Startup logs warning if missing (but doesn't exit)
- [ ] Review bindings/env interface (`local-types.ts` `Bindings`):
  - `PROJECT_DB` - D1 database
  - `MAGIC_CODE`, `UPLOAD_URL` - optional
  - `PO_APP_ID`, `PO_USER_ID` - Pushover notifications
  - `ALTERNATE_ORIGIN` - CSRF origin for testing
  - `SMTP_SERVER_*` - email configuration

### 7.2 Production vs Development

- [ ] Verify all development-only code is marked for removal (`PRODUCTION:REMOVE`):
  - Test routes (`/test/*`, `buildRoot`, `handleSetClock`, `handleResetClock`, `handleSetDbFailures`)
  - Debug logging (`showRoutes`)
  - Relaxed timeouts (`minTimeout: 20`, `EMAIL_RESEND_TIME_IN_MILLISECONDS: 3000`)
  - Localhost origins in CSRF and better-auth
  - Body limit (`maxSize: 1024` vs `4 * 1024`)
  - Test cookie names (`DB_FAIL_COUNT`, `DB_FAIL_INCR`)
- [ ] Verify all production-only code is marked for uncommenting (`PRODUCTION:UNCOMMENT`):
  - CSRF origin patterns for production domains
  - Cookie `secure: true` and `domain` options
  - CSP `defaultSrc` and `formAction` for production domains
  - Better-auth `trustedOrigins` and `baseURL`

### 7.3 Feature Flags / Mode Configuration

- [ ] Review feature mode handling (`SIGN_UP_MODE` env var):
  - `OPEN_SIGN_UP` - standard sign-up
  - `GATED_SIGN_UP` - requires single-use code
  - `INTEREST_SIGN_UP` - waitlist only
  - `BOTH_SIGN_UP` - gated + interest combined
  - `NO_SIGN_UP` - sign-up disabled
- [ ] Verify correct routes registered per mode (see Section 10)
- [ ] Verify no unintended routes exposed in each mode

---

## 8. Type Safety & Code Quality

### 8.1 TypeScript Strictness

- [ ] Verify no `any` types in critical paths
- [ ] Check interface definitions for completeness (`local-types.ts`)
- [ ] Review type assertions (`as`) for safety
- [ ] Note: `CountAndDecrement` class in `local-types.ts` - consider functional alternative per user rules

### 8.2 Consistency Checks

- [ ] Verify consistent error message usage from constants
- [ ] Check consistent redirect patterns
- [ ] Review consistent path usage from constants

### 8.3 Code Patterns

- [ ] Verify functional patterns (no unnecessary classes)
- [ ] Check arrow function usage
- [ ] Review import organization (libraries first, then project)

---

## 9. Testing Considerations

### 9.1 Test Infrastructure

- [ ] Review test routes/endpoints
- [ ] Verify test routes are removed in production
- [ ] Audit test database endpoints (`/test/database/*`)
- [ ] Audit test SMTP config endpoints (`/test/smtp-config`)
- [ ] Audit test sign-up mode endpoints (`/test/sign-up-mode`)

### 9.2 Testability

- [ ] Check functions are unit-testable (pure where possible)
- [ ] Verify dependency injection patterns for mocking

### 9.3 E2E Test Coverage

- [ ] Verify sign-up flows tested for all modes (OPEN, GATED, INTEREST, BOTH, NO)
- [ ] Verify sign-in flows tested (valid/invalid credentials, unverified users)
- [ ] Verify password reset flow tested end-to-end
- [ ] Verify profile page and change password tested
- [ ] Verify rate limiting tested for email resend and password reset
- [ ] Verify duplicate email handling tested across sign-up modes
- [ ] Verify navigation and UI elements tested

---

## 10. Sign-Up Mode Configuration

### 10.1 Mode-Specific Route Registration

- [ ] Verify OPEN_SIGN_UP mode registers correct routes (`buildSignUp`, `handleSignUp`)
- [ ] Verify GATED_SIGN_UP mode registers correct routes (`buildGatedSignUp`, `handleGatedSignUp`)
- [ ] Verify INTEREST_SIGN_UP mode registers correct routes (`buildInterestSignUp`, `handleInterestSignUp`)
- [ ] Verify BOTH_SIGN_UP mode registers correct routes (`buildGatedInterestSignUp`, `handleGatedInterestSignUp`)
- [ ] Verify NO_SIGN_UP mode does not expose any sign-up routes
- [ ] Verify all modes properly register `buildAwaitVerification` and `handleResendEmail` when needed

### 10.2 Gated Sign-Up Code Validation

- [ ] Audit single-use code consumption logic (atomic delete)
- [ ] Verify code validation happens before user creation
- [ ] Check for timing attacks in code validation
- [ ] Review `singleUseCode` table schema (unique constraint on code)

### 10.3 Interest Sign-Up (Waitlist)

- [ ] Audit `interestedEmails` table for duplicate handling
- [ ] Verify email uniqueness check before insert
- [ ] Review user feedback for duplicate waitlist submissions

---

## 11. Profile & Password Management

### 11.1 Profile Page Security

- [ ] Verify profile page requires authentication
- [ ] Check user data displayed matches authenticated user only
- [ ] Review no-cache headers on profile page

### 11.2 Change Password Flow

- [ ] Audit current password verification before allowing change
- [ ] Verify new password validation (min length, confirmation match)
- [ ] Check session handling after password change (`revokeOtherSessions` option)
- [ ] Review error messages don't leak sensitive information

### 11.3 Password Reset Flow

- [ ] Audit token generation and expiration
- [ ] Verify rate limiting on password reset requests
- [ ] Check reset link security (token in URL)
- [ ] Review password reset email content for XSS

---

## 12. External Notifications

### 12.1 Pushover Integration

- [ ] Verify Pushover API keys from environment variables
- [ ] Check development mode skips actual notifications
- [ ] Review error handling for failed notifications
- [ ] Audit what events trigger notifications

---

## 13. Review Checklist Summary

### Critical Security Items

- [ ] All user-scoped routes verify user ownership
- [ ] All POST handlers validate input
- [ ] CSRF protection covers all state-changing endpoints
- [ ] SQL injection prevented via parameterization
- [ ] Sensitive cookies use `httpOnly`, `sameSite`, `secure`
- [ ] Error messages don't leak internal details
- [ ] Rate limiting on sensitive endpoints
- [ ] Single-use codes consumed atomically
- [ ] Password reset tokens properly expired

### Resilience Items

- [ ] Database operations wrapped with retry logic
- [ ] Result types used for error propagation
- [ ] Graceful error handling with user-friendly messages
- [ ] Environment validation on startup
- [ ] Email service failures handled gracefully

### Consistency Items

- [ ] Constants used for paths, messages, durations
- [ ] Consistent middleware application pattern
- [ ] Consistent validation and error handling patterns
- [ ] Type definitions centralized
- [ ] Sign-up mode handling consistent across routes

---

## 14. Issues Found

### High Priority (Security)

| Issue | Section | Recommendation |
| ----- | ------- | -------------- |
|       |         |                |

### Medium Priority (Consistency/Correctness)

| Issue | Section | Recommendation |
| ----- | ------- | -------------- |

### Low Priority (Code Quality)

| Issue | Section | Recommendation |
| ----- | ------- | -------------- |

### Production Deployment Checklist

Before deploying to production, ensure:

1. [ ] All development-only code is stripped from codebase (search for `PRODUCTION:REMOVE`)
2. [ ] All production-only code is uncommented (search for `PRODUCTION:UNCOMMENT`)
3. [ ] All required environment variables are set
4. [ ] Application fails fast on missing configuration
5. [ ] CSRF origin validation updated for production domains
6. [ ] Cookie `secure` and `domain` options configured for production
7. [ ] Body limit increased from dev (1kb) to prod (4kb)
8. [ ] Email resend timeout increased from dev (3s) to prod (30s)
9. [ ] Retry timeout increased from dev (20ms) to prod (200ms)
10. [ ] CSP `defaultSrc` and `formAction` updated for production domains
11. [ ] Better-auth `trustedOrigins` and `baseURL` updated for production

---

## 15. Review Complete

- [ ] All sections reviewed
- [ ] Issues documented with recommendations
- [ ] Production checklist verified
