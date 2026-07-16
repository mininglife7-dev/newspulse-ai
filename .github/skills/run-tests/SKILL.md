# Skill: run-tests

**Purpose:** Full local verification gate before any commit/PR.
**Inputs:** working tree with changes.
**Steps:**

1. `npm run lint` — zero errors/warnings.
2. `npm run type-check` — zero errors.
3. `npm test` — record exact counts (passed/skipped/files). Note:
   integration tests are split from the standard run (`214a382`); run them
   explicitly when touching API/DB code.
4. For UI/route changes: `npm run test:e2e` (Playwright; Chromium at
   `/opt/pw-browsers/chromium` in remote envs — never `playwright install`).
5. `npm run build` when config/deps/routes changed.
   **Expected output:** all green; counts quoted in the PR body.
   **Verification:** exit codes 0; CI reproduces the result.
   **Failure handling:** fix before proceeding — never merge red; if a failure
   is pre-existing on main, record it in PROJECT_STATE.md and the risk
   register instead of silently skipping.
