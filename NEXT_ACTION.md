# NEXT_ACTION — The One Active Mission

> Exactly one mission lives here. Finish it, verify it, replace it.

## Current Mission

**Customer-journey verification:** exercise the full first-customer journey
against the live production environment and move every row of
`DEMO_READINESS.md` from UNKNOWN to VERIFIED (with evidence) or BLOCKED
(with exact failure and owner).

## Why this mission is first

Priority 1 is production readiness for the first customer (a German
accounting firm). Infrastructure is VERIFIED (deploys `29479537494`,
`29479962355`, `29499904621`); every customer-facing step is honestly
UNKNOWN — nobody has registered, assessed, or generated a report on the
live system. Until the journey is exercised, no launch claim is possible
(Law 3).

## Success criteria

1. Follow `.github/skills/customer-journey/SKILL.md` steps 1–9 against the
   production URL (or a named staging environment if production serving is
   itself UNKNOWN — verify that first via
   `.github/skills/verify-production/SKILL.md`).
2. Every DEMO_READINESS.md row updated to VERIFIED (date + environment +
   evidence artifact) or BLOCKED (reproduction steps + owner).
3. Any BLOCKED row gets a filed fix as the next mission candidate.
4. PROJECT_STATE.md "Customer readiness" section updated.
5. Decision-log entry if any significant call is made.

## Files expected

`DEMO_READINESS.md`, `PROJECT_STATE.md`, possibly bug-fix branches/PRs,
evidence artifacts under `docs/governor/reports/`.

## Verification required

Evidence per journey row — API responses, screenshots, or recorded session
IDs from the live environment. Local tests and CI do not count.

## Completion conditions

All DEMO_READINESS rows are VERIFIED or BLOCKED (zero UNKNOWN), states
updated. Then replace this file with the next mission.

## Next owner

Any Governor Ω session (start with the execution loop in AGENTS.md).

## Queued missions (not active — do not start)

1. EU migration execution when the Founder provides the EU project ref +
   credentials (RISK-008 — do this BEFORE first customer data if possible).
2. Adopt or close PR #124 (billing/obligations tests) and PR #149
   (test lab) with evidence.
3. Fix any BLOCKED journey steps found by this mission.
