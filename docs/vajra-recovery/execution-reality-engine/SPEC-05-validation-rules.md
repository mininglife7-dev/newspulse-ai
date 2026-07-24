# SPEC-05 — Validation Rules & Staleness Detection

**Component:** validation rules (Founder build list)
**Principle:** structural and logical invariants are knowable and enforced;
**empirical values are never asserted.** A rule may reject a record for being
*malformed* or *internally impossible*; no rule ever supplies a missing
measurement.

## Rule catalogue

Each incoming observation is validated in two layers:

1. **Schema layer** — JSON Schema in `schemas/` (executable in any language).
2. **Cross-field / semantic layer** — the rules below (ids referenced by the
   schemas and by `contracts/capabilities.json`).

| Rule id | Applies to | Rule | Rationale |
| ------- | ---------- | ---- | --------- |
| **R-ID-1** | all | `observation_id` is present and globally unique (dedupe on insert). | Prevents double-counting evidence. |
| **R-PROV-1** | all | `data_provenance.source`, `capture_method`, `clock_source` present. | Founder directive: provenance mandatory. |
| **R-CONF-1** | all | `confidence.level` present; if `interval` present it has `sample_size ≥ 2` and `low ≤ high`. | Uncertainty must be explicit, never implied. |
| **R-PX-1** | quote, trade, fill | all prices `> 0`. | Non-positive price is impossible, not "low". |
| **R-PX-2** | quote | `best_ask ≥ best_bid` (quoted spread `≥ 0`). | Crossed book is a data fault; quarantine. |
| **R-QTY-1** | fill | `0 < fill_qty ≤ order_size`; `cumulative_filled_qty ≤ order_size`. | A fill cannot exceed its parent order. |
| **R-TS-1** | all | `event_timestamp` falls inside a valid session window for `venue` (per exchange calendar; see SPEC-02). | Off-session prints are faults unless flagged pre/post. |
| **R-TS-2** | order_lifecycle, fill | state timestamps are monotonic within an order (`new ≤ ack ≤ fill`). | Time cannot run backwards within one order. |
| **R-TS-3** | all | `ingest_timestamp ≥ event_timestamp − skew_tolerance`; no timestamp is in the future beyond `skew_tolerance`. | Bounds clock error; `skew_tolerance` derives from `clock_source`. |
| **R-REF-1** | fill (for slippage) | if the fill is to be used for slippage, an `arrival_reference` exists on the parent order. Otherwise slippage for that order is **UNKNOWN**, not zero. | No anchor ⇒ no measurement, not a default. |
| **R-CAL-1** | scheduler | a scheduled fire occurs only on a trading day/session per the exchange calendar. | Distinguishes "closed" from "failed". |
| **R-STORE-1** | store | inserts only; `UPDATE`/`DELETE` on raw rows are rejected. | Append-only immutability. |
| **R-STORE-2** | store | `row_hash = H(canonical(payload) ‖ prev_hash)`; chain verifies on audit. | Tamper-evidence. |
| **R-FRESH-1** | freshness_detector | a capability is STALE if `now − last_output_at > max_staleness_seconds` **and** the session is open. Suppressed when session closed. | Session-aware staleness; avoids false alarms. |

### Skew tolerance (R-TS-3)

`skew_tolerance` is a function of `clock_source`, not a guess about the data:

| clock_source | tolerance policy |
| ------------ | ---------------- |
| ptp / exchange | tight (sub-second) — exact value calibrated once real captures exist |
| ntp | small (order of seconds) — calibrated from observed offset |
| system_unsynced / unknown | wide, and the record's `confidence.level` for any latency field is capped at `unknown` |

The concrete tolerance numbers are **UNKNOWN until measured** against VAJRA's
capture hosts; the *policy* (tighter clock ⇒ tighter tolerance) is what this
rule fixes.

## Handling of invalid records

A record failing any rule is **routed to `quarantine`** (see
`storage/raw_observations.sql`) with the failed rule ids and the verbatim
payload. **Records are never silently dropped** — the absence of valid data
must itself be observable, otherwise "no evidence" masquerades as "no problem".

## Staleness / stale-dataset detection

- Freshness is evaluated **per capability**, session-aware, via `R-FRESH-1`
  over `capability_output_log.last_output_at`.
- A dataset is flagged STALE (not merely "no heartbeat") when the *intended
  output* stops arriving during an open session — this is the capability
  monitoring the Founder mandated.
- Thresholds (`max_staleness_seconds`) are **null/UNKNOWN** in every capability
  contract until calibrated from the observed cadence. Emitting a threshold now
  would be a fabricated parameter.

## What this spec deliberately does NOT do

- It does not infer missing prices, sides, or sizes.
- It does not clamp, winsorize, or "clean" outliers — an outlier is preserved;
  outlier *analysis* is a downstream, evidence-based step, not a validation edit.
- It does not assign confidence better than `unknown` to any field lacking
  direct measurement.
