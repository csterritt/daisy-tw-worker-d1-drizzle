# Documentation and scripts do not make the full test strategy obvious

**Priority:** Low

**Location:** `package.json:4-16`, `playwright.config.ts:7-9`

**Problem:** `package.json` only exposes `test:unit`; e2e tests exist but are not represented by a script or self-contained Playwright server config.

**Impact:** New contributors and CI may miss or misconfigure e2e execution, leading to inconsistent validation of critical flows.

**Recommendation:** Add scripts such as `test:e2e` and `test`, and document required environment/setup for running e2e tests reliably.
