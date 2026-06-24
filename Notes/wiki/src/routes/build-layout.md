# build-layout.tsx

**Source:** `src/routes/build-layout.tsx`

## Purpose

Layout wrapper used by every page builder. Wraps page content in a navbar, flash-message area, and footer.

## Exports

### `useLayout(c, children, extraMessage?)`

Reads `MESSAGE_FOUND` cookie (or uses `extraMessage` if provided) and `ERROR_FOUND` cookie, then removes them. Sets `Content-Type: text/html; charset=utf-8`.

Returns a JSX fragment containing:

1. **Navbar** — DaisyUI `navbar` with:
   - App title link (`/`) — "Worker, D1, Drizzle Demo"
   - If NOT authenticated: "Sign in" button (`/auth/sign-in`) — `data-testid='sign-in-action'`
   - If authenticated: welcome text ("Welcome, {name or email}!"), "Profile" link (`/profile`) — `data-testid='visit-profile-action'`, and a Sign out form (`POST /auth/sign-out`) with `data-testid='sign-out-action'`

2. **Flash messages** — renders `alert-success` div for message and `alert-error` div for error (with SVG icons), then removes the cookies.

3. **Main content** — `<main className='flex-1 container mx-auto px-4 py-8'>` with `{children}`

4. **Footer** — footer with copyright text including version: `Copyright © 2025 V-{version}`

## Cross-references

- [lib/cookie-support.md](../lib/cookie-support.md) — `retrieveCookie`, `removeCookie`
- [version.md](../version.md) — `version` used in footer

---

See [source-code.md](../../source-code.md) for the full catalog.
