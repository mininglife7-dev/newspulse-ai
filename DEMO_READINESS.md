# DEMO_READINESS — First-Customer Checklist

First customer: Anne Catherine's German accounting firm.
Every item is **VERIFIED** (with evidence), **BLOCKED** (with owner), or
**UNKNOWN** (never exercised). No other states exist. A demo/launch GO
requires every row VERIFIED.

**Last updated:** 2026-07-16 (Memory Kernel baseline)

| #   | Journey step                               | Status       | Evidence / blocker                                                                                                                                            |
| --- | ------------------------------------------ | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Deployment (code + database live)          | **VERIFIED** | Runs `29479537494`/`29479962355`/`29490828367`: schema + CEIS + RLS + security tests green. Caveat: DB is Tokyo, not EU — RISK-008 decision pending (Founder) |
| 2   | Registration (signup + email verification) | **UNKNOWN**  | Never exercised against the live environment                                                                                                                  |
| 3   | Workspace creation                         | **UNKNOWN**  | Code + RLS verified at DB level; live flow unexercised                                                                                                        |
| 4   | AI inventory (register AI systems)         | **UNKNOWN**  | Live flow unexercised                                                                                                                                         |
| 5   | Risk assessment (EU AI Act questionnaire)  | **UNKNOWN**  | Live flow unexercised                                                                                                                                         |
| 6   | Obligations (view/understand/track)        | **UNKNOWN**  | Live flow unexercised                                                                                                                                         |
| 7   | Evidence collection                        | **UNKNOWN**  | Live flow unexercised                                                                                                                                         |
| 8   | Compliance status dashboard                | **UNKNOWN**  | Live flow unexercised                                                                                                                                         |
| 9   | Compliance report generation               | **UNKNOWN**  | Live flow unexercised                                                                                                                                         |
| 10  | Remediation tracking                       | **UNKNOWN**  | Live flow unexercised                                                                                                                                         |
| 11  | Full journey without developer assistance  | **UNKNOWN**  | Depends on 2–10                                                                                                                                               |

## Rules

- Only cite evidence from the live production (or an explicitly named
  staging) environment — local tests and CI do not verify a live journey.
- When a step is verified, record: date, environment/URL, evidence
  artifact (screenshot path, run ID, or session record), verifier.
- Any regression returns the row to UNKNOWN with a note.
