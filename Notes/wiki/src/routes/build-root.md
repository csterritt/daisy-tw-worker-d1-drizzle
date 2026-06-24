# build-root.tsx

**Source:** `src/routes/build-root.tsx`

## Purpose

Root page (`/`) — the public landing page for the application.

## Export

### `buildRoot(app): void`

Route: `GET /`

Middleware: `secureHeaders(STANDARD_SECURE_HEADERS)`

Renders:

- Welcome card with `data-testid='startup-page-banner'`, title "Welcome!"
- Subtitle: "Worker, D1, Drizzle Project"
- "Protected Content" button linking to `/private` — `data-testid='visit-private-action'`

## Cross-references

- [build-layout.md](build-layout.md) — layout wrapper

---

See [source-code.md](../../source-code.md) for the full catalog.
