# ARCH-05 — Windows Governor (Read-Only Observation)

**Role:** *observes.* Reads the complete VAJRA environment and publishes
verified evidence bundles. **Changes nothing** without explicit Founder
authorization. The first mission is understanding.

## READ authority (granted)

`C:\vajra` · `C:\vajra_gold` · source code · configuration · schedulers ·
collectors · logs · research artifacts · historical datasets · paper-trading
records · performance reports.

## Hard guarantees (S1/S3/S4)

1. **Read-only.** No file is modified, moved, renamed, or deleted; no process
   is started/stopped; no config or credential is changed. (Same guarantee
   already implemented by `tools/windows/Collect-VajraEvidence.ps1`.)
2. **No fabrication.** Anything not observed is emitted as `null`/`unknown`.
   An absent collector is reported `absent`, not assumed healthy.
3. **No secret values.** Secrets are detected and reported by presence/type
   only; values never enter a bundle.

## What it observes → which capability it fills

| Observation | Capability (registry) |
| ----------- | --------------------- |
| repo state: branches, HEAD, dirty, subsystem map | `vajra_repository`, `vajra_gold_repository` |
| collector output presence + freshness | `market_data_collector` |
| scheduler jobs + run logs + calendar alignment | `scheduler` |
| paper-trading records → lifecycle/fill/reject observations | `paper_trading` |
| historical datasets: counts, ranges, checksums | `execution_evidence_store` |
| logs/artifacts inventory + freshness | `logs_and_artifacts` |
| disk / clock source+offset / process liveness | `system_health` |

Each observation is normalized into Execution Reality Engine records where
applicable and into `capability_statuses` for the rest.

## First understanding pass (the initial cycle)

1. Enumerate `C:\vajra` and `C:\vajra_gold`; capture git metadata + a subsystem
   map; reconcile divergence between the two.
2. For each registry capability, discover its real `entry_point` (replace
   `TBD`), locate its `expected_artifact`, and record whether the artifact is
   present and fresh.
3. Capture `system_health` — especially `clock_source`/offset, which bounds the
   trust of any latency evidence later (Execution Reality Engine SPEC-05 R-TS-3).
4. Emit one evidence bundle: statuses for all capabilities (mostly `unknown →
   observed`), any anomalies, `observations: []` if nothing measurable yet.
5. **Do not calibrate freshness thresholds from a single pass** — cadence needs
   multiple cycles. Leave them `null` until enough bundles exist.

## Reference collector

A read-only reference skeleton lives at
`windows-governor/observe.reference.ps1`. It is **UNVERIFIED** (cannot be
executed or tested from the cloud environment) and is provided as a starting
point to be validated on the Windows workstation. It only reads, scrubs
secrets, and writes a schema-shaped bundle to the evidence path — it performs
no mutation. Treat its output as evidence only after schema + integrity
verification on the Cloud side.

## Publishing

Validate → scrub → hash-chain → write bundle to the evidence channel → commit
→ push (append-only). Never force-push; never rewrite a published bundle. A
correction is a **new** bundle that supersedes, mirroring the append-only
memory model (ARCH-04).
