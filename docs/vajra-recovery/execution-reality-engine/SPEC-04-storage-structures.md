# SPEC-04 — Storage Structures

**Component:** storage structures (Founder build list)
**Directives:** *Implement immutable raw observation storage* +
*Implement append-only historical preservation.*

DDL: `storage/raw_observations.sql` (PostgreSQL; SQLite/DuckDB port notes
inline).

## Principles

1. **Raw is sacred.** `raw_observations` is insert-only. `UPDATE`/`DELETE` are
   blocked by trigger *and* by role grants (SPEC-05 R-STORE-1). History is
   never rewritten.
2. **Tamper-evident.** Each row stores `row_hash = H(canonical(payload) ‖
   prev_hash)`, forming a chain. An audit recomputes the chain to detect any
   out-of-band mutation (R-STORE-2).
3. **Provenance & confidence are columns, not afterthoughts.** They are
   promoted out of the JSON payload into first-class columns so no query can
   accidentally read a measurement without its trust context.
4. **Absence is visible.** Invalid records go to `quarantine` (with failed rule
   ids + verbatim payload), never to `/dev/null`. "No data" is a recorded
   state, not a gap.
5. **Corrections append, never edit.** A correction is a new row in
   `corrections` that supersedes an `observation_id`; the
   `effective_observations` view resolves the current truth while the original
   raw row remains intact.

## Tables

| Object | Role |
| ------ | ---- |
| `raw_observations` | append-only, hash-chained raw truth |
| `capability_output_log` | last correct output time per capability (substrate for capability monitoring / freshness) |
| `quarantine` | preserved invalid records + reasons |
| `corrections` | append-only supersession pointers |
| `effective_observations` (view) | raw minus superseded |

## Retention & partitioning

- **Retention: indefinite** for raw observations (append-only historical
  preservation). Raw is never pruned; if storage pressure arises, cold
  partitions are archived to object storage, not deleted.
- Partition `raw_observations` by `event_timestamp` (e.g. daily/monthly) once
  volumes are known. Partition granularity is a **calibration decision** left
  open until real ingest rates are observed — not guessed here.

## What is intentionally deferred

- Derived/aggregate tables (spread distributions, latency quantiles) are
  **downstream** of measured data and are not created in the grounding phase.
  Their definitions live in SPEC-06 as views over `effective_observations`, to
  be instantiated when data exists.
