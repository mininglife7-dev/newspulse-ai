# 📋 Founder Brief

Rolling status summary maintained under the
[Governor Autonomous Decision Constitution](./GOVERNOR_CONSTITUTION.md) and the
[Founder Autonomous Execution Constitution](./FOUNDER_AUTONOMOUS_EXECUTION_CONSTITUTION.md).
Updated continuously; read this instead of being interrupted.

**Last updated:** 2026-07-10
**State:** Executing — Cathedral Consolidation Mission complete; launch readiness CONDITIONAL-GO.

---

## Executive summary

The Cathedral Consolidation Mission is done. `main` is a single clean, verified
production baseline: 77/77 tests, lint clean, type-check clean, production build
succeeds, CI (including E2E smoke) green. The PR portfolio has been consolidated
from ten-plus open PRs to **one**: PR #22, the EURO AI product pivot, which is
product vision and therefore yours alone. Launch readiness is **CONDITIONAL-GO
(75%)** — ready for a demo launch pending the operational conditions listed below.

## Completed DNA

- Initial NewsPulse AI scaffold — `1f52ef3`.
- Governance framework (Advisor, Autonomous Execution, Governor constitutions;
  register; brief; communication standards) — PRs #9, #10, #20.
- CI repair (lockfile), Node alignment, workflow cleanup — DR-0003, PRs #13, #14.
- Security hardening: auth, rate limiting, storage guard, `next` 14.2.35 CVE
  backports; 77-test suite — PRs #16, #19, #20, #23; DR-0004.
- Canonical dashboard + Dashboard Truth Reconciliation (no hardcoded metrics) —
  PR #21, `docs/integrity/`.
- **Cathedral Consolidation Mission** — DR-0006:
  - **Merged #2**: PWA install layer — the app now installs on iPhone
    (Safari → Share → Add to Home Screen) as **Governor**; rebased and re-verified.
  - **Merged #32**: `/api/search` now awaits the Supabase save — search history
    persists reliably on serverless.
  - **Merged #33**: blocker criticality classification, evidence-based
    CONDITIONAL-GO launch readiness (M-10 production deployment verified
    resolved), and `/privacy` + `/terms` legal-page scaffolding (DNA-GOV-217).
  - **Dependency batch (#34)**: supabase-js 2.110, prettier 3.9, vitest 4,
    actions/checkout v7, actions/setup-node v6 — all verified green.
  - **Closed with evidence**: #17 and #15 (superseded by newer `main`), #5 and #18
    (internal-only, no Alpha/Beta customer value; #5 also added recurring cron
    spend), #24 (stale brief; its DR-0005 preserved), Dependabot #25/#26/#27/#30
    (applied in the batch), #28/#29/#31 (blocked on the Next 15/16 migration).
  - **Branch cleanup**: merged/superseded session branches pruned; history
    preserved via PR refs.

## Launch readiness (canonical: `lib/governance-state.ts`)

- **CONDITIONAL-GO (75%)** — all five blocking-stage blockers resolved
  (M-01, M-02, M-03, M-08, M-10). Conditions before a public demo:
  - Configure production environment variables (API keys, Supabase).
  - Run database schema migrations in Supabase.
  - Verify `/api/health` on the production URL.
  - Replace `/privacy` and `/terms` placeholder text after legal review (M-07).
  - Set `ADMIN_TOKEN` in Vercel to protect delete endpoints (M-05).

## Open PR portfolio

| PR | What | Status |
| --- | --- | --- |
| #22 | **EURO AI product pivot** (auth, workspaces, EU-AI-Act governance; deletes news search/history) | **Awaiting Founder decision — the only open PR** |

## Important decisions (full entries in the Decision Register)

- **DR-0005** — Pause Next 16 migration; reconcile brief to portfolio reality.
- **DR-0006** — Cathedral Consolidation Mission executed (see register for detail).
- **DR-0007** — Blocker criticality classification (`blocksStage`) drives GO/NO-GO;
  non-blocking blockers become launch conditions.
- **DR-0008** — CONDITIONAL-GO percentage (75%) is state semantics ("ready with
  conditions"), not a progress bar.

## Risks

- **Residual security (accepted until migration):** Next 14.x is EOL; remaining
  high-severity advisories are fixed only in Next 15/16. Migration (with React 19,
  ESLint 10, openai 6) is deliberately sequenced **after** the #22 decision
  (DR-0005) — migrating code #22 may delete would be wasted work.
- **Rate limiting is per-instance** (in-memory on Vercel): the real limit is
  N × 30/min across N instances. Acceptable for a private demo; needs distributed
  Redis/KV before public launch (M-09).
- **Legal exposure:** `/privacy` and `/terms` are scaffolding, not counsel-reviewed
  text. Do not launch publicly before review (M-07).
- **#22 staleness:** the pivot PR drifts further from `main` with every merge;
  the decision should not wait indefinitely.

## Next planned work (sequenced)

1. **Founder decides #22** (adopt pivot / reject / re-scope).
2. If adopted: rebase and land #22 in verified increments; then Next 15/16 + React 19
   + ESLint 10 + openai 6 migration against the pivoted codebase.
   If rejected: run the migration against the current NewsPulse baseline.
3. Post-decision: revisit deferred concepts (CEIS, GLO, founder-view dashboards)
   as fresh increments only if prioritized.

## Founder attention required

- **One product decision: PR #22 — is EURO AI the product?** Everything else is
  sequenced behind this call.
- **Operational items (spend/legal, batched — no urgency ordering implied):**
  - M-07: review/replace `/privacy` and `/terms` legal text.
  - M-05: set `ADMIN_TOKEN` in Vercel (dashboard action).
  - M-06: pick an uptime-monitoring service to point at `/api/health`.
  - M-09: approve provisioning Upstash Redis / Vercel KV for distributed rate
    limiting (small recurring spend).
