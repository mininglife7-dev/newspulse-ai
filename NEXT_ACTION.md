# NEXT_ACTION — The One Active Mission

> Exactly one mission lives here. Finish it, verify it, replace it.
> **NOTE:** Phase 1 COMPLETE; Phase 2 PRIMARY MISSION. VAJRA Phase 0 running in parallel under Founder directive (DR-TBD).

## Current Mission (Phase 2: Shadow Execution — EURO AI Customer-Journey Verification)

**Execute observation-only mission:** Watch the first-customer journey
(Anne Catherine's German accounting firm) progress through EURO AI platform
without Governor mutation authority. Record dual verdicts (Technical vs.
Customer-Success) independently. Advance through 14 defined journey steps:
registration, email verification, workspace creation, company details, AI
system inventory, risk assessment, obligations discovery, evidence upload,
dashboard navigation, compliance report generation, remediation tracking,
multi-user workspace, re-login persistence, and final logout.

**Branch:** `claude/governor-os-foundation-89zihp` (Phase 1 commit `bda1319`)  
**Authority Model:** Read-only observation. Customer actions proceed through normal workflows. Governor mutations disabled.
**Phase 1 Status:** ✅ VERIFIED (acceptance gate test 4/4 passing, build passing, 13 modules implemented, evidence ledger functional)

## Why this mission (Phase 2: Shadow Execution)

Phase 1 reference mission proved Governor OS works end-to-end with proper
state machines, evidence collection, policy enforcement, and deterministic
hashing. Now, the real test: watch a genuine customer journey under
observation-only authority. Governor records all customer actions,
infrastructure responses, success/failure signals, and timing. Two independent
verdicts track: (1) Technical Verdict (system correctness, no crashes, proper
state transitions), (2) Customer-Success Verdict (user self-sufficiency without
developer hand-holding). This phase answers: does EURO AI actually work for the
first customer?

## Journey Steps (14-item checklist)

1. **Registration** — Customer signup + email submission ✅ (Step 1 complete)
2. **Email verification** — Confirmation link delivered and works
3. **Workspace creation** — Customer creates first workspace
4. **Company details** — AI Act entity identification form
5. **AI system inventory** — Register AI systems in use
6. **Risk assessment** — Complete EU AI Act questionnaire
7. **Obligations discovery** — System identifies compliance obligations
8. **Evidence upload** — Attach evidence to obligations
9. **Dashboard navigation** — View overview + governance metrics
10. **Compliance report** — Generate formal compliance report
11. **Remediation tracking** — Monitor obligation remediation
12. **Multi-user workspace** — Invite colleague, verify role-based access
13. **Re-login persistence** — Logout and login again; verify state persists
14. **Workspace abandonment** — Final logout; graceful session cleanup

**Success:** All 14 steps complete with both Technical Verdict and Customer-Success Verdict PASSED.

## Evidence collection (per step)

- **Technical Verdict:** System state transitions correct? No crashes? API responses valid? RLS policies enforced?
- **Customer-Success Verdict:** User knew what to do without assistance? Did UI provide clear guidance? Did system behave as expected?
- **Defect Classification:** If failure occurs, classify as: Blocker (customer cannot proceed), Warning (unexpected but workaround exists), Enhancement (nice-to-have)
- **Learning Candidates:** Identify patterns for promotion to Governor learning layer via Generalization Gate (10-point criteria)

## Execution authority

- **Governor mutations:** DISABLED (observation-only)
- **Customer workflows:** ENABLED (registration, workspace, assessment, etc. proceed normally)
- **Evidence authority:** FULL (record all customer actions, system responses, timing)
- **Decision authority:** NONE (Governor recommends to Founder via defect classification; cannot auto-remediate)

## Completion conditions

1. All 14 journey steps completed with full evidence logged
2. Technical Verdict generated: system correctness assessment
3. Customer-Success Verdict generated: user self-sufficiency assessment
4. Defect classification complete (if any failures detected)
5. Learning candidates identified and assessed against Generalization Gate (10-point criteria)
6. Evidence archive created in `docs/governor/missions/PHASE-2-<timestamp>/` with:
   - Journey map (step, timestamp, actor, action, result, verdict)
   - Technical logs (API responses, state transitions, RLS enforcement)
   - Customer interaction notes (UX clarity, self-sufficiency observations)
   - Defect register (if any blockers, warnings, or enhancements)
   - Learning candidates with Generalization Gate assessment
7. PROJECT_STATE.md updated with customer-readiness evidence
8. DEMO_READINESS.md rows 1–11 updated per step completion

## Parallel missions (Founder directive override to "one mission" rule)

**VAJRA Phase 0** (environment discovery) runs in parallel under read-only observation authority.

- Discover VAJRA repository location, branches, existing Governor integration
- Baseline reconstruction of VAJRA build/test/backtest systems
- Blocked pending GitHub MCP tool access

## Next owner

Any Governor Ω session executing from AGENTS.md loop. Use the session that
completes Phase 2 to immediately transition to Phase 3 (Governor learning promotion).
