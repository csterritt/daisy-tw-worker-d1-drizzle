# E2E test isolation helpers hard-code localhost and bypass Playwright fixtures

**Priority:** Medium

**Location:** `e2e-tests/support/db-helpers.ts:5-159` and `playwright.config.ts:7-9`

**Problem:** DB helper functions call `fetch('http://localhost:3000/...')` directly instead of using Playwright's `request` fixture or a configured `baseURL`. `testWithDatabase` accepts `{ page, request }`, but setup/cleanup ignores `request` and hard-codes the server URL.

**Impact:** Tests are less portable, harder to run on non-default ports, and can accidentally target the wrong local service. This also makes CI configuration brittle; there is no Playwright `webServer` or npm script for e2e execution in `package.json`.

**Recommendation:** Define `baseURL` and `webServer` in `playwright.config.ts`, add an e2e npm script, and pass/use the Playwright `request` fixture in database helpers instead of global `fetch` with a fixed URL.
