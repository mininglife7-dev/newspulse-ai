# NEXT_ACTION — The One Active Mission

> Exactly one mission lives here. Finish it, verify it, replace it.

## Current Mission (Phase 1: Governor OS Foundation Reference Implementation)

**Implement and execute Governor OS Foundation reference mission:** build
the 13 Governor OS modules (`/lib/governor/`) as an internal orchestration
layer, prove they work end-to-end by executing a bounded, repeatable
health-check mission (lint + type-check + 5-test subset), and produce
completion report with evidence locations, test results, and security
verification.

**Branch:** `claude/governor-os-foundation-89zihp`  
**Upstream mission:** Phase 0.5 complete (all specs committed: CATHEDRAL_DNA.yaml, CATHEDRAL_GENOME.yaml, organ registry, immune/homeostasis/regeneration/evolution protocols, lineage)

## Why this mission is first (after Phase 0.5)

Phase 0.5 specifications (CATHEDRAL_DNA.yaml 1.0.0, CATHEDRAL_GENOME.yaml
1.0.0) are now machine-readable and commit-verified. Governor OS must be
proven to work before attempting the real customer-journey mission (Phase 2).
This reference mission is the internal proof: a simple, bounded, repeatable
health-check that exercises Mission Control, Planner, Capability Registry,
Policy Engine, Execution Adapter, Verification Engine, Evidence Ledger, and
Learning Candidate generation in a realistic but low-risk scenario.

## Success criteria

1. **Module implementation:** All 13 Governor OS modules in `/lib/governor/`
   with TypeScript strict, passing linting and type-check.
   - Mission model (state machine, deterministic fields)
   - Planner (task decomposition)
   - Capability Registry (verified capabilities in this environment)
   - Policy Engine (ALLOW_WITH_AUDIT for bounded commands)
   - Tool Broker (npm, git, bash with allowlist)
   - Execution Engine (timeout, retry logic, bounded output)
   - Verification Engine (exit code checking, output parsing)
   - Evidence Ledger (SQLite schema with deterministic/volatile fields)
   - Shared Memory (JSON read/write for decision context)
   - Learning Candidate generator (pattern detection)
   - Observability (structured logging, correlation IDs)
   - Adaptive Tool Acquisition (environment capability detection)

2. **Reference mission execution:** Health-check mission (lint + type-check + 5-test subset) completes successfully.
   - Baseline metrics captured (test count, coverage %)
   - Fitness score measured post-execution
   - No regressions from baseline
   - All evidence collected and stored in ledger

3. **Verification evidence:** Full audit trail of execution.
   - Mission ID (M-XXXX), task IDs (T-XXXX-01 through T-XXXX-NN)
   - Evidence ledger entries (command input, output, exit code, hash)
   - Health indicators within thresholds
   - No security violations detected

4. **Test coverage:** Reference mission proves:
   - Simple mission decomposes correctly
   - Policy engine prevents prohibited actions
   - Execution respects timeout and output size limits
   - Verification identifies success/failure accurately
   - Evidence is cryptographically hashed and immutable

## Execution notes

- GitHub Actions runner environment verified in Phase 0.5 (npm, git, bash available)
- Deterministic fields only (mission_id, task_id, timestamp [ISO 8601], actor, action, result, exit code, hash)
- Volatile fields separate (run_id, duration, row_id, computed_at) — never part of evidence hash
- No external network calls (no Supabase, Vercel, or GitHub API writes)
- Mission remains under test boundary (<5 seconds total execution)

## Completion conditions

1. All modules implemented and tested (npm run type-check, npm run lint)
2. Health-check mission executes start-to-finish with zero governance violations
3. Evidence Ledger contains all task results with correct hashing
4. Completion report generated with:
   - Mission ID and execution timestamps
   - Task decomposition (input mission → 3-5 tasks)
   - Execution results (per-task exit code, output summary)
   - Fitness score and baseline comparison
   - Evidence artifact locations (`/home/user/newspulse-ai/docs/governor/missions/<mission_id>/`)
   - Lessons identified (if any patterns learned)
5. Branch committed with incremental batches; each commit tagged with evidence

Then replace this file with the next mission.

## Next owner

Any Governor Ω session executing from AGENTS.md loop. Use the session that
completes Phase 1 to immediately transition to Phase 2 (customer journey).

## Queued missions (do not start until Phase 1 complete)

1. **Phase 2: Customer-journey verification** (real fitness test)
   - Exercise full first-customer journey on production
   - Verify every DEMO_READINESS.md row
   - Update PROJECT_STATE.md with customer-readiness evidence

2. Fix any BLOCKED reference-mission steps found by this mission.

3. Adopt or close PR #124 (billing/obligations tests) and PR #149
   (test lab) with evidence.

4. Founder-discretion follow-ups: Tokyo project decommission; DB password
   rotation; branch protection (RISK-002); `CEIS_CRON_SECRET` (RISK-006).
