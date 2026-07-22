# AGENTS.md — Operational Manual (Memory Kernel Ω)

This repository is operated by autonomous agents under a single executive
authority (**Governor Ω**). Repository state — not conversation history —
is the source of truth. Every session, human or agent, starts here.

## The Memory Kernel

| File                                                   | Role                                        | Update rule                           |
| ------------------------------------------------------ | ------------------------------------------- | ------------------------------------- |
| [`GOVERNOR_CONSTITUTION.md`](GOVERNOR_CONSTITUTION.md) | Permanent laws                              | Rarely; Founder-approved changes only |
| [`PROJECT_STATE.md`](PROJECT_STATE.md)                 | Verified facts only                         | Whenever verified reality changes     |
| [`NEXT_ACTION.md`](NEXT_ACTION.md)                     | Exactly ONE active mission                  | Replace on completion                 |
| [`DECISION_LOG.md`](DECISION_LOG.md)                   | Decision log (points to canonical register) | Append per significant decision       |
| [`DEMO_READINESS.md`](DEMO_READINESS.md)               | Customer-journey checklist                  | Per item, evidence-cited              |
| [`AGENTS.md`](AGENTS.md)                               | This manual                                 | When process changes                  |

Supporting memory: `docs/governor/` (risk register, lessons, deployment
records, executive reports), `docs/governance/DECISION_REGISTER.md`
(canonical decision log, DR-numbered).

## Execution loop (mandatory)

1. Read `AGENTS.md`, `GOVERNOR_CONSTITUTION.md`, `PROJECT_STATE.md`, `NEXT_ACTION.md`.
2. Consult `docs/governor/risks/RISK-REGISTER.md` and `docs/governor/lessons/LESSONS.md` before significant work.
3. Inspect only the files relevant to the mission. **Check main and open PRs before building anything** (duplicate parallel work is the #1 historical waste — DR-0006).
4. Execute the ONE mission in `NEXT_ACTION.md`.
5. Verify with objective evidence (see standards below).
6. Update `PROJECT_STATE.md`; append to the decision log if a significant decision was made; update `DEMO_READINESS.md` if customer-journey status changed.
7. Replace `NEXT_ACTION.md` with the next highest-priority mission.
8. Repeat. Never begin work without reading current state.

## Instruction precedence (highest wins)

1. Founder explicit instruction (live)
2. `GOVERNOR_OPERATIONAL_CHARTER.md` (operational phase guidance, 2026-07-22+)
3. `GOVERNOR_CONSTITUTION.md` (permanent laws)
4. `DECISION_LOG.md` / `docs/governance/DECISION_REGISTER.md` (settled decisions)
5. `NEXT_ACTION.md`
6. `AGENTS.md` (this manual)
7. Repository instructions (`CLAUDE.md`, `.github/copilot-instructions.md`)
8. Historical documentation (including `docs/archive/`)
9. Chat history

Archived material (`docs/archive/`) NEVER overrides active governance.

**Operational Phase Note (2026-07-22):** Governor has transitioned from construction to operational phase. See GOVERNOR_OPERATIONAL_CHARTER.md for guiding principles: prefer better judgment over more code, rely on evidence before evolution, and measure success by customer/project outcomes, not feature count.

## Project purpose

EURO AI: multi-tenant EU AI Act compliance platform (Next.js 16 App
Router, React 19, TypeScript strict, Supabase with RLS tenant isolation,
Vercel). First customer: a German accounting firm. Every decision is
ranked: customer impact → production stability → security → compliance →
reliability → velocity → tech debt → new features.

## Commands

- `npm run lint` · `npm run type-check` · `npm test` (vitest) — fast gate
- `npm run test:e2e` (Playwright) · `npm run test:smoke` · `npm run build`
- CI: `.github/workflows/ci.yml` (lint, type-check, tests, build) + E2E smoke
- DB deploy: Actions → "Deploy Supabase Schema" (workflow_dispatch; self-verifies schema, CEIS tables, RLS, security tests)
- Deploys: push to `main` → Vercel production; PRs → preview deployments

## Evidence standards

- Label every claim **Verified / Estimated / Unknown / Blocked**. Unknown stays UNKNOWN until verified.
- Verified requires an artifact: CI run ID, workflow run ID + log line, commit SHA, test output, or file path.
- Never write a readiness/GO claim without a run ID proving it. A GO certification without deploy-run evidence is a constitution violation (this has happened; see L-003 and PROJECT_STATE history).
- Verification scripts must be able to both pass and fail against reality (L-005).

## Execution workflow

- Work on a feature branch, never directly on `main`; open a draft PR; merge only with green CI.
- One mission at a time. Batch unavoidable Founder asks.
- Reusable procedures live in `.github/skills/` — invoke a skill instead of re-deriving the procedure.
- PR-queue hygiene: stale or superseded PRs are closed with per-PR evidence comments (protocol: DR-0021/0022/0023).

## Safety boundaries

Never autonomously: spend money, delete production data, expose secrets,
modify legal agreements, approve contracts, change company strategy, use
credentials beyond granted authorization, take irreversible production
actions. Secrets never go in code, logs, PR bodies, or workflow inputs.

## Escalation rules

Interrupt the Founder ONLY for: missing credentials, legal decisions,
financial commitments, customer contracts, strategy/product-vision
changes, repository-settings actions (e.g. branch protection), security
incidents, irreversible production actions. Name the exact minimal action,
where to perform it, and what the system verifies automatically after (L-004).
