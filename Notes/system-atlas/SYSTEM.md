# Mini Auth — System Definition

_**This file describes the system as it exists today.** The interactive atlas is built from the same data — edit the data file, rebuild, republish._

_Question status: **6 open · 8 resolved**._

## One paragraph

Mini Auth is a Cloudflare Worker that does username/password authentication with no client-side JavaScript worth mentioning. A browser talks to one Hono app that server-renders JSX pages, delegates all credential work to better-auth, and keeps every byte of state in a single D1 (SQLite) database. Four sign-up modes — open, gated-by-code, interest/waitlist, or none — are chosen by an env var at boot and change which routes exist. In dev, a Mailpit SMTP sink catches email and a set of /test/* routes lets Playwright seed, time-travel and inject failures; all of it is marked for stripping before production.

## Decisions locked

| Axis | Decision | ADR |
|---|---|---|
| Runtime & rendering | Cloudflare Worker + Hono + server-rendered JSX; no client JS except one flash-message script | [0001](./adr/0001-server-rendered-no-client-js.md) |
| Auth engine | better-auth owns credentials, sessions, verification and reset tokens via /api/auth/* and in-process auth.api calls; its sign-up endpoint is 404’d so modes apply | [0002](./adr/0002-better-auth-engine.md) |
| Sign-up policy | SIGN_UP_MODE env var mounts a different route set at boot: open, gated, interest, both, or none | [0003](./adr/0003-sign-up-mode-routes.md) |
| Rate limits | Dedicated lastResetEmailAt / lastVerificationEmailAt columns on account — never updatedAt, which better-auth rewrites | [0004](./adr/0004-rate-limit-clocks.md) |
| UX messaging | POSTs answer with a 303 plus a one-shot flash cookie; the layout renders it as an alert and deletes it | [0005](./adr/0005-flash-cookies.md) |

## Cost model

Not modeled. Dev is fully local (wrangler + Mailpit); production is Workers + D1 + an SMTP/HTTP email relay, all of which fit comfortably in free tiers at demo scale.
## Reading order (the atlas chapters)

1. **You and the worker** — Everything here is one request at a time: you ask, the worker answers. _(adds U, W)_
2. **Guards at the door** — Before any route runs, every request passes the same gantlet. _(adds G)_
3. **Pages and postcards** — Pages are rendered server-side; messages travel as cookies on the redirect. _(adds PG, CK, ST)_
4. **The auth brain** — better-auth owns the hard part; an adapter translates form posts into its JSON world. _(adds BA, X)_
5. **What it remembers** — Six tables in one D1 database hold every user, session, token and invite. _(adds DA, D1)_
6. **Joining up** — Sign-up ends with an email; in dev, Mailpit catches it. _(adds EM, MP)_
7. **Invitations & the waitlist** — Gated mode trades a code for an account; interest mode just takes your email. _(adds IC)_
8. **Don't flood the inbox** — Every email send is stamped; the next one waits. _(adds RL)_
9. **The test rig** — Dev-only routes plus a Playwright suite that can reach inside the app. _(adds TR, E2E)_
10. **Later** — Designed for, not switched on. _(adds GH, PD)_
11. **The whole system** — Everything at once, for free exploration.

## Structures

### At the edge

#### U · Browser

**In one line.** The person at the keyboard — every click is a real HTTP request.

**What it does.** Sign-in, sign-up, password reset and profile are plain HTML pages with forms that POST url-encoded bodies. There is no JavaScript framework on the client; the only script served is a tiny one that reads a "signed out" cookie and shows a toast.

**How it's built.** Forms hit `/auth/*` GET pages and `handle-*` POST routes; sign-in posts straight to `/api/auth/sign-in/email`. Client-side validation is HTML attributes only (**required, minlength, type=email**). Cookies carry the better-auth session token plus one-shot flash messages.

**Steps in execution.**

1. **GET page** — Fetch a server-rendered page like /auth/sign-in.
2. **Fill form** — Browser enforces required/minlength/type=email before posting.
3. **POST** — url-encoded body to a handle-* route or /api/auth/*.
4. **303 + cookies** — Follow the redirect; flash cookies ride along.
5. **Read alert** — The next page renders the message, then deletes the cookie.

#### ST · Static assets

**In one line.** Files Cloudflare serves without waking the Worker.

**What it does.** The compiled Tailwind/Daisy stylesheet — and in production, the landing page — live in public/. Cloudflare's asset layer serves them directly: cheap requests that never execute Worker code.

**How it's built.** `wrangler.jsonc` binds `ASSETS` to `./public` with `run_worker_first: false`. The timestamped stylesheet `public/style-*.css` is referenced from `src/renderer.tsx`. In production the landing page is meant to be a built `index.html` here — **visitors who bounce cost zero invocations**.

**Steps in execution.**

1. **Request** — GET /style-….css hits the edge.
2. **Asset hit** — The ASSETS binding serves bytes from public/.
3. **No Worker** — run_worker_first: false — the Worker never runs.

**Questions.**

- **Q-ST1** The static index.html landing page depends on the untested prod pipeline — is asset-first landing still the plan?

#### G · Request guards

**In one line.** Every request clears the same hurdles before it reaches a route.

**What it does.** Security headers, CSRF origin checks, a body-size limit, request logging and runtime env validation all run as Hono middleware. Private pages additionally pass a signed-in check; failing any hurdle means a redirect, not a stack trace.

**How it's built.** `src/index.ts` chains `secureHeaders` (CSP + permissions policy), `csrf` origin matching, `bodyLimit` (1kb dev / 4kb prod), `logger`, the JSX `renderer`, then `validateEnvBindings`. `signedInAccess` guards `/private` and `/profile` — **signed-out users get redirected to /auth/sign-in** with a flash error.

**Steps in execution.**

1. **Headers** — secureHeaders sets CSP + permissions-policy.
2. **Origin** — csrf checks Origin against allowed hosts (test routes skip it).
3. **Size** — bodyLimit rejects oversized bodies with 413.
4. **Bindings** — validateEnvBindings returns 500 if secrets are missing.
5. **Session** — signedInAccess redirects when user/session context is absent.

**Questions.**

- ~~**Q-G1** Is the CSRF origin list correct?~~ ✓ Dev allows localhost + an ALTERNATE_ORIGIN regex; production origins are PRODUCTION:UNCOMMENT markers swapped by clean-for-production.

#### W · Hono worker

**In one line.** The single Cloudflare Worker — routing, rendering and orchestrating everything.

**What it does.** One Hono app. On boot it validates env vars, installs middleware, wires better-auth, then mounts a route table that depends on SIGN_UP_MODE: open, gated, interest, both, or no sign-up at all. Unknown paths fall through to a 404 page that deliberately returns HTTP 200.

**How it's built.** `src/index.ts`: env check → middleware → `setupBetterAuthMiddleware / Interceptor / Auth` → mode-gated `build-*` and `handle-*` mounts → `build404` last. Per request, middleware creates a fresh `db` client and better-auth resolves the session into `c.var.user`. **The route set is chosen at boot by SIGN_UP_MODE.**

**Steps in execution.**

1. **Boot** — Validate required env vars; log loudly if any are missing.
2. **Middleware** — Guards, logger, renderer, bindings check, db client.
3. **Auth wiring** — Session middleware, sign-in interceptor, /api/auth/* handler.
4. **Mount routes** — Mode pick: open | gated | interest | both | none.
5. **404 last** — build404 renders the not-found page — with status 200.

**Questions.**

- ~~**Q-W1** 404s return HTTP 200?~~ ✓ Intentional — e2e asserts 200 + "Page Not Found" content (see README). Keep.
- **Q-W2** Test routes mount whenever ENABLE_TEST_ROUTES or PLAYWRIGHT is set — clean-for-production strips them, but the prod pipeline is untested.

### Pages & replies

#### PG · Pages & forms

**In one line.** A deck of server-rendered pages — one per screen the user can see.

**What it does.** Sign-in, four sign-up variants, forgot/reset password, await-verification, email-sent, profile, private, sign-out and 404. Each page is a TSX component rendered by Hono's JSX renderer inside a shared layout with navbar, flash alerts and footer.

**How it's built.** `build-*.tsx` files mount GET routes returning `c.render(useLayout(c, …))`; `renderer.tsx` supplies doctype + stylesheet. POSTs go to sibling `handle-*.ts` files that validate with valibot schemas (`validators.ts`) then redirect. Elements carry **data-testid in kebab-case** — the Playwright contract.

**Steps in execution.**

1. **GET** — Route renders TSX inside useLayout.
2. **Validate** — POST body parsed + checked against a valibot schema.
3. **Act** — Call better-auth api or db-access for the real work.
4. **Redirect** — 303 back with a flash cookie — POSTs never render HTML.

#### X · Sign-in adapter

**In one line.** Translates between HTML forms and better-auth's JSON API — in both directions.

**What it does.** The sign-in form posts to /api/auth/sign-in/email, but better-auth answers JSON. This middleware converts the form body to JSON on the way in, reads the JSON response, and turns it into the redirects users expect: forward to /private on success, back to sign-in with a flash error on failure, or to await-verification when the email is unconfirmed.

**How it's built.** `better-auth-response-interceptor.ts`: `captureEmailMiddleware` stashes the form email, `convertFormDataToJsonRequest` rewrites the body, then `signInHandler` calls `auth.handler` in-process and maps the outcome — **401 → invalid credentials · 403 EMAIL_NOT_VERIFIED → await-verification · 200 + verified → 303 /private** — copying every Set-Cookie header onto the redirect.

**Steps in execution.**

1. **Capture email** — Clone the request; stash the email for error paths.
2. **Form → JSON** — Rewrite the url-encoded body as application/json.
3. **auth.handler** — Call better-auth in-process, get a Response back.
4. **Map outcome** — 200 verified → 303 private; 403 → await-verification; 401 → error.
5. **Copy cookies** — better-auth Set-Cookie headers move onto the 303.

#### CK · Flash cookies

**In one line.** One-shot cookies that carry messages across a redirect.

**What it does.** POST handlers never render; they redirect. To show "check your email" or "invalid credentials" on the next page, the handler sets a cookie that the layout reads, renders as an alert, and deletes. EMAIL_ENTERED remembers the address on the verification pages.

**How it's built.** `redirects.tsx`: `redirectWithMessage` / `redirectWithError` build a **303 + Set-Cookie** (MESSAGE_FOUND / ERROR_FOUND — httpOnly, sameSite=Strict). `useLayout` retrieves and removes them on every render; `cookie-support.ts` wraps the hono cookie helpers. Project rule: never use `c.redirect` directly.

**Steps in execution.**

1. **Set** — The handler appends Set-Cookie to the 303 response.
2. **Carry** — The browser sends the cookie with the next GET.
3. **Render** — The layout reads it into an alert banner.
4. **Clear** — The layout deletes it — one shot only.

### The auth core

#### BA · Better-auth

**In one line.** The auth engine: passwords, sessions, verification and reset tokens.

**What it does.** better-auth does the security-critical work — hashing passwords, issuing session tokens, generating email-verification and password-reset tokens, and owning the user/session/account/verification tables through its Drizzle adapter. App code reaches it two ways: the /api/auth/* HTTP handler, or in-process auth.api.* calls from form handlers.

**How it's built.** `lib/auth.ts` builds the instance: `drizzleAdapter(client, {provider: 'sqlite'})`, email+password with **requireEmailVerification**, 30-day sessions refreshed daily, and `sendVerificationEmail` / `sendResetPassword` delegated to our email service. `/api/auth/sign-up/email` is 404'd — sign-up only happens through our form handlers so the modes apply.

**Steps in execution.**

1. **getSession** — Middleware resolves the session cookie → user+session, per request.
2. **signUpEmail** — Creates user + credential account; fires the verification email.
3. **signInEmail** — Verifies the password, issues the session-token cookie.
4. **verifyEmail** — Token in the link → emailVerified = true.
5. **resetPassword** — Reset token → new password hash on the account row.

**Questions.**

- ~~**Q-BA1** Which tables are better-auth's vs ours?~~ ✓ user/session/account/verification are its schema; singleUseCode + interestedEmail are ours (src/db/schema.ts).
- ~~**Q-BA2** Where does the secret live?~~ ✓ BETTER_AUTH_SECRET env var, checked at boot and again per request.

#### RL · Rate limiter

**In one line.** Cooldown clocks that keep verification and reset emails from flooding inboxes.

**What it does.** Two dedicated timestamp columns on the account table record when each kind of email was last sent; handlers refuse another send until the window passes. Forgot-password additionally keeps an in-memory map so unknown emails get throttled identically — no "does this account exist" timing leak.

**How it's built.** `account.lastResetEmailAt` and `lastVerificationEmailAt` are updated through db-access helpers — **deliberately not account.updatedAt, which better-auth rewrites**. `handle-forgot-password.ts` keeps `emailRateLimitCache`, an isolate-local Map. Window: 3s in dev, 30s in prod (PRODUCTION comments).

**Steps in execution.**

1. **Read clock** — Load the last-sent timestamp for this account.
2. **Compare** — now − lastSent vs the EMAIL_RESEND_TIME window.
3. **Deny** — Under the window → 303 with a wait-N-seconds error.
4. **Send** — Past the window → send the email, then stamp now.

**Questions.**

- **Q-RL1** The in-memory forgot-password cache is per-isolate — Cloudflare may run many; it also resets on redeploy. Acceptable at this scale, or move to D1?
- ~~**Q-RL2** Is the clock time-travel wired?~~ ✓ Only halfway — set-clock stores a delta cookie, but the rate-limit code calls Date.now() directly; nothing reads the delta yet.

#### EM · Email service

**In one line.** Two transports, one job: confirmation and reset emails that actually arrive.

**What it does.** better-auth asks us to send mail at two moments — verify your address, reset your password. In dev and tests the message goes by SMTP to Mailpit; in production it is a POST to an email-relay endpoint with a bearer code.

**How it's built.** `lib/email-service.ts`: `getEmailConfig` detects test mode → nodemailer to `127.0.0.1:1025` (overridable via `/test/set-smtp-config` for failure tests); otherwise `fetch(EMAIL_SEND_URL)` with `EMAIL_SEND_CODE` — **a non-2xx throws, so a failed send is never reported as sent**. The user name is HTML-escaped in the template.

**Steps in execution.**

1. **Pick transport** — Test/dev → SMTP; production → relay POST.
2. **Render** — Inline HTML + text templates with escaped fields.
3. **Send** — nodemailer.sendMail, or fetch to EMAIL_SEND_URL.
4. **Report** — Throw on failure so the caller can flash an error.

**Questions.**

- ~~**Q-EM1** sending_site 'cls.cloud'?~~ ✓ Hardcoded in the relay POST body — looks like a leftover from another project; fix before prod.

### Data

#### DA · Data access

**In one line.** Our own queries — every one retried and wrapped in a Result, never a bare throw.

**What it does.** The reads and writes the app does outside better-auth: looking up a user with their credential account, stamping rate-limit clocks, atomically claiming invite codes, inserting waitlist emails, deleting accounts. Every call goes through withRetry → Result, so handlers branch on isOk/isErr instead of try/catch.

**How it's built.** `lib/db-access.ts` + `db/client.ts` (`drizzle(d1, {schema})` per request). `withRetry` uses async-retry (5 tries, 20ms dev / 200ms prod floor). **claimSingleUseCode is a single UPDATE … WHERE email IS NULL** — race-safe without transactions. Result type from true-myth.

**Steps in execution.**

1. **Build client** — drizzle() around the PROJECT_DB D1 binding.
2. **Query** — drizzle select/update/delete for the operation.
3. **Retry** — async-retry reruns failures per STANDARD_RETRY_OPTIONS.
4. **Wrap** — Outcome → Result.ok / Result.err for the caller.

#### D1 · D1 database

**In one line.** One SQLite database at the edge holding the whole auth state.

**What it does.** Six tables. Four belong to better-auth — user, session, account (password hashes, plus our rate-limit columns riding along), verification (email and reset tokens). Two are ours — singleUseCode for gated sign-up, interestedEmail for the waitlist.

**How it's built.** Bound as `PROJECT_DB` in `wrangler.jsonc`; schema in `src/db/schema.ts`, migrations via `drizzle-kit generate` → `drizzle/`, applied by `build-schema-update.sh` locally or `schema-prod.sql` remotely. **user.name is UNIQUE** — display names double as identity. Deleting a user cascades to sessions and accounts.

**Steps in execution.**

1. **user** — id, name (unique), email (unique), emailVerified.
2. **session** — token, expiresAt, userId — cascades on user delete.
3. **account** — credential password hash + lastReset/VerificationEmailAt.
4. **verification** — identifier / value / expiresAt token rows.
5. **singleUseCode** — code PK; email NULL means unclaimed.
6. **interestedEmail** — email PK — the waitlist.

**Questions.**

- ~~**Q-D11** drizzle-kit migrations or hand SQL?~~ ✓ Both — drizzle-kit generates SQL, build-schema-update.sh applies to local D1, and prod uses a manually derived schema-prod.sql.

#### IC · Invite gate

**In one line.** Gated mode's bouncer: a single-use code, claimed atomically, released if sign-up fails.

**What it does.** In GATED or BOTH mode the sign-up form carries a code. The handler claims it with one conditional UPDATE — only a request that finds the code unclaimed wins — then creates the account. If anything downstream fails, the claim is released so a real user doesn't lose their invite to a transient error.

**How it's built.** `processGatedSignUp` in `sign-up-utils.ts`: `claimSingleUseCode` → `signUpEmail` → on failure `releaseSingleUseCode`, which only releases if the code is still held by that email. Interest mode instead inserts into `interestedEmail`; a unique-violation means "already on the waitlist" — **no account is ever created**.

**Steps in execution.**

1. **Claim** — UPDATE singleUseCode SET email WHERE code=? AND email IS NULL.
2. **Check** — 1 row changed → claimed; 0 → invalid or already used.
3. **Sign up** — Create the account through better-auth as usual.
4. **Release** — On failure, clear the claim only if we still hold it.

**Questions.**

- **Q-IC1** Who hands out codes? There is no admin UI — codes arrive via sqlite3/SQL inserts (the test seed provides WELCOME2024 and friends).

### Dev & test rig

#### MP · Mailpit

**In one line.** The dev-side SMTP sink that catches every email the app sends.

**What it does.** A local binary run alongside wrangler dev. The app's test-mode transport points at it, so sign-up verifications and reset links land in Mailpit's web UI instead of a real inbox — and Playwright reads them from its API.

**How it's built.** `run-dev.sh` starts wrangler + Mailpit together (concurrently). SMTP on `127.0.0.1:1025`, web UI at `http://localhost:8025`. e2e helpers poll Mailpit for the latest message to extract verification and reset links.

**Steps in execution.**

1. **Start** — run-dev.sh launches Mailpit beside wrangler.
2. **Catch** — The app delivers mail over SMTP to :1025.
3. **Inspect** — Humans use the :8025 UI; tests use the API.

#### TR · Test hooks

**In one line.** Dev-only routes that let tests reach inside the running app.

**What it does.** A set of /test/* endpoints plus a few auth/* toggles that exist only when ENABLE_TEST_ROUTES or PLAYWRIGHT is set: clear or seed the database, count rows, check codes, override SMTP, clear the rate-limit cache, set a clock delta, inject D1 failures, and report the sign-up mode.

**How it's built.** `routes/test/{database,sign-up-mode,smtp-config}.ts` routers plus `handle-{set,reset}-clock.ts` and `handle-set-db-failures.ts`, mounted only when `isTestRouteEnabled` — **all marked PRODUCTION:REMOVE and stripped by clean-for-production.rb**. The CSRF middleware skips /test/*.

**Steps in execution.**

1. **Seed** — POST /test/database/seed → fixture users, accounts, codes.
2. **Clear** — DELETE /test/database/clear between specs.
3. **Time** — GET /auth/set-clock/:delta stores a delta cookie.
4. **Fail** — SMTP override + DB_FAIL cookies simulate outages.

**Questions.**

- ~~**Q-TR1** Does the clock delta do anything yet?~~ ✓ Nothing reads it — handlers call Date.now() directly and getCurrentTime has no callers. Dead wiring: wire it or remove it.

#### E2E · Playwright suite

**In one line.** A full Playwright harness that drives real sign-up, sign-in and reset journeys.

**What it does.** Browser tests per sign-up mode plus general, profile and reset coverage, sharing helpers for navigation, forms, DB seeding, Mailpit reads and mode detection. Specs skip themselves when the dev server is in the wrong SIGN_UP_MODE.

**How it's built.** `e2e-tests/` folders per mode; `support/*-helpers.ts` wrap the common flows — `db-helpers` calls `/test/database/*`, `auth-helpers` drives journeys, `mode-helpers` reads `/test/sign-up-mode`. Run `npx playwright test` against an `npm run dev-*` server. **data-testid attributes are the contract.**

**Steps in execution.**

1. **Seed** — Spec clears/seeds the DB through /test/database/*.
2. **Drive** — Fill forms, submit, assert redirects + flash text.
3. **Read mail** — Poll Mailpit for the verification or reset link.
4. **Skip modes** — mode-helpers skip specs not matching SIGN_UP_MODE.

### Not yet switched on (designed for, not built)

#### GH · Retained utilities _(not switched on)_

**In one line.** Kept-on-purpose helpers with zero callers today.

**What it does.** po-notify.ts posts Pushover alerts to a phone when PO_APP_ID and PO_USER_ID are set. send-email.ts is a reference SMTP/OTP sender. generate-code.ts makes a 6-digit code. None are imported by any route — they are marked "do not delete without confirming."

**How it's built.** `lib/po-notify.ts` (env-gated `pushoverNotify`), `lib/send-email.ts` (`sendOtpToUserViaEmail` via nodemailer+retry+Result), `lib/generate-code.ts` (`generateToken`). **Zero call sites in src/.**

**Steps in execution.**

1. **Kept** — Doc comment in each file says to confirm before deleting.
2. **Gated** — Pushover only sends when both env vars exist.
3. **Waiting** — Likely first call site: a "new user signed up" alert.

**Questions.**

- **Q-GH1** First call site for Pushover: new-sign-up notification, or error spike? Undecided — currently zero callers.

#### PD · Prod pipeline _(not switched on)_

**In one line.** The plan for shipping — strip dev wiring, swap PRODUCTION markers, deploy — never run end to end.

**What it does.** prod_deploy.sh is meant to build the static index.html, run clean-for-production.rb to remove test routes and dev-only code, swap every PRODUCTION:REMOVE/UNCOMMENT marker, then wrangler deploy. The README warns it is "currently untested, and probably broken."

**How it's built.** Marker convention across the codebase: `// PRODUCTION:REMOVE` deletes a line or block, `// PRODUCTION:UNCOMMENT` activates the prod variant, `// PRODUCTION:REMOVE-NEXT-LINE` drops the following line. **clean-for-production.rb does the rewrite**; prod secrets (SMTP_*, CLOUDFLARE_*, PO_*) live on Cloudflare.

**Steps in execution.**

1. **Build** — Compile index.html + stylesheet into public/.
2. **Strip** — clean-for-production removes test routes + dev code.
3. **Swap** — PRODUCTION markers flip origins, limits, CSP, durations.
4. **Deploy** — wrangler deploy --minify with prod secrets set.

**Questions.**

- **Q-PD1** prod_deploy.sh is untested per README — needs a dry run plus an e2e smoke pass before it can be trusted.

## Flows (representative packets)

Payload shapes are what the design implies, not measured traffic.

### Sign in

| # | From → To | Packet | Representative payload |
|---|---|---|---|
| 1 | U → X | POST sign-in form | `{"method":"POST","path":"/api/auth/sign-in/email","email":"me@x.io"}` |
| 2 | X → BA | JSON credentials | `{"email":"me@x.io","password":"••••••••"}` |
| 3 | BA → D1 | SELECT user + account | `{"via":"drizzle adapter"}` |
| 4 | D1 → BA | row | `{"emailVerified":true,"password":"hash:salt"}` |
| 5 | BA → X | 200 + Set-Cookie | `{"sessionToken":"eyJ…","expiresIn":"30d"}` |
| 6 | X → U | 303 → /private | `{"status":303,"setCookie":["session_token","MESSAGE_FOUND=Welcome!"]}` |

### Sign up & verify

| # | From → To | Packet | Representative payload |
|---|---|---|---|
| 1 | U → W | POST /auth/sign-up | `{"name":"Me","email":"me@x.io","password":"••••••••"}` |
| 2 | W → BA | signUpEmail | `{"email":"me@x.io","callbackURL":"/auth/sign-in/true"}` |
| 3 | BA → D1 | insert user + account + token | `{"tables":["user","account","verification"]}` |
| 4 | BA → EM | sendConfirmationEmail | `{"subject":"Confirm Your Email Address"}` |
| 5 | EM → MP | SMTP :1025 | `{"to":"me@x.io"}` |
| 6 | W → U | 303 → await-verification | `{"setCookie":"EMAIL_ENTERED=me@x.io"}` |
| 7 | U → W | GET verify-email?token | `{"token":"abc123…"}` |
| 8 | W → BA | verifyEmail | `{"token":"abc123…"}` |
| 9 | BA → D1 | emailVerified = true | `{"update":"user"}` |
| 10 | W → U | confirmation page | `{"status":200,"alert":"Email Confirmed!"}` |

### Password reset

| # | From → To | Packet | Representative payload |
|---|---|---|---|
| 1 | U → W | POST forgot-password | `{"email":"me@x.io"}` |
| 2 | W → RL | rate check | `{"lastResetEmailAt":"T−40s","window":"3s"}` |
| 3 | RL → W | allowed | `{"allowed":true}` |
| 4 | W → BA | requestPasswordReset | `{"email":"me@x.io","redirectTo":"/auth/reset-password"}` |
| 5 | BA → EM | sendPasswordResetEmail | `{"subject":"Reset Your Password"}` |
| 6 | EM → MP | SMTP :1025 | `{"to":"me@x.io"}` |
| 7 | W → DA | stamp lastResetEmailAt | `{"update":"account"}` |
| 8 | W → U | 303 → waiting-for-reset | `{"msg":"If an account exists…"}` |
| 9 | U → W | POST reset + token | `{"token":"abc123…","password":"••••••••"}` |
| 10 | W → BA | resetPassword | `{"token":"abc123…","newPassword":"••••••••"}` |
| 11 | BA → D1 | update password hash | `{"update":"account"}` |
| 12 | W → U | 303 → sign-in | `{"msg":"Password has been reset"}` |

### Gated sign-up

| # | From → To | Packet | Representative payload |
|---|---|---|---|
| 1 | U → W | POST sign-up + code | `{"code":"WELCOME2024","email":"me@x.io"}` |
| 2 | W → IC | claimSingleUseCode | `{"code":"WELCOME2024"}` |
| 3 | IC → D1 | UPDATE … WHERE email IS NULL | `{"rowsChanged":1}` |
| 4 | D1 → IC | claimed | `{"claimed":true}` |
| 5 | IC → W | code ok | `{"code":"WELCOME2024","holder":"me@x.io"}` |
| 6 | W → BA | signUpEmail | `{"email":"me@x.io"}` |
| 7 | BA → D1 | insert user + account | `{"tables":["user","account"]}` |
| 8 | BA → EM | confirmation email | `{"subject":"Confirm Your Email"}` |
| 9 | EM → MP | SMTP :1025 | `{"to":"me@x.io"}` |
| 10 | W → U | 303 → await-verification | `{"setCookie":"EMAIL_ENTERED=me@x.io"}` |

### Interest / waitlist

| # | From → To | Packet | Representative payload |
|---|---|---|---|
| 1 | U → W | POST interest-sign-up | `{"email":"curious@x.io"}` |
| 2 | W → DA | addInterestedEmail | `{"email":"curious@x.io"}` |
| 3 | DA → D1 | INSERT interestedEmail | `{"email":"curious@x.io"}` |
| 4 | D1 → DA | ok / unique-fail | `{"inserted":true}` |
| 5 | DA → W | Result.ok | `{"added":true}` |
| 6 | W → U | 303 waitlist message | `{"msg":"added to our waitlist"}` |

### Signed-in request

| # | From → To | Packet | Representative payload |
|---|---|---|---|
| 1 | U → W | GET /private + cookie | `{"cookie":"session_token=eyJ…"}` |
| 2 | W → BA | getSession | `{"headers":"cookie: session_token"}` |
| 3 | BA → D1 | SELECT session + user | `{"via":"drizzle adapter"}` |
| 4 | D1 → BA | row | `{"user":"me@x.io","expiresAt":"+30d"}` |
| 5 | BA → W | user + session | `{"user":"me@x.io"}` |
| 6 | W → U | private page | `{"status":200,"greeting":"Welcome, me!"}` |

### E2E pass

| # | From → To | Packet | Representative payload |
|---|---|---|---|
| 1 | E2E → TR | POST /test/database/seed | `{"users":2,"codes":5}` |
| 2 | TR → D1 | insert fixtures | `{"tables":["user","account","singleUseCode"]}` |
| 3 | E2E → U | drive sign-up | `{"action":"fill + submit form"}` |
| 4 | U → W | POST /auth/sign-up | `{"email":"e2e@x.io"}` |
| 5 | W → EM | send verification | `{"subject":"Confirm Your Email"}` |
| 6 | EM → MP | SMTP :1025 | `{"to":"e2e@x.io"}` |
| 7 | E2E → MP | read link via API | `{"poll":"mailpit message API"}` |

## Questions — index

Reference by ID. ✓ resolved (with date) · otherwise open.

- **Q-ST1** (ST) The static index.html landing page depends on the untested prod pipeline — is asset-first landing still the plan?
- ~~**Q-G1**~~ (G) ✓ Dev allows localhost + an ALTERNATE_ORIGIN regex; production origins are PRODUCTION:UNCOMMENT markers swapped by clean-for-production.
- ~~**Q-W1**~~ (W) ✓ Intentional — e2e asserts 200 + "Page Not Found" content (see README). Keep.
- **Q-W2** (W) Test routes mount whenever ENABLE_TEST_ROUTES or PLAYWRIGHT is set — clean-for-production strips them, but the prod pipeline is untested.
- ~~**Q-BA1**~~ (BA) ✓ user/session/account/verification are its schema; singleUseCode + interestedEmail are ours (src/db/schema.ts).
- ~~**Q-BA2**~~ (BA) ✓ BETTER_AUTH_SECRET env var, checked at boot and again per request.
- **Q-RL1** (RL) The in-memory forgot-password cache is per-isolate — Cloudflare may run many; it also resets on redeploy. Acceptable at this scale, or move to D1?
- ~~**Q-RL2**~~ (RL) ✓ Only halfway — set-clock stores a delta cookie, but the rate-limit code calls Date.now() directly; nothing reads the delta yet.
- ~~**Q-EM1**~~ (EM) ✓ Hardcoded in the relay POST body — looks like a leftover from another project; fix before prod.
- ~~**Q-D11**~~ (D1) ✓ Both — drizzle-kit generates SQL, build-schema-update.sh applies to local D1, and prod uses a manually derived schema-prod.sql.
- **Q-IC1** (IC) Who hands out codes? There is no admin UI — codes arrive via sqlite3/SQL inserts (the test seed provides WELCOME2024 and friends).
- ~~**Q-TR1**~~ (TR) ✓ Nothing reads it — handlers call Date.now() directly and getCurrentTime has no callers. Dead wiring: wire it or remove it.
- **Q-GH1** (GH) First call site for Pushover: new-sign-up notification, or error spike? Undecided — currently zero callers.
- **Q-PD1** (PD) prod_deploy.sh is untested per README — needs a dry run plus an e2e smoke pass before it can be trusted.

## What the platform gives vs what we own

**Platform gives:** Cloudflare Workers runtime + D1 database + static-asset serving + env bindings/secrets + observability. From better-auth: password hashing, session tokens, email-verification and password-reset tokens, the /api/auth/* API, and the Drizzle adapter that owns the user/session/account/verification tables.

**We own:** The Hono route table and JSX pages, the SIGN_UP_MODE gating that mounts different routes per mode, the form↔JSON response adapter for sign-in, flash-cookie messaging, rate-limit clocks on the account table, atomic invite-code claim/release, the dev/prod email-transport switch, and the dev-only test hooks — all stripped by PRODUCTION markers before deploy.

## Planned filesystem

```
src/
  index.ts              app assembly: middleware → auth wiring → mode-gated routes → 404 (200)
  renderer.tsx          JSX page shell (doctype, stylesheet link)
  constants.ts          PATHS, COOKIES, SIGN_UP_MODES, MESSAGES, DURATIONS, secure headers
  middleware/           validateEnvBindings, signedInAccess
  db/                   client.ts (drizzle over D1) · schema.ts (6 tables)
  lib/                  auth · db-access · redirects · cookie-support · email-service
                        validators · sign-up-utils · email-utils · url-validation
                        time-access · po-notify · send-email · generate-code (retained)
                        logger · test-routes · setup-no-cache-headers
  routes/
    build-*.tsx         GET pages      handle-*.ts   POST handlers
    auth/               sign-in/up/out, verify, resend, forgot/reset, dev clock routes
    profile/            profile, change password, delete account
    test/               /test/* routers — dev only
  components/           shared TSX (gated-sign-up-form)
public/                 compiled Tailwind/Daisy stylesheet (ASSETS binding)
e2e-tests/              Playwright specs per mode + support helpers
tests/                  bun unit tests
```

## How this file is maintained

Generated from `Notes/system-atlas/atlas/data.mjs` by `bun Notes/system-atlas/atlas/build.mjs`, which also builds the interactive atlas (`atlas.html`, published at https://csterritt.github.io/daisy-tw-worker-d1-drizzle/). Edit the data file, rebuild, republish — never edit this file by hand.
