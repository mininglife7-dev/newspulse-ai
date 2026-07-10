# ADR 0001 — Retain `result_count` as a constraint-checked cached derivation

**Date:** 2026-07-09 · **Status:** Accepted

## Context

`news_searches.result_count` duplicates information already present in the
`results` JSONB column (`jsonb_array_length(results)`). The integrity audit
flagged it as a potential second source of truth: any screen displaying the
stored value while rendering the array could contradict itself.

## Evidence

Usage census (grep over the whole repo):

| Consumer                        | Usage                                                                                           |
| ------------------------------- | ----------------------------------------------------------------------------------------------- |
| `lib/supabase.ts` `saveSearch`  | **Sole writer** — always writes `results.length`, derived from the same array it stores         |
| Application UI                  | **Zero readers** — after the audit, every count badge derives from the rendered `results` array |
| `news_searches_recent` SQL view | **One reader** — lightweight listings select the int instead of parsing the JSONB payload       |
| e2e fixtures                    | Store a deliberately wrong value (99) to regression-test that the UI never trusts it            |

## Options considered

1. **Drop the column.** Cleanest data model, but the `news_searches_recent`
   view (and any future SQL analytics) would compute
   `jsonb_array_length(results)` per row — unindexable, and it forces every
   listing query to touch the payload. Also requires a destructive migration.
2. **Make it a `GENERATED ALWAYS AS ... STORED` column.** Structurally
   perfect, but generated columns reject explicit inserts — the running app
   writes the value, so migration and deploy would have to be coordinated
   atomically. Downtime risk for zero practical gain over option 3.
3. **Retain + CHECK constraint** _(chosen)_:
   `check (jsonb_typeof(results) = 'array' and result_count = jsonb_array_length(results))`.
   The column becomes a verified cache: the database rejects any write where
   the count disagrees with the array, so drift is impossible by
   construction. No app change, no coordinated deploy (the app's single
   write path already satisfies the constraint), and the migration includes
   a backfill for any pre-existing drifted rows.

## Validation

Executed against a real PostgreSQL 16 instance (with `anon`/`authenticated`
roles present, as on Supabase):

- `supabase/schema.sql` runs end-to-end and is idempotent (second run clean).
- A consistent insert (`2` results, `result_count = 2`) succeeds.
- A drifted insert (`1` result, `result_count = 99`) is rejected by
  `news_searches_result_count_matches`.
- Legacy simulation: constraint dropped, drifted row (`result_count = 42`)
  inserted, migration re-run → row backfilled to the true value and the
  constraint re-applied without error.

## Consequences

- `result_count` may be freely used in SQL (views, analytics, dashboards)
  as an authoritative value — the constraint guarantees it equals the array
  length.
- Application UI continues to derive counts from the `results` array it
  renders; the column stays out of the UI entirely.
- If the app ever stops writing the column, revisit option 2 (generated
  column) in the same migration.
