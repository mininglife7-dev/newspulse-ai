# DEMO_READINESS — First-Customer Checklist

First customer: Anne Catherine's German accounting firm.
Every item is **VERIFIED** (with evidence), **BLOCKED** (with owner), or
**UNKNOWN** (never exercised). No other states exist. A demo/launch GO
requires every row VERIFIED.

**Last updated:** 2026-07-16 (Memory Kernel baseline)

| #   | Journey step                               | Status       | Evidence / blocker                                                                                                                                                                                                                      |
| --- | ------------------------------------------ | ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Deployment (code + database live)          | **VERIFIED** | Runs `29479537494`/`29479962355`/`29490828367`: schema + CEIS + RLS + security tests green. Caveat: DB is Tokyo, not EU — RISK-008 decision pending (Founder)                                                                           |
| 2   | Registration (signup + email verification) | **BLOCKED**  | Production URL (https://newspulse-ai.vercel.app) unreachable from cloud environment due to network egress policy. Requires: (1) network policy exemption, (2) staging environment, or (3) local deployment. Owner: Founder / Governor Ω |
| 3   | Workspace creation                         | **BLOCKED**  | Depends on row 2 — blocked by production/staging unavailability                                                                                                                                                                         |
| 4   | AI inventory (register AI systems)         | **BLOCKED**  | Depends on row 2 — blocked by production/staging unavailability                                                                                                                                                                         |
| 5   | Risk assessment (EU AI Act questionnaire)  | **BLOCKED**  | Depends on row 2 — blocked by production/staging unavailability                                                                                                                                                                         |
| 6   | Obligations (view/understand/track)        | **BLOCKED**  | Depends on row 2 — blocked by production/staging unavailability                                                                                                                                                                         |
| 7   | Evidence collection                        | **BLOCKED**  | Depends on row 2 — blocked by production/staging unavailability                                                                                                                                                                         |
| 8   | Compliance status dashboard                | **BLOCKED**  | Depends on row 2 — blocked by production/staging unavailability                                                                                                                                                                         |
| 9   | Compliance report generation               | **BLOCKED**  | Depends on row 2 — blocked by production/staging unavailability                                                                                                                                                                         |
| 10  | Remediation tracking                       | **BLOCKED**  | Depends on row 2 — blocked by production/staging unavailability                                                                                                                                                                         |
| 11  | Full journey without developer assistance  | **BLOCKED**  | Depends on 2–10 — blocked by production/staging unavailability                                                                                                                                                                          |

## Rules

- Only cite evidence from the live production (or an explicitly named
  staging) environment — local tests and CI do not verify a live journey.
- When a step is verified, record: date, environment/URL, evidence
  artifact (screenshot path, run ID, or session record), verifier.
- Any regression returns the row to UNKNOWN with a note.
