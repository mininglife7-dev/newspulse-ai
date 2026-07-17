# DEMO_READINESS — First-Customer Checklist

First customer: Anne Catherine's German accounting firm.
Every item is **VERIFIED** (with evidence), **BLOCKED** (with owner), or
**UNKNOWN** (never exercised). No other states exist. A demo/launch GO
requires every row VERIFIED.

**Last updated:** 2026-07-17 (EU migration closed; journey testing path unblocked)

| #   | Journey step                               | Status       | Evidence / blocker                                                                                                                                                                                                                      |
| --- | ------------------------------------------ | ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Deployment (code + database live)          | **VERIFIED** | EU end-to-end 2026-07-17: DB run `29586277262` (Frankfurt, schema+CEIS+RLS+security green) + app runtime run `29596903172` (`supabase_host: cwbcvjiklrrkpmybefdp.supabase.co`, `db: ok`) at https://newspulse-ai-eight.vercel.app       |
| 2   | Registration (signup + email verification) | **BLOCKED**  | Correction 2026-07-17: true production URL is https://newspulse-ai-eight.vercel.app (old docs cited a wrong domain), publicly reachable from GitHub runners. Path: runner-dispatched journey tests (see NEXT_ACTION). Owner: Governor Ω |
| 3   | Workspace creation                         | **BLOCKED**  | Depends on row 2 — path unblocked via runner-based testing (see NEXT_ACTION)                                                                                                                                                            |
| 4   | AI inventory (register AI systems)         | **BLOCKED**  | Depends on row 2 — path unblocked via runner-based testing (see NEXT_ACTION)                                                                                                                                                            |
| 5   | Risk assessment (EU AI Act questionnaire)  | **BLOCKED**  | Depends on row 2 — path unblocked via runner-based testing (see NEXT_ACTION)                                                                                                                                                            |
| 6   | Obligations (view/understand/track)        | **BLOCKED**  | Depends on row 2 — path unblocked via runner-based testing (see NEXT_ACTION)                                                                                                                                                            |
| 7   | Evidence collection                        | **BLOCKED**  | Depends on row 2 — path unblocked via runner-based testing (see NEXT_ACTION)                                                                                                                                                            |
| 8   | Compliance status dashboard                | **BLOCKED**  | Depends on row 2 — path unblocked via runner-based testing (see NEXT_ACTION)                                                                                                                                                            |
| 9   | Compliance report generation               | **BLOCKED**  | Depends on row 2 — path unblocked via runner-based testing (see NEXT_ACTION)                                                                                                                                                            |
| 10  | Remediation tracking                       | **BLOCKED**  | Depends on row 2 — path unblocked via runner-based testing (see NEXT_ACTION)                                                                                                                                                            |
| 11  | Full journey without developer assistance  | **BLOCKED**  | Depends on 2–10                                                                                                                                                                                                                         |

## Rules

- Only cite evidence from the live production (or an explicitly named
  staging) environment — local tests and CI do not verify a live journey.
- When a step is verified, record: date, environment/URL, evidence
  artifact (screenshot path, run ID, or session record), verifier.
- Any regression returns the row to UNKNOWN with a note.
