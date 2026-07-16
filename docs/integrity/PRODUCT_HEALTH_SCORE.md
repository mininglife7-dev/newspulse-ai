# Product Health Score — NewsPulse AI

**Audit date:** 2026-07-09 · Scale 0–100 · Threshold: anything below 95 is a priority task.

| Dimension                     | Before | After   | Basis                                                                                                                                                                                                                                                                                     |
| ----------------------------- | ------ | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dashboard Integrity           | 70     | **98**  | Fake empty state on DB outage, false 404, mislabeled results header — all fixed; every screen now shows verified data or an honest error. −2: `saveSearch` is fire-and-forget, so a persistence failure is only visible in server logs, not in the UI.                                    |
| Navigation Integrity          | 85     | **100** | All nav/CTA/back links resolved before and after; the orphaned `/history/[id]` page is now reachable; 404 handling verified.                                                                                                                                                              |
| Button Integrity              | 80     | **100** | 24/24 interactive elements behave as labeled. Per-row Delete existed only as an endpoint (no button); suggestion chips didn't act; both fixed.                                                                                                                                            |
| API Integrity                 | 88     | **100** | All 5 route handlers return correct statuses, `ok` flags consistent with status, method guards and validation in place; history routes no longer disguise outages as success. Verified by 10 API smoke checks.                                                                            |
| Visual Integrity              | 92     | **97**  | Loading skeletons, empty states, error states, dark theme, responsive grids all present. Icon semantics fixed (Re-run), no-results no longer styled as an error, README broken images removed. −3: no real-browser/mobile visual regression coverage yet.                                 |
| Data Integrity                | 75     | **98**  | Single source of truth for model name, counts, and timestamps; no hard-coded metrics; Founder Trust Rule enforced (unverifiable ⇒ error, never a fabricated value). −2: `result_count` column still stored alongside `results` in the DB (kept for SQL convenience, no longer displayed). |
| **Overall Product Integrity** | **82** | **99**  | Weighted judgment across dimensions; every dimension ≥ 95.                                                                                                                                                                                                                                |

## Scoring notes

- "Before" scores reflect the codebase at commit `1f52ef3` as found; "after"
  reflects this audit's fixes, all verified by type-check, lint, a
  zero-credential production build, and the 16-check smoke suite (16/16 PASS).
- The smoke suite prints its own pass-ratio score on every run
  (`npm run test:smoke`) and fails CI below 100% pass, so regressions surface
  as build failures, not as silent score drift.

## Open items below the bar

None ≥ priority threshold. Watch-list (scored but acceptable):

1. Visual regression / mobile viewport testing (Visual Integrity, −3) — consider
   Playwright screenshots per breakpoint if the UI grows.
2. UI signal when history persistence fails mid-search (Dashboard Integrity, −2).
3. Drop or backfill-verify the redundant `result_count` column (Data Integrity, −2).
