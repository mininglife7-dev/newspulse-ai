# Lessons Learned (Permanent)

Append-only institutional memory. Every completed task, incident, or
reversal records: what happened, why, evidence, lesson, prevention.
Future decisions must consult this file.

---

## L-001 — Duplicate parallel implementations waste the most work

- **What happened:** Multiple parallel sessions built the same features;
  duplicate PRs were closed unmerged.
- **Evidence:** DECISION_REGISTER DR-0006; recurring stale-PR queues
  (RISK-003).
- **Lesson:** The cheapest hour is the one spent searching `main` and open
  PRs before building.
- **Prevention:** "Check before you build" rule in CLAUDE.md; CLAIM-PROTOCOL;
  Governor PR-queue triage every cycle.

## L-002 — An unprotected default branch will eventually lose history

- **What happened:** A force-push erased merged work on `main`; it was
  restored from a PR branch.
- **Evidence:** PR #70 restoration; CHECKPOINT-2026-07-16-DEPLOYMENT-UNBLOCK
  risk note.
- **Lesson:** Convention ("always PR") does not prevent accidents; only
  settings do.
- **Prevention:** Branch-protection setup guide (PR #130); standing Founder
  action tracked as RISK-002.

## L-003 — Status documents diverge unless one home is canonical

- **What happened:** Test counts, readiness verdicts, and health claims
  drifted across 20+ checkpoint/status docs; an external audit (PR #87)
  found dashboards self-attesting health they could not measure.
- **Evidence:** FOUNDER_BRIEF "1051/1051" vs. verified 1287/20-skipped on
  2026-07-16; PR #87 findings.
- **Lesson:** Every fact needs exactly one authoritative location; every
  metric needs a measurement, not an assertion.
- **Prevention:** Operating rule 3 in [governor README](../README.md);
  health scores must cite evidence (charter requirement).

## L-004 — Autonomous pipelines should be driven to the exact human gate

- **What happened:** The Supabase deploy was "blocked on Founder" for days
  in vague terms; a systematic capability audit reduced it to one named
  secret (`SUPABASE_DB_PASSWORD`) with everything else proven working.
- **Evidence:** Runs 29437042645 → 29449102068 → 29467340842 (each failing
  later in the pipeline); PRs #118, #136, #137, #132.
- **Lesson:** "Blocked externally" is only actionable when narrowed to the
  smallest possible human action with exact instructions.
- **Prevention:** Escalations to the Founder must name the single action,
  where to perform it, and what the system will verify automatically after.
