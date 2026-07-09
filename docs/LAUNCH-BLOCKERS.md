# Launch Blocker Register

Every blocker is one executable mission. Status reflects this branch (2026-07-09).
Full evidence citations are in `docs/GO-NO-GO-REPORT.md` (E1–E12).

---

## M-01 — Production build is broken on main ✅ RESOLVED (this branch)

- **Problem:** `npm run build` exits 1; the app cannot be deployed at all.
- **Evidence:** E1 — "Failed to collect page data for /api/history/[id]"; root cause is `lib/supabase.ts` creating the browser client at module top-level with missing env.
- **Impact:** Absolute blocker — nothing downstream (deploy, demo, pilot) is possible.
- **Solution implemented:** Lazy `Proxy`-based browser client; throws only on first *use* without env, never on import. PR #1 (same approach) was merged to `main` on 2026-07-09; this branch is rebased on top and keeps the variant with an explicit missing-env error message, locked in by tests.
- **Verification:** `npm run build` exit 0 with zero env vars (E2); `tests/supabase.test.ts` locks the behavior in.
- **Regression tests:** `tests/supabase.test.ts` — import-without-env, throw-on-first-use, admin memoization.
- **Rollback:** revert the single edit to `lib/supabase.ts`.
- **Risk:** minimal — the eager export was verified unused (`grep` shows no importer).

## M-02 — CI has never passed on main ✅ RESOLVED (this branch)

- **Problem:** `npm ci` and setup-node cache require a lockfile; none was committed. CI on main: failure.
- **Evidence:** E3, E4 — job log: "Dependencies lock file is not found".
- **Solution implemented:** `package-lock.json` committed; `npm test` step added to CI.
- **Verification:** CI on this PR must go green — that is the acceptance test.
- **Rollback:** revert lockfile commit (not recommended).
- **Risk:** none.

## M-03 — Critical dependency vulnerabilities ✅ RESOLVED (this branch), residual → M-04

- **Problem:** next@14.2.15 carried a **critical** middleware authorization bypass (the app's rate limiting lives entirely in middleware) plus high-severity DoS advisories.
- **Evidence:** E5.
- **Solution implemented:** upgrade to next\@14.2.35 + eslint-config-next\@14.2.35 (patch-level, zero API change).
- **Verification:** `npm audit --omit=dev` → critical gone (E6); build + 46 tests pass.
- **Rollback:** pin back to 14.2.15 (not recommended).
- **Risk:** minimal (same minor version).

## M-04 — Residual advisories require Next 15.5.16+ ⏳ OPEN (code, ~0.5–1 day)

- **Problem:** 1 high (SSRF via WebSocket upgrades) + 1 moderate (RSC cache poisoning) remain; fixes only exist in Next ≥15.5.16 / 16, a breaking upgrade (React 19, async request APIs).
- **Impact:** Moderate — advisories partially require configurations this app doesn't use, but auditors will flag any `npm audit` noise.
- **Steps:** upgrade next→15.5.x LTS backport or 16.x, react→19, run codemods (`npx @next/codemod`), fix async `params` in `/api/history/[id]` and `/history/[id]`, re-run suite.
- **Verification:** `npm audit --omit=dev` clean; build + tests green; manual smoke.
- **Rollback:** branch revert.
- **Dependencies:** M-01, M-02 merged first. **Risk:** medium (breaking changes).

## M-05 — Destructive endpoints are unauthenticated 🔶 IMPLEMENTED opt-in (this branch) — founder enables with one env var

- **Problem:** `DELETE /api/history` wipes the entire database table; `DELETE /api/history/[id]` deletes any row. No authentication exists anywhere in the app. Anyone with the URL can destroy all data.
- **Evidence:** E8.
- **Impact:** High for any public launch; acceptable only for a private demo.
- **Mitigation implemented (this branch):** rate limiting now covers these endpoints (60/min/IP) — vandalism is throttled, not prevented.
- **Implemented (opt-in):** the shared-token variant now exists in code. Set `ADMIN_TOKEN` in the deployment env → both DELETE endpoints require `Authorization: Bearer <token>`, and the UI prompts for the token when it receives 401. Env var unset = exactly the old behavior, so nothing breaks before the founder opts in.
- **Verification:** 7 unit tests cover allowed/denied/wrong-token/GET-stays-public paths (`tests/api-history.test.ts`).
- **Still open (founder):** actually setting `ADMIN_TOKEN` in Vercel, and the longer-term decision on real multi-user auth (Supabase Auth + per-user rows) if this becomes a SaaS.
- **Rollback:** unset the env var.
- **Risk:** low (additive, feature-flagged).

## M-06 — No monitoring, no alerting ⏳ OPEN (founder + ~1h)

- **Problem:** If production dies, nobody learns it from the system.
- **Evidence:** repo contains no monitor config; only `/api/health` exists.
- **Solution:** point any free uptime monitor (UptimeRobot/BetterStack/Vercel checks) at `/api/health` (this branch guarantees it is never rate-limited); alert to founder email.
- **Verification:** kill an env var in preview → monitor alerts within 5 min.
- **Dependencies:** a live deployment (M-Deploy). **Risk:** none.

## M-07 — Zero legal surface ⏳ OPEN (founder + legal, 1–2 days)

- **Problem:** No privacy policy, terms, or imprint. The app stores user search queries (personal data under GDPR) in Supabase (EU hosting status unverified). For an EU-facing launch this is a legal blocker; for a private demo it is not.
- **Evidence:** file listing — no legal docs exist.
- **Solution:** privacy policy + terms pages (`/privacy`, `/terms`) and a data-retention statement ("history stored until deleted"). Draft with counsel — **not** auto-generated as binding text (Rule 9: legal commitments are founder-only). *Progress:* the AI-transparency portion is done — every summary in the UI now carries an "AI-generated summary" label.
- **Verification:** pages live, linked in footer.
- **Risk:** none technical.

## M-08 — No UI/E2E test coverage ✅ RESOLVED (this branch)

- **Solution implemented:** 6-test Playwright smoke suite driving the real app in a real browser against a full mock of Firecrawl/OpenAI/Supabase (`tests/e2e/`, `npm run test:e2e`) — health check, search happy path (with AI-label assertion), history browse + expand, clear-with-confirm, input validation. Runs as its own CI job; needs no secrets. Screenshots for the README are captured from the live run.
- **Verification:** suite passes locally and in CI.
- **Rollback:** delete the `e2e` CI job (tests are additive).

## M-09 — Rate limiter is per-instance, in-memory ⏳ OPEN (code, ~0.5 day, needs credentials)

- **Problem:** On Vercel, each serverless/edge instance has its own `Map` — real limit is N×30/min and resets on cold start. Documented in code since day 1.
- **Solution:** Upstash Redis (or Vercel KV) sliding window. Requires founder-provisioned credentials (Rule 9 stop).
- **Risk:** low.

## M-10 — Production deployment never verified ⏳ OPEN (founder, ~30 min) — **the** critical-path item

- **Problem:** No production deployment has ever completed. The Actions deploy workflow fails (secrets empty, E4). **Update 2026-07-09:** the Vercel *Git integration* is active and successfully deployed a preview of this branch (E13) — so the path to production is simply: make `main` build, then verify runtime config. The Actions deploy workflow is now redundant; either delete it or configure its secrets.
- **Evidence:** E3, E4, E12, E13.
- **Steps:** merge this PR → Vercel auto-deploys main → open `<production-url>/api/health` and confirm `"status": "healthy"` (it reports which env vars are missing without leaking values) → set any missing env vars in Vercel dashboard → re-run `supabase/schema.sql` (updated on this branch) → run one real search → screenshot for README → delete or fix `.github/workflows/deploy.yml`.
- **Verification:** green Deploy run + healthy endpoint + persisted search visible in /history.
- **Rollback:** Vercel instant rollback to previous deployment (none exists yet — first deploy is the baseline).
- **Risk:** low; blocked exclusively on external credentials (Rule 9 stop).

---

## Non-blockers (explicitly deferred, Rule 5)

| Item | Why deferred |
|---|---|
| German localization | No verified German pilot/customer exists; i18n before demand is cosmetic |
| Investor/partner decks, pricing, ROI docs | No product identity confirmed ("EURO AI" vs NewsPulse); founder input required first |
| EU AI Act full classification dossier | Minimal-risk use case; the AI-transparency label (M-07) is the only near-term obligation with real effect |
| Structured logging / observability stack | Right-sized only after real traffic exists |
