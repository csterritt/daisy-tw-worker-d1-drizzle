// Single source of truth for the mini-auth atlas. Edit this file only.
// Build: bun Notes/system-atlas/atlas/build.mjs  → writes ../SYSTEM.md and ../atlas.html

export const META = {
  title: 'Mini Auth',
  artifactUrl: 'http://localhost:8137/atlas.html',
  sourcePath: 'Notes/system-atlas/atlas/data.mjs',
  buildCmd: 'bun Notes/system-atlas/atlas/build.mjs',
  stats: [
    { k: 'System', v: 'mini-auth · Cloudflare Worker' },
    { k: 'Stack', v: 'Hono · D1 · Drizzle · better-auth' },
    { k: 'Client JS', v: 'one flash script' },
  ],
  intro: `_**This file describes the system as it exists today.** The interactive atlas is built from the same data — edit the data file, rebuild, republish._`,
  onePara: `Mini Auth is a Cloudflare Worker that does username/password authentication with no client-side JavaScript worth mentioning. A browser talks to one Hono app that server-renders JSX pages, delegates all credential work to better-auth, and keeps every byte of state in a single D1 (SQLite) database. Four sign-up modes — open, gated-by-code, interest/waitlist, or none — are chosen by an env var at boot and change which routes exist. In dev, a Mailpit SMTP sink catches email and a set of /test/* routes lets Playwright seed, time-travel and inject failures; all of it is marked for stripping before production.`,
  costModel: [
    'Not modeled. Dev is fully local (wrangler + Mailpit); production is Workers + D1 + an SMTP/HTTP email relay, all of which fit comfortably in free tiers at demo scale.',
  ],
  deepDive: '',
  platformGives:
    'Cloudflare Workers runtime + D1 database + static-asset serving + env bindings/secrets + observability. From better-auth: password hashing, session tokens, email-verification and password-reset tokens, the /api/auth/* API, and the Drizzle adapter that owns the user/session/account/verification tables.',
  weOwn:
    'The Hono route table and JSX pages, the SIGN_UP_MODE gating that mounts different routes per mode, the form↔JSON response adapter for sign-in, flash-cookie messaging, rate-limit clocks on the account table, atomic invite-code claim/release, the dev/prod email-transport switch, and the dev-only test hooks — all stripped by PRODUCTION markers before deploy.',
  filesystem: `src/
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
tests/                  bun unit tests`,
};

// Decisions render as the SYSTEM.md table and as the last chapter's "Decisions locked" list.
export const DECISIONS = [
  {
    axis: 'Runtime & rendering',
    decision: 'Cloudflare Worker + Hono + server-rendered JSX; no client JS except one flash-message script',
    adr: '[0001](./adr/0001-server-rendered-no-client-js.md)',
  },
  {
    axis: 'Auth engine',
    decision: 'better-auth owns credentials, sessions, verification and reset tokens via /api/auth/* and in-process auth.api calls; its sign-up endpoint is 404\u2019d so modes apply',
    adr: '[0002](./adr/0002-better-auth-engine.md)',
  },
  {
    axis: 'Sign-up policy',
    decision: 'SIGN_UP_MODE env var mounts a different route set at boot: open, gated, interest, both, or none',
    adr: '[0003](./adr/0003-sign-up-mode-routes.md)',
  },
  {
    axis: 'Rate limits',
    decision: 'Dedicated lastResetEmailAt / lastVerificationEmailAt columns on account — never updatedAt, which better-auth rewrites',
    adr: '[0004](./adr/0004-rate-limit-clocks.md)',
  },
  {
    axis: 'UX messaging',
    decision: 'POSTs answer with a 303 plus a one-shot flash cookie; the layout renders it as an alert and deletes it',
    adr: '[0005](./adr/0005-flash-cookies.md)',
  },
];

export const GROUPS = [
  { id: 'edge', title: 'At the edge' },
  { id: 'pages', title: 'Pages & replies' },
  { id: 'auth', title: 'The auth core' },
  { id: 'data', title: 'Data' },
  { id: 'dev', title: 'Dev & test rig' },
  { id: 'off', title: 'Not yet switched on' },
];

// Structure = one isometric box. Fields:
//   id/code: 1–2 letters · name · short (≤14 chars canvas label) · group
//   gx,gy: grid position · w,d: footprint · h: height px · kind: box|tall|store|cards|slab|screen|gate|job
//   ghost: true → dashed "designed for, not built"
//   one: one-sentence summary · what: plain description · how: implementation (<code>, <mark>)
//   steps: [[name, desc], …] → "go inside" view
//   cond: questions — string (open) | {q, r} (resolved) | {q, to} (routed)
export const NODES = [
  {
    id: 'U', code: 'U', name: 'Browser', short: 'BROWSER', group: 'edge',
    gx: 1, gy: 2.5, w: 2, d: 2, h: 18, kind: 'screen',
    one: 'The person at the keyboard — every click is a real HTTP request.',
    what: 'Sign-in, sign-up, password reset and profile are plain HTML pages with forms that POST url-encoded bodies. There is no JavaScript framework on the client; the only script served is a tiny one that reads a "signed out" cookie and shows a toast.',
    how: 'Forms hit <code>/auth/*</code> GET pages and <code>handle-*</code> POST routes; sign-in posts straight to <code>/api/auth/sign-in/email</code>. Client-side validation is HTML attributes only (<mark>required, minlength, type=email</mark>). Cookies carry the better-auth session token plus one-shot flash messages.',
    steps: [
      ['GET page', 'Fetch a server-rendered page like /auth/sign-in.'],
      ['Fill form', 'Browser enforces required/minlength/type=email before posting.'],
      ['POST', 'url-encoded body to a handle-* route or /api/auth/*.'],
      ['303 + cookies', 'Follow the redirect; flash cookies ride along.'],
      ['Read alert', 'The next page renders the message, then deletes the cookie.'],
    ],
    cond: [],
  },
  {
    id: 'ST', code: 'ST', name: 'Static assets', short: 'ASSETS', group: 'edge',
    gx: 4, gy: 1.2, w: 3, d: 2, h: 10, kind: 'slab',
    one: "Files Cloudflare serves without waking the Worker.",
    what: "The compiled Tailwind/Daisy stylesheet — and in production, the landing page — live in public/. Cloudflare's asset layer serves them directly: cheap requests that never execute Worker code.",
    how: '<code>wrangler.jsonc</code> binds <code>ASSETS</code> to <code>./public</code> with <code>run_worker_first: false</code>. The timestamped stylesheet <code>public/style-*.css</code> is referenced from <code>src/renderer.tsx</code>. In production the landing page is meant to be a built <code>index.html</code> here — <mark>visitors who bounce cost zero invocations</mark>.',
    steps: [
      ['Request', 'GET /style-….css hits the edge.'],
      ['Asset hit', 'The ASSETS binding serves bytes from public/.'],
      ['No Worker', 'run_worker_first: false — the Worker never runs.'],
    ],
    cond: [
      'The static index.html landing page depends on the untested prod pipeline — is asset-first landing still the plan?',
    ],
  },
  {
    id: 'G', code: 'G', name: 'Request guards', short: 'GUARDS', group: 'edge',
    gx: 7.8, gy: 3, w: 2, d: 2, h: 40, kind: 'gate',
    one: 'Every request clears the same hurdles before it reaches a route.',
    what: 'Security headers, CSRF origin checks, a body-size limit, request logging and runtime env validation all run as Hono middleware. Private pages additionally pass a signed-in check; failing any hurdle means a redirect, not a stack trace.',
    how: '<code>src/index.ts</code> chains <code>secureHeaders</code> (CSP + permissions policy), <code>csrf</code> origin matching, <code>bodyLimit</code> (1kb dev / 4kb prod), <code>logger</code>, the JSX <code>renderer</code>, then <code>validateEnvBindings</code>. <code>signedInAccess</code> guards <code>/private</code> and <code>/profile</code> — <mark>signed-out users get redirected to /auth/sign-in</mark> with a flash error.',
    steps: [
      ['Headers', 'secureHeaders sets CSP + permissions-policy.'],
      ['Origin', 'csrf checks Origin against allowed hosts (test routes skip it).'],
      ['Size', 'bodyLimit rejects oversized bodies with 413.'],
      ['Bindings', 'validateEnvBindings returns 500 if secrets are missing.'],
      ['Session', 'signedInAccess redirects when user/session context is absent.'],
    ],
    cond: [
      {
        q: 'Is the CSRF origin list correct?',
        r: 'Dev allows localhost + an ALTERNATE_ORIGIN regex; production origins are PRODUCTION:UNCOMMENT markers swapped by clean-for-production.',
      },
    ],
  },
  {
    id: 'W', code: 'W', name: 'Hono worker', short: 'WORKER', group: 'edge',
    gx: 10.5, gy: 1.8, w: 3, d: 3, h: 70, kind: 'tall',
    one: 'The single Cloudflare Worker — routing, rendering and orchestrating everything.',
    what: 'One Hono app. On boot it validates env vars, installs middleware, wires better-auth, then mounts a route table that depends on SIGN_UP_MODE: open, gated, interest, both, or no sign-up at all. Unknown paths fall through to a 404 page that deliberately returns HTTP 200.',
    how: '<code>src/index.ts</code>: env check → middleware → <code>setupBetterAuthMiddleware / Interceptor / Auth</code> → mode-gated <code>build-*</code> and <code>handle-*</code> mounts → <code>build404</code> last. Per request, middleware creates a fresh <code>db</code> client and better-auth resolves the session into <code>c.var.user</code>. <mark>The route set is chosen at boot by SIGN_UP_MODE.</mark>',
    steps: [
      ['Boot', 'Validate required env vars; log loudly if any are missing.'],
      ['Middleware', 'Guards, logger, renderer, bindings check, db client.'],
      ['Auth wiring', 'Session middleware, sign-in interceptor, /api/auth/* handler.'],
      ['Mount routes', 'Mode pick: open | gated | interest | both | none.'],
      ['404 last', 'build404 renders the not-found page — with status 200.'],
    ],
    cond: [
      {
        q: '404s return HTTP 200?',
        r: 'Intentional — e2e asserts 200 + "Page Not Found" content (see README). Keep.',
      },
      'Test routes mount whenever ENABLE_TEST_ROUTES or PLAYWRIGHT is set — clean-for-production strips them, but the prod pipeline is untested.',
    ],
  },
  {
    id: 'PG', code: 'PG', name: 'Pages & forms', short: 'PAGES', group: 'pages',
    gx: 14.5, gy: 3.5, w: 3, d: 2, h: 26, kind: 'cards',
    one: 'A deck of server-rendered pages — one per screen the user can see.',
    what: "Sign-in, four sign-up variants, forgot/reset password, await-verification, email-sent, profile, private, sign-out and 404. Each page is a TSX component rendered by Hono's JSX renderer inside a shared layout with navbar, flash alerts and footer.",
    how: '<code>build-*.tsx</code> files mount GET routes returning <code>c.render(useLayout(c, …))</code>; <code>renderer.tsx</code> supplies doctype + stylesheet. POSTs go to sibling <code>handle-*.ts</code> files that validate with valibot schemas (<code>validators.ts</code>) then redirect. Elements carry <mark>data-testid in kebab-case</mark> — the Playwright contract.',
    steps: [
      ['GET', 'Route renders TSX inside useLayout.'],
      ['Validate', 'POST body parsed + checked against a valibot schema.'],
      ['Act', 'Call better-auth api or db-access for the real work.'],
      ['Redirect', '303 back with a flash cookie — POSTs never render HTML.'],
    ],
    cond: [],
  },
  {
    id: 'X', code: 'X', name: 'Sign-in adapter', short: 'SIGN-IN ADAPT', group: 'pages',
    gx: 6.5, gy: 6.5, w: 2, d: 2, h: 34, kind: 'gate',
    one: "Translates between HTML forms and better-auth's JSON API — in both directions.",
    what: 'The sign-in form posts to /api/auth/sign-in/email, but better-auth answers JSON. This middleware converts the form body to JSON on the way in, reads the JSON response, and turns it into the redirects users expect: forward to /private on success, back to sign-in with a flash error on failure, or to await-verification when the email is unconfirmed.',
    how: '<code>better-auth-response-interceptor.ts</code>: <code>captureEmailMiddleware</code> stashes the form email, <code>convertFormDataToJsonRequest</code> rewrites the body, then <code>signInHandler</code> calls <code>auth.handler</code> in-process and maps the outcome — <mark>401 → invalid credentials · 403 EMAIL_NOT_VERIFIED → await-verification · 200 + verified → 303 /private</mark> — copying every Set-Cookie header onto the redirect.',
    steps: [
      ['Capture email', 'Clone the request; stash the email for error paths.'],
      ['Form → JSON', 'Rewrite the url-encoded body as application/json.'],
      ['auth.handler', 'Call better-auth in-process, get a Response back.'],
      ['Map outcome', '200 verified → 303 private; 403 → await-verification; 401 → error.'],
      ['Copy cookies', 'better-auth Set-Cookie headers move onto the 303.'],
    ],
    cond: [],
  },
  {
    id: 'CK', code: 'CK', name: 'Flash cookies', short: 'FLASH COOKIES', group: 'pages',
    gx: 12.8, gy: 7.2, w: 2, d: 2, h: 20, kind: 'box',
    one: 'One-shot cookies that carry messages across a redirect.',
    what: 'POST handlers never render; they redirect. To show "check your email" or "invalid credentials" on the next page, the handler sets a cookie that the layout reads, renders as an alert, and deletes. EMAIL_ENTERED remembers the address on the verification pages.',
    how: '<code>redirects.tsx</code>: <code>redirectWithMessage</code> / <code>redirectWithError</code> build a <mark>303 + Set-Cookie</mark> (MESSAGE_FOUND / ERROR_FOUND — httpOnly, sameSite=Strict). <code>useLayout</code> retrieves and removes them on every render; <code>cookie-support.ts</code> wraps the hono cookie helpers. Project rule: never use <code>c.redirect</code> directly.',
    steps: [
      ['Set', 'The handler appends Set-Cookie to the 303 response.'],
      ['Carry', 'The browser sends the cookie with the next GET.'],
      ['Render', 'The layout reads it into an alert banner.'],
      ['Clear', 'The layout deletes it — one shot only.'],
    ],
    cond: [],
  },
  {
    id: 'BA', code: 'BA', name: 'Better-auth', short: 'BETTER-AUTH', group: 'auth',
    gx: 8.8, gy: 9.8, w: 3, d: 3, h: 64, kind: 'tall',
    one: 'The auth engine: passwords, sessions, verification and reset tokens.',
    what: 'better-auth does the security-critical work — hashing passwords, issuing session tokens, generating email-verification and password-reset tokens, and owning the user/session/account/verification tables through its Drizzle adapter. App code reaches it two ways: the /api/auth/* HTTP handler, or in-process auth.api.* calls from form handlers.',
    how: '<code>lib/auth.ts</code> builds the instance: <code>drizzleAdapter(client, {provider: \'sqlite\'})</code>, email+password with <mark>requireEmailVerification</mark>, 30-day sessions refreshed daily, and <code>sendVerificationEmail</code> / <code>sendResetPassword</code> delegated to our email service. <code>/api/auth/sign-up/email</code> is 404\'d — sign-up only happens through our form handlers so the modes apply.',
    steps: [
      ['getSession', 'Middleware resolves the session cookie → user+session, per request.'],
      ['signUpEmail', 'Creates user + credential account; fires the verification email.'],
      ['signInEmail', 'Verifies the password, issues the session-token cookie.'],
      ['verifyEmail', 'Token in the link → emailVerified = true.'],
      ['resetPassword', 'Reset token → new password hash on the account row.'],
    ],
    cond: [
      {
        q: "Which tables are better-auth's vs ours?",
        r: 'user/session/account/verification are its schema; singleUseCode + interestedEmail are ours (src/db/schema.ts).',
      },
      {
        q: 'Where does the secret live?',
        r: 'BETTER_AUTH_SECRET env var, checked at boot and again per request.',
      },
    ],
  },
  {
    id: 'RL', code: 'RL', name: 'Rate limiter', short: 'RATE LIMIT', group: 'auth',
    gx: 5, gy: 10.5, w: 2, d: 2, h: 30, kind: 'gate',
    one: 'Cooldown clocks that keep verification and reset emails from flooding inboxes.',
    what: 'Two dedicated timestamp columns on the account table record when each kind of email was last sent; handlers refuse another send until the window passes. Forgot-password additionally keeps an in-memory map so unknown emails get throttled identically — no "does this account exist" timing leak.',
    how: '<code>account.lastResetEmailAt</code> and <code>lastVerificationEmailAt</code> are updated through db-access helpers — <mark>deliberately not account.updatedAt, which better-auth rewrites</mark>. <code>handle-forgot-password.ts</code> keeps <code>emailRateLimitCache</code>, an isolate-local Map. Window: 3s in dev, 30s in prod (PRODUCTION comments).',
    steps: [
      ['Read clock', 'Load the last-sent timestamp for this account.'],
      ['Compare', 'now − lastSent vs the EMAIL_RESEND_TIME window.'],
      ['Deny', 'Under the window → 303 with a wait-N-seconds error.'],
      ['Send', 'Past the window → send the email, then stamp now.'],
    ],
    cond: [
      'The in-memory forgot-password cache is per-isolate — Cloudflare may run many; it also resets on redeploy. Acceptable at this scale, or move to D1?',
      {
        q: 'Is the clock time-travel wired?',
        r: 'Only halfway — set-clock stores a delta cookie, but the rate-limit code calls Date.now() directly; nothing reads the delta yet.',
      },
    ],
  },
  {
    id: 'DA', code: 'DA', name: 'Data access', short: 'DB ACCESS', group: 'data',
    gx: 12.2, gy: 10.8, w: 2, d: 2, h: 24, kind: 'box',
    one: 'Our own queries — every one retried and wrapped in a Result, never a bare throw.',
    what: 'The reads and writes the app does outside better-auth: looking up a user with their credential account, stamping rate-limit clocks, atomically claiming invite codes, inserting waitlist emails, deleting accounts. Every call goes through withRetry → Result<T,Error>, so handlers branch on isOk/isErr instead of try/catch.',
    how: '<code>lib/db-access.ts</code> + <code>db/client.ts</code> (<code>drizzle(d1, {schema})</code> per request). <code>withRetry</code> uses async-retry (5 tries, 20ms dev / 200ms prod floor). <mark>claimSingleUseCode is a single UPDATE … WHERE email IS NULL</mark> — race-safe without transactions. Result type from true-myth.',
    steps: [
      ['Build client', 'drizzle() around the PROJECT_DB D1 binding.'],
      ['Query', 'drizzle select/update/delete for the operation.'],
      ['Retry', 'async-retry reruns failures per STANDARD_RETRY_OPTIONS.'],
      ['Wrap', 'Outcome → Result.ok / Result.err for the caller.'],
    ],
    cond: [],
  },
  {
    id: 'D1', code: 'D1', name: 'D1 database', short: 'D1 DATABASE', group: 'data',
    gx: 14.5, gy: 11, w: 3, d: 3, h: 32, kind: 'store',
    one: 'One SQLite database at the edge holding the whole auth state.',
    what: 'Six tables. Four belong to better-auth — user, session, account (password hashes, plus our rate-limit columns riding along), verification (email and reset tokens). Two are ours — singleUseCode for gated sign-up, interestedEmail for the waitlist.',
    how: 'Bound as <code>PROJECT_DB</code> in <code>wrangler.jsonc</code>; schema in <code>src/db/schema.ts</code>, migrations via <code>drizzle-kit generate</code> → <code>drizzle/</code>, applied by <code>build-schema-update.sh</code> locally or <code>schema-prod.sql</code> remotely. <mark>user.name is UNIQUE</mark> — display names double as identity. Deleting a user cascades to sessions and accounts.',
    steps: [
      ['user', 'id, name (unique), email (unique), emailVerified.'],
      ['session', 'token, expiresAt, userId — cascades on user delete.'],
      ['account', 'credential password hash + lastReset/VerificationEmailAt.'],
      ['verification', 'identifier / value / expiresAt token rows.'],
      ['singleUseCode', 'code PK; email NULL means unclaimed.'],
      ['interestedEmail', 'email PK — the waitlist.'],
    ],
    cond: [
      {
        q: 'drizzle-kit migrations or hand SQL?',
        r: 'Both — drizzle-kit generates SQL, build-schema-update.sh applies to local D1, and prod uses a manually derived schema-prod.sql.',
      },
    ],
  },
  {
    id: 'IC', code: 'IC', name: 'Invite gate', short: 'INVITE GATE', group: 'data',
    gx: 15, gy: 14.6, w: 2.5, d: 2, h: 26, kind: 'gate',
    one: "Gated mode's bouncer: a single-use code, claimed atomically, released if sign-up fails.",
    what: "In GATED or BOTH mode the sign-up form carries a code. The handler claims it with one conditional UPDATE — only a request that finds the code unclaimed wins — then creates the account. If anything downstream fails, the claim is released so a real user doesn't lose their invite to a transient error.",
    how: '<code>processGatedSignUp</code> in <code>sign-up-utils.ts</code>: <code>claimSingleUseCode</code> → <code>signUpEmail</code> → on failure <code>releaseSingleUseCode</code>, which only releases if the code is still held by that email. Interest mode instead inserts into <code>interestedEmail</code>; a unique-violation means "already on the waitlist" — <mark>no account is ever created</mark>.',
    steps: [
      ['Claim', 'UPDATE singleUseCode SET email WHERE code=? AND email IS NULL.'],
      ['Check', '1 row changed → claimed; 0 → invalid or already used.'],
      ['Sign up', 'Create the account through better-auth as usual.'],
      ['Release', 'On failure, clear the claim only if we still hold it.'],
    ],
    cond: [
      'Who hands out codes? There is no admin UI — codes arrive via sqlite3/SQL inserts (the test seed provides WELCOME2024 and friends).',
    ],
  },
  {
    id: 'EM', code: 'EM', name: 'Email service', short: 'EMAIL SVC', group: 'auth',
    gx: 5.8, gy: 14, w: 2.5, d: 2, h: 24, kind: 'box',
    one: 'Two transports, one job: confirmation and reset emails that actually arrive.',
    what: 'better-auth asks us to send mail at two moments — verify your address, reset your password. In dev and tests the message goes by SMTP to Mailpit; in production it is a POST to an email-relay endpoint with a bearer code.',
    how: '<code>lib/email-service.ts</code>: <code>getEmailConfig</code> detects test mode → nodemailer to <code>127.0.0.1:1025</code> (overridable via <code>/test/set-smtp-config</code> for failure tests); otherwise <code>fetch(EMAIL_SEND_URL)</code> with <code>EMAIL_SEND_CODE</code> — <mark>a non-2xx throws, so a failed send is never reported as sent</mark>. The user name is HTML-escaped in the template.',
    steps: [
      ['Pick transport', 'Test/dev → SMTP; production → relay POST.'],
      ['Render', 'Inline HTML + text templates with escaped fields.'],
      ['Send', 'nodemailer.sendMail, or fetch to EMAIL_SEND_URL.'],
      ['Report', 'Throw on failure so the caller can flash an error.'],
    ],
    cond: [
      {
        q: "sending_site 'cls.cloud'?",
        r: 'Hardcoded in the relay POST body — looks like a leftover from another project; fix before prod.',
      },
    ],
  },
  {
    id: 'MP', code: 'MP', name: 'Mailpit', short: 'MAILPIT', group: 'dev',
    gx: 2.8, gy: 13.2, w: 2, d: 2, h: 20, kind: 'box',
    one: 'The dev-side SMTP sink that catches every email the app sends.',
    what: "A local binary run alongside wrangler dev. The app's test-mode transport points at it, so sign-up verifications and reset links land in Mailpit's web UI instead of a real inbox — and Playwright reads them from its API.",
    how: '<code>run-dev.sh</code> starts wrangler + Mailpit together (concurrently). SMTP on <code>127.0.0.1:1025</code>, web UI at <code>http://localhost:8025</code>. e2e helpers poll Mailpit for the latest message to extract verification and reset links.',
    steps: [
      ['Start', 'run-dev.sh launches Mailpit beside wrangler.'],
      ['Catch', 'The app delivers mail over SMTP to :1025.'],
      ['Inspect', 'Humans use the :8025 UI; tests use the API.'],
    ],
    cond: [],
  },
  {
    id: 'TR', code: 'TR', name: 'Test hooks', short: 'TEST HOOKS', group: 'dev',
    gx: 10.2, gy: 14.4, w: 2.5, d: 2, h: 30, kind: 'job',
    one: 'Dev-only routes that let tests reach inside the running app.',
    what: 'A set of /test/* endpoints plus a few auth/* toggles that exist only when ENABLE_TEST_ROUTES or PLAYWRIGHT is set: clear or seed the database, count rows, check codes, override SMTP, clear the rate-limit cache, set a clock delta, inject D1 failures, and report the sign-up mode.',
    how: '<code>routes/test/{database,sign-up-mode,smtp-config}.ts</code> routers plus <code>handle-{set,reset}-clock.ts</code> and <code>handle-set-db-failures.ts</code>, mounted only when <code>isTestRouteEnabled</code> — <mark>all marked PRODUCTION:REMOVE and stripped by clean-for-production.rb</mark>. The CSRF middleware skips /test/*.',
    steps: [
      ['Seed', 'POST /test/database/seed → fixture users, accounts, codes.'],
      ['Clear', 'DELETE /test/database/clear between specs.'],
      ['Time', 'GET /auth/set-clock/:delta stores a delta cookie.'],
      ['Fail', 'SMTP override + DB_FAIL cookies simulate outages.'],
    ],
    cond: [
      {
        q: 'Does the clock delta do anything yet?',
        r: 'Nothing reads it — handlers call Date.now() directly and getCurrentTime has no callers. Dead wiring: wire it or remove it.',
      },
    ],
  },
  {
    id: 'E2E', code: 'E2E', name: 'Playwright suite', short: 'PLAYWRIGHT', group: 'dev',
    gx: 2.9, gy: 15.5, w: 2.5, d: 2, h: 32, kind: 'job',
    one: 'A full Playwright harness that drives real sign-up, sign-in and reset journeys.',
    what: 'Browser tests per sign-up mode plus general, profile and reset coverage, sharing helpers for navigation, forms, DB seeding, Mailpit reads and mode detection. Specs skip themselves when the dev server is in the wrong SIGN_UP_MODE.',
    how: '<code>e2e-tests/</code> folders per mode; <code>support/*-helpers.ts</code> wrap the common flows — <code>db-helpers</code> calls <code>/test/database/*</code>, <code>auth-helpers</code> drives journeys, <code>mode-helpers</code> reads <code>/test/sign-up-mode</code>. Run <code>npx playwright test</code> against an <code>npm run dev-*</code> server. <mark>data-testid attributes are the contract.</mark>',
    steps: [
      ['Seed', 'Spec clears/seeds the DB through /test/database/*.'],
      ['Drive', 'Fill forms, submit, assert redirects + flash text.'],
      ['Read mail', 'Poll Mailpit for the verification or reset link.'],
      ['Skip modes', 'mode-helpers skip specs not matching SIGN_UP_MODE.'],
    ],
    cond: [],
  },
  {
    id: 'GH', code: 'GH', name: 'Retained utilities', short: 'RETAINED', group: 'off',
    ghost: true,
    gx: 20, gy: 6.5, w: 2, d: 2, h: 24, kind: 'box',
    one: 'Kept-on-purpose helpers with zero callers today.',
    what: 'po-notify.ts posts Pushover alerts to a phone when PO_APP_ID and PO_USER_ID are set. send-email.ts is a reference SMTP/OTP sender. generate-code.ts makes a 6-digit code. None are imported by any route — they are marked "do not delete without confirming."',
    how: '<code>lib/po-notify.ts</code> (env-gated <code>pushoverNotify</code>), <code>lib/send-email.ts</code> (<code>sendOtpToUserViaEmail</code> via nodemailer+retry+Result), <code>lib/generate-code.ts</code> (<code>generateToken</code>). <mark>Zero call sites in src/.</mark>',
    steps: [
      ['Kept', 'Doc comment in each file says to confirm before deleting.'],
      ['Gated', 'Pushover only sends when both env vars exist.'],
      ['Waiting', 'Likely first call site: a "new user signed up" alert.'],
    ],
    cond: [
      'First call site for Pushover: new-sign-up notification, or error spike? Undecided — currently zero callers.',
    ],
  },
  {
    id: 'PD', code: 'PD', name: 'Prod pipeline', short: 'PROD PIPELINE', group: 'off',
    ghost: true,
    gx: 20.5, gy: 12.5, w: 2.5, d: 2, h: 30, kind: 'job',
    one: 'The plan for shipping — strip dev wiring, swap PRODUCTION markers, deploy — never run end to end.',
    what: 'prod_deploy.sh is meant to build the static index.html, run clean-for-production.rb to remove test routes and dev-only code, swap every PRODUCTION:REMOVE/UNCOMMENT marker, then wrangler deploy. The README warns it is "currently untested, and probably broken."',
    how: 'Marker convention across the codebase: <code>// PRODUCTION:REMOVE</code> deletes a line or block, <code>// PRODUCTION:UNCOMMENT</code> activates the prod variant, <code>// PRODUCTION:REMOVE-NEXT-LINE</code> drops the following line. <mark>clean-for-production.rb does the rewrite</mark>; prod secrets (SMTP_*, CLOUDFLARE_*, PO_*) live on Cloudflare.',
    steps: [
      ['Build', 'Compile index.html + stylesheet into public/.'],
      ['Strip', 'clean-for-production removes test routes + dev code.'],
      ['Swap', 'PRODUCTION markers flip origins, limits, CSP, durations.'],
      ['Deploy', 'wrangler deploy --minify with prod secrets set.'],
    ],
    cond: [
      'prod_deploy.sh is untested per README — needs a dry run plus an e2e smoke pass before it can be trusted.',
    ],
  },
];

// Flows for the final "whole system" chapter. Hop = [from, to, label, payload, bend('xy'|'yx')]
// Return hops take the other bend so request and reply dots don't overlap.
export const FLOWS = [
  {
    id: 'signin', name: 'Sign in',
    hops: [
      ['U', 'X', 'POST sign-in form', { method: 'POST', path: '/api/auth/sign-in/email', email: 'me@x.io' }, 'yx'],
      ['X', 'BA', 'JSON credentials', { email: 'me@x.io', password: '••••••••' }, 'xy'],
      ['BA', 'D1', 'SELECT user + account', { via: 'drizzle adapter' }, 'xy'],
      ['D1', 'BA', 'row', { emailVerified: true, password: 'hash:salt' }, 'yx'],
      ['BA', 'X', '200 + Set-Cookie', { sessionToken: 'eyJ…', expiresIn: '30d' }, 'yx'],
      ['X', 'U', '303 → /private', { status: 303, setCookie: ['session_token', 'MESSAGE_FOUND=Welcome!'] }, 'xy'],
    ],
  },
  {
    id: 'signup', name: 'Sign up & verify',
    hops: [
      ['U', 'W', 'POST /auth/sign-up', { name: 'Me', email: 'me@x.io', password: '••••••••' }, 'yx'],
      ['W', 'BA', 'signUpEmail', { email: 'me@x.io', callbackURL: '/auth/sign-in/true' }, 'xy'],
      ['BA', 'D1', 'insert user + account + token', { tables: ['user', 'account', 'verification'] }, 'xy'],
      ['BA', 'EM', 'sendConfirmationEmail', { subject: 'Confirm Your Email Address' }, 'yx'],
      ['EM', 'MP', 'SMTP :1025', { to: 'me@x.io' }, 'xy'],
      ['W', 'U', '303 → await-verification', { setCookie: 'EMAIL_ENTERED=me@x.io' }, 'xy'],
      ['U', 'W', 'GET verify-email?token', { token: 'abc123…' }, 'xy'],
      ['W', 'BA', 'verifyEmail', { token: 'abc123…' }, 'yx'],
      ['BA', 'D1', 'emailVerified = true', { update: 'user' }, 'yx'],
      ['W', 'U', 'confirmation page', { status: 200, alert: 'Email Confirmed!' }, 'yx'],
    ],
  },
  {
    id: 'reset', name: 'Password reset',
    hops: [
      ['U', 'W', 'POST forgot-password', { email: 'me@x.io' }, 'yx'],
      ['W', 'RL', 'rate check', { lastResetEmailAt: 'T−40s', window: '3s' }, 'xy'],
      ['RL', 'W', 'allowed', { allowed: true }, 'yx'],
      ['W', 'BA', 'requestPasswordReset', { email: 'me@x.io', redirectTo: '/auth/reset-password' }, 'xy'],
      ['BA', 'EM', 'sendPasswordResetEmail', { subject: 'Reset Your Password' }, 'xy'],
      ['EM', 'MP', 'SMTP :1025', { to: 'me@x.io' }, 'xy'],
      ['W', 'DA', 'stamp lastResetEmailAt', { update: 'account' }, 'xy'],
      ['W', 'U', '303 → waiting-for-reset', { msg: 'If an account exists…' }, 'xy'],
      ['U', 'W', 'POST reset + token', { token: 'abc123…', password: '••••••••' }, 'xy'],
      ['W', 'BA', 'resetPassword', { token: 'abc123…', newPassword: '••••••••' }, 'yx'],
      ['BA', 'D1', 'update password hash', { update: 'account' }, 'yx'],
      ['W', 'U', '303 → sign-in', { msg: 'Password has been reset' }, 'yx'],
    ],
  },
  {
    id: 'gated', name: 'Gated sign-up',
    hops: [
      ['U', 'W', 'POST sign-up + code', { code: 'WELCOME2024', email: 'me@x.io' }, 'yx'],
      ['W', 'IC', 'claimSingleUseCode', { code: 'WELCOME2024' }, 'xy'],
      ['IC', 'D1', 'UPDATE … WHERE email IS NULL', { rowsChanged: 1 }, 'xy'],
      ['D1', 'IC', 'claimed', { claimed: true }, 'yx'],
      ['IC', 'W', 'code ok', { code: 'WELCOME2024', holder: 'me@x.io' }, 'yx'],
      ['W', 'BA', 'signUpEmail', { email: 'me@x.io' }, 'xy'],
      ['BA', 'D1', 'insert user + account', { tables: ['user', 'account'] }, 'yx'],
      ['BA', 'EM', 'confirmation email', { subject: 'Confirm Your Email' }, 'yx'],
      ['EM', 'MP', 'SMTP :1025', { to: 'me@x.io' }, 'yx'],
      ['W', 'U', '303 → await-verification', { setCookie: 'EMAIL_ENTERED=me@x.io' }, 'xy'],
    ],
  },
  {
    id: 'waitlist', name: 'Interest / waitlist',
    hops: [
      ['U', 'W', 'POST interest-sign-up', { email: 'curious@x.io' }, 'yx'],
      ['W', 'DA', 'addInterestedEmail', { email: 'curious@x.io' }, 'xy'],
      ['DA', 'D1', 'INSERT interestedEmail', { email: 'curious@x.io' }, 'xy'],
      ['D1', 'DA', 'ok / unique-fail', { inserted: true }, 'yx'],
      ['DA', 'W', 'Result.ok', { added: true }, 'yx'],
      ['W', 'U', '303 waitlist message', { msg: 'added to our waitlist' }, 'xy'],
    ],
  },
  {
    id: 'session', name: 'Signed-in request',
    hops: [
      ['U', 'W', 'GET /private + cookie', { cookie: 'session_token=eyJ…' }, 'yx'],
      ['W', 'BA', 'getSession', { headers: 'cookie: session_token' }, 'xy'],
      ['BA', 'D1', 'SELECT session + user', { via: 'drizzle adapter' }, 'yx'],
      ['D1', 'BA', 'row', { user: 'me@x.io', expiresAt: '+30d' }, 'xy'],
      ['BA', 'W', 'user + session', { user: 'me@x.io' }, 'yx'],
      ['W', 'U', 'private page', { status: 200, greeting: 'Welcome, me!' }, 'xy'],
    ],
  },
  {
    id: 'test', name: 'E2E pass',
    hops: [
      ['E2E', 'TR', 'POST /test/database/seed', { users: 2, codes: 5 }, 'xy'],
      ['TR', 'D1', 'insert fixtures', { tables: ['user', 'account', 'singleUseCode'] }, 'xy'],
      ['E2E', 'U', 'drive sign-up', { action: 'fill + submit form' }, 'yx'],
      ['U', 'W', 'POST /auth/sign-up', { email: 'e2e@x.io' }, 'yx'],
      ['W', 'EM', 'send verification', { subject: 'Confirm Your Email' }, 'xy'],
      ['EM', 'MP', 'SMTP :1025', { to: 'e2e@x.io' }, 'xy'],
      ['E2E', 'MP', 'read link via API', { poll: 'mailpit message API' }, 'xy'],
    ],
  },
];

// Chapters = progressive disclosure. Each reveals ≤3 structures and runs ONE small flow.
// The last chapter has reveal: [] and flow: null → everything + flow picker.
export const CH = [
  {
    id: 'you', title: 'You and the worker', reveal: ['U', 'W'],
    lede: 'Everything here is one request at a time: you ask, the worker answers.',
    story: '<p>A visitor opens a page and the Worker renders it — no SPA, no hydration, just HTML. <mark>Every interaction in this system is a plain HTTP request.</mark></p>',
    flow: [
      ['U', 'W', 'GET /auth/sign-in', { method: 'GET', path: '/auth/sign-in' }],
      ['W', 'U', 'HTML page', { status: 200, contentType: 'text/html' }],
    ],
  },
  {
    id: 'guards', title: 'Guards at the door', reveal: ['G'],
    lede: 'Before any route runs, every request passes the same gantlet.',
    story: '<p>Security headers, a CSRF origin check, a 1kb body cap, then — for private pages — a session check. <mark>Failing any check means a redirect or a flat error, never a stack trace.</mark></p>',
    flow: [
      ['U', 'G', 'POST + headers', { origin: 'http://localhost:3000', bytes: 210 }],
      ['G', 'W', 'passed', { checks: ['headers', 'csrf', 'limit', 'env'] }],
      ['W', 'U', '303 → /auth/sign-in', { status: 303, setCookie: 'ERROR_FOUND=…' }],
    ],
  },
  {
    id: 'pages', title: 'Pages and postcards', reveal: ['PG', 'CK', 'ST'],
    lede: 'Pages are rendered server-side; messages travel as cookies on the redirect.',
    story: '<p>POSTs never return HTML — they 303 back with a one-shot flash cookie, and the layout turns the cookie into an alert on the next page. <mark>Redirects are the reply.</mark></p>',
    flow: [
      ['U', 'ST', 'GET /style-*.css', { path: '/style-20250722184943.css' }],
      ['ST', 'U', 'stylesheet', { status: 200, via: 'ASSETS binding' }],
      ['U', 'W', 'POST sign-in (bad creds)', { email: 'me@x.io', password: 'wrong' }],
      ['W', 'U', '303 + flash cookie', { status: 303, setCookie: 'ERROR_FOUND=Invalid…' }],
      ['U', 'W', 'GET /auth/sign-in', { cookie: 'ERROR_FOUND=…' }],
      ['W', 'PG', 'render + read cookie', { layout: 'navbar + alert + footer' }],
      ['PG', 'W', 'JSX → HTML', { testid: 'sign-in-page' }],
      ['W', 'U', 'page showing the error', { alert: 'Invalid email or password…' }],
    ],
  },
  {
    id: 'brain', title: 'The auth brain', reveal: ['BA', 'X'],
    lede: "better-auth owns the hard part; an adapter translates form posts into its JSON world.",
    story: "<p>The sign-in form posts to better-auth's own URL — but HTML people need redirects, not JSON. <mark>A gate converts the request and the response in both directions.</mark></p>",
    flow: [
      ['U', 'X', 'POST /api/auth/sign-in/email', { email: 'me@x.io', password: '••••••••' }],
      ['X', 'BA', 'JSON credentials', { email: 'me@x.io', password: '••••••••' }],
      ['BA', 'X', '200 + Set-Cookie', { sessionToken: 'eyJ…', expiresIn: '30d' }],
      ['X', 'U', '303 → /private', { setCookie: ['session_token', 'MESSAGE_FOUND'] }],
    ],
  },
  {
    id: 'memory', title: 'What it remembers', reveal: ['DA', 'D1'],
    lede: 'Six tables in one D1 database hold every user, session, token and invite.',
    story: '<p>better-auth reads and writes four tables through its Drizzle adapter; our handlers touch the rest through a retry-and-Result layer. <mark>All state lives in D1 — nothing is kept in the Worker.</mark></p>',
    flow: [
      ['U', 'W', 'GET /private + cookie', { cookie: 'session_token=eyJ…' }],
      ['W', 'BA', 'getSession', { headers: 'cookie: session_token' }],
      ['BA', 'D1', 'SELECT session + user', { via: 'drizzle adapter' }],
      ['D1', 'BA', 'row', { user: 'me@x.io', expiresAt: '+30d' }],
      ['BA', 'W', 'user + session', { user: 'me@x.io' }],
      ['W', 'U', 'private page', { status: 200, greeting: 'Welcome, me!' }],
    ],
  },
  {
    id: 'joining', title: 'Joining up', reveal: ['EM', 'MP'],
    lede: 'Sign-up ends with an email; in dev, Mailpit catches it.',
    story: '<p>handle-sign-up calls signUpEmail, which creates the user and fires a verification email. <mark>The account exists but stays unusable until the link is clicked.</mark></p>',
    flow: [
      ['U', 'W', 'POST /auth/sign-up', { name: 'Me', email: 'me@x.io' }],
      ['W', 'BA', 'signUpEmail', { email: 'me@x.io', callbackURL: '/auth/sign-in/true' }],
      ['BA', 'D1', 'insert user + account + token', { tables: ['user', 'account', 'verification'] }],
      ['BA', 'EM', 'sendConfirmationEmail', { subject: 'Confirm Your Email Address' }],
      ['EM', 'MP', 'SMTP :1025', { to: 'me@x.io' }],
      ['W', 'U', '303 → await-verification', { setCookie: 'EMAIL_ENTERED=me@x.io' }],
    ],
  },
  {
    id: 'invites', title: 'Invitations & the waitlist', reveal: ['IC'],
    lede: 'Gated mode trades a code for an account; interest mode just takes your email.',
    story: "<p>The code is claimed in one conditional UPDATE so two simultaneous sign-ups can't spend it twice — and released if account creation fails. <mark>Atomic claim, generous release.</mark></p>",
    flow: [
      ['U', 'W', 'POST sign-up + code', { code: 'WELCOME2024', email: 'me@x.io' }],
      ['W', 'IC', 'claimSingleUseCode', { code: 'WELCOME2024' }],
      ['IC', 'D1', 'UPDATE … WHERE email IS NULL', { rowsChanged: 1 }],
      ['D1', 'IC', 'claimed', { claimed: true }],
      ['IC', 'W', 'code ok', { code: 'WELCOME2024', holder: 'me@x.io' }],
      ['W', 'BA', 'signUpEmail', { email: 'me@x.io' }],
      ['W', 'U', '303 → await-verification', {}],
    ],
  },
  {
    id: 'throttle', title: "Don't flood the inbox", reveal: ['RL'],
    lede: 'Every email send is stamped; the next one waits.',
    story: "<p>Resend-verification and forgot-password check a per-account clock before sending — and forgot-password throttles unknown emails too, so timing never reveals who's registered. <mark>Rate limits are rows in the database, not a guess.</mark></p>",
    flow: [
      ['U', 'W', 'POST /auth/resend-email', { email: 'me@x.io' }],
      ['W', 'RL', 'read lastVerificationEmailAt', { lastSent: 'T−2s', window: '3s' }],
      ['RL', 'W', 'denied', { remainingSeconds: 1 }],
      ['W', 'U', '303 + wait error', { error: 'Please wait 1 more second…' }],
    ],
  },
  {
    id: 'rig', title: 'The test rig', reveal: ['TR', 'E2E'],
    lede: 'Dev-only routes plus a Playwright suite that can reach inside the app.',
    story: '<p>Specs seed and clear the database, read email from Mailpit, skip cooldowns and fake outages — all through endpoints that exist only in dev. <mark>Nothing test-shaped ships: PRODUCTION:REMOVE strips it.</mark></p>',
    flow: [
      ['E2E', 'TR', 'POST /test/database/seed', { users: 2, codes: 5 }],
      ['TR', 'D1', 'insert fixtures', { tables: ['user', 'account', 'singleUseCode'] }],
      ['E2E', 'U', 'drive sign-up', { action: 'fill + submit' }],
      ['U', 'W', 'POST /auth/sign-up', { email: 'e2e@x.io' }],
      ['W', 'EM', 'send verification', { subject: 'Confirm Your Email' }],
      ['EM', 'MP', 'SMTP :1025', {}],
      ['E2E', 'MP', 'read link via API', { poll: 'mailpit API' }],
    ],
  },
  {
    id: 'later', title: 'Later', reveal: ['GH', 'PD'],
    lede: 'Designed for, not switched on.',
    story: '<p>Pushover alerts, an OTP sender and a code generator exist with zero callers. The production pipeline exists on paper — markers, strip script, secrets list — <mark>but has never been run end to end.</mark></p>',
    flow: [
      ['W', 'GH', 'notify (unused)', { message: 'new user: me@x.io' }],
      ['PD', 'ST', 'publish index.html', { file: 'public/index.html' }],
    ],
  },
  {
    id: 'all', title: 'The whole system', reveal: [],
    lede: 'Everything at once, for free exploration.',
    story: '<p>Pick a journey bottom-left — sign-in, sign-up, reset, gated, waitlist, a signed-in request, or a test pass. Hover to read, click to pin, → goes inside. The <mark>Open questions</mark> tab lists every question by ID.</p>',
    flow: null,
  },
];

// "How it's built" tab with nothing selected (HTML).
export const HOW_HTML = `<div class="eyebrow">mini-auth · Cloudflare Worker</div><h1 class="t">How it's built</h1><div class="sub">one worker, one database, no client JS</div>
<h3 class="sec">Stack</h3><p>Hono on a Cloudflare Worker · better-auth for credentials · Drizzle ORM over D1 (SQLite) · valibot for form validation · Tailwind + DaisyUI compiled to one stylesheet · nodemailer to Mailpit in dev / HTTP relay in prod.</p>
<h3 class="sec">Conventions</h3><ul><li>POSTs redirect (303) with a one-shot flash cookie — they never render.</li><li>Sign-up routes are mounted per <code>SIGN_UP_MODE</code> at boot.</li><li>Test-only code is marked <code>PRODUCTION:REMOVE</code> and stripped before deploy.</li><li>Elements carry <code>data-testid</code> in kebab-case for Playwright.</li></ul>
<h3 class="sec">Filesystem</h3><pre>src/
  index.ts        app assembly: middleware → auth → mode routes → 404
  constants.ts    PATHS · COOKIES · SIGN_UP_MODES · MESSAGES · DURATIONS
  middleware/     validateEnvBindings · signedInAccess
  db/             client.ts (drizzle+D1) · schema.ts (6 tables)
  lib/            auth · db-access · redirects · cookie-support
                  email-service · validators · sign-up-utils
                  time-access · po-notify · send-email (retained)
  routes/
    build-*.tsx   GET pages      handle-*.ts  POST handlers
    auth/         sign-in/up/out, verify, resend, forgot/reset
    profile/      profile, change password, delete account
    test/         /test/* routers — dev only
public/           compiled stylesheet (ASSETS binding)
e2e-tests/        Playwright specs + support helpers</pre>`;
