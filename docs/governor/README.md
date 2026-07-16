# Governor Ω — Institutional Memory System

Permanent, searchable organizational knowledge maintained by Governor Ω
(Institutional Executive) under the charter accepted 2026-07-16, the
[Founder Advisor Constitution](../governance/FOUNDER_ADVISOR_CONSTITUTION.md),
and the [Founder Autonomous Execution Constitution](../governance/FOUNDER_AUTONOMOUS_EXECUTION_CONSTITUTION.md).

**Design rule:** this system is an _index plus living registers_, not a new
documentation tree. The repository already carries an extensive governance
corpus; duplicating it would worsen the documentation-drift risk recorded in
[RISK-004](risks/RISK-REGISTER.md). Each department below therefore either
owns a living document here or points to the canonical existing location.

## Department map

| Department / record type                                                            | Canonical location                                                                                                                                                                                                 |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Executive** — baseline + cycle reports                                            | [`executive/`](executive/) (this system)                                                                                                                                                                           |
| **Risks** — living risk register                                                    | [`risks/RISK-REGISTER.md`](risks/RISK-REGISTER.md) (this system)                                                                                                                                                   |
| **Lessons learned**                                                                 | [`lessons/LESSONS.md`](lessons/LESSONS.md) (this system)                                                                                                                                                           |
| **Reports** — daily summaries (only when meaningful change) + weekly health reports | [`reports/`](reports/) (this system)                                                                                                                                                                               |
| **Decisions**                                                                       | [`docs/governance/DECISION_REGISTER.md`](../governance/DECISION_REGISTER.md) — pre-existing, canonical; do **not** start a second register                                                                         |
| **Incidents**                                                                       | [`docs/INCIDENT_RESPONSE_PLAYBOOKS.md`](../INCIDENT_RESPONSE_PLAYBOOKS.md), [`docs/DISASTER_RECOVERY_RUNBOOK.md`](../DISASTER_RECOVERY_RUNBOOK.md); post-incident records go to `incidents/` here as they occur    |
| **Deployments**                                                                     | [`docs/DEPLOYMENT_RUNBOOK.md`](../DEPLOYMENT_RUNBOOK.md), [`docs/infra/`](../infra/) evidence tracking; deployment outcome records go to `deployments/` here as they occur                                         |
| **Audits**                                                                          | [`docs/infra/`](../infra/) (infrastructure/launch), [`docs/integrity/`](../integrity/) (product integrity)                                                                                                         |
| **Architecture**                                                                    | [`docs/API.md`](../API.md), `supabase/schema.sql`, [`docs/CEIS.md`](../CEIS.md)                                                                                                                                    |
| **Operations**                                                                      | [`docs/DEPLOYMENT_RUNBOOK.md`](../DEPLOYMENT_RUNBOOK.md), launch-day docs at repo root, [`docs/governance/FOUNDER_BRIEF.md`](../governance/FOUNDER_BRIEF.md) (rolling status — the single source of current state) |

## Operating rules

1. **Evidence first.** Every claim in these records is labelled
   Verified / Estimated / Unknown / Blocked and cites its evidence
   (commit SHA, CI run ID, PR number, file path).
2. **Update on change, not on schedule.** Registers are updated whenever
   reality changes. Daily summaries are written only if something meaningful
   happened; weekly health reports are always written.
3. **One canonical home per fact.** Current platform status lives in
   `FOUNDER_BRIEF.md`; decisions in `DECISION_REGISTER.md`; risks in
   `RISK-REGISTER.md` here. Other documents link rather than restate.
4. **Founder interruptions** only for: money, legal, customer contracts,
   credentials, critical production incidents, strategic decisions.
