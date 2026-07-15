# 📋 Founder Brief

Rolling status summary maintained under the
[Governor Autonomous Decision Constitution](./GOVERNOR_CONSTITUTION.md) and the
[Founder Autonomous Execution Constitution](./FOUNDER_AUTONOMOUS_EXECUTION_CONSTITUTION.md).
Updated continuously; read this instead of being interrupted.

**Last updated:** 2026-07-10 (history reconciliation — see red flag below)
**State:** Verifying (reconciliation merge of the two divergent main lines)

---

## 🔴 Incident: `main` was force-pushed; two product lines diverged

On 2026-07-10, `main` was force-pushed from the **compliance/obligations line**
(42 commits: obligation tracking, assessments, compliance dashboard, CEIS, team
collaboration — the work DR-0017 paused to measure) to the **Hercules/operations line**
(75 commits: Hercules kernel, incident commander, cost anomaly detection, deployment
automation). Both lines grew from common ancestor `26c0615`; the force-push silently
dropped the compliance line from `main`.

**Recovery actions taken (all non-destructive):**

1. The dropped line is preserved at branch `backup/main-pre-forcepush-1719dcf`.
2. This branch is a **union merge** of both lines — nothing from either is lost.
   Conflicts existed in only 6 files; resolutions favored the stronger variant of each:
   idempotent RLS policies + structured logger (Hercules line), ESLint 9 flat config +
   SECURITY-DEFINER membership helpers and roster policies + CEIS env vars (compliance
   line), husky hooks (Hercules line), and `assessment_obligations` policies restored.
3. Full verification suite run on the merged tree before any merge to `main`.

**Standing ask (repository permissions — manual):** enable branch protection on `main`
(GitHub → Settings → Branches → protect `main`: require PRs, **forbid force pushes**).
Until then, any session can overwrite any other session's shipped work; this incident
is the proof. This is the single highest-leverage action available.

## Current DNA (active work)

- Verify and land the reconciliation merge; then resume DR-0017's pause-and-measure
  window for the compliance system (checkpoint 2026-07-17) with the Hercules
  operations layer intact alongside it.

## Important decisions

- **DR-0005** — queue gated on product direction (superseded by events: both lines shipped).
- **DR-0017** — pause-and-measure for compliance Phase 3 (checkpoint 2026-07-17) — still in force.
- **This merge** — union reconciliation chosen over picking a winner: least destructive,
  preserves all verified work, and the two systems occupy mostly disjoint files.

## Risks

- **No branch protection on `main`** — force-push recurrence remains possible (red flag above).
- Parallel sessions may still hold stale views of `main`; they should rebase onto the
  reconciled main once it lands.
- Next.js major-version churn happened during divergence (now `next` 16.2.10); the
  merged lockfile is regenerated and verified, but watch the first production deploy.

## Next planned work

- Land reconciliation → verify CI + Vercel deploy → resume the DR-0017 measurement window.
- 2026-07-17 checkpoint audit for compliance Phase 3 prioritization (unchanged).

## Founder Attention

- **Enable branch protection on `main`** (manual, ~2 minutes, prevents recurrence).
- No other decisions required; reconciliation proceeds autonomously.
