# ARCH-02 — Secure Evidence Bridge

**Purpose:** carry **verified observations** from the Windows Governor to the
Cloud Governor, continuously, with integrity and without ever exposing secret
values. Unit = **evidence bundle** (`schemas/evidence-bundle.schema.json`).

## Transport (grounded in what actually exists)

Cloud Governor cannot reach the Windows workstation; the workstation *can*
reach GitHub. So the **default transport is a Git-backed append-only evidence
channel** — the same direction the existing Windows evidence bridge already
uses (`tools/windows/Collect-VajraEvidence.ps1`):

1. Windows Governor writes each bundle as a file under an evidence path
   (e.g. `evidence/windows/<publisher>/<sequence>-<bundle_id>.json`) on a
   dedicated evidence branch.
2. It commits and pushes (append-only; never force-push, never rewrite).
3. Cloud Governor pulls that branch and consumes new bundles in `sequence`
   order.

The bundle format is **transport-agnostic** — object storage or a message
queue could replace Git without changing the schema or the integrity model.
Git is the default because it is available, auditable (its own history is an
integrity witness), and needs no new credentials.

> The bridge moves **evidence**, not filesystem access. Cloud never mounts
> `C:\`; it reads bundles.

## Bundle lifecycle

```
Windows: observe → validate (rule checks) → scrub secrets → hash-chain → publish
Cloud:   pull → verify integrity → verify schema → detect sequence gaps
         → record to memory (append-only) → update capability statuses
         (invalid → quarantine, never drop)
```

## Integrity model

- **Hash chain.** `bundle_hash = H(canonical(bundle − bundle_hash) ‖
  prev_bundle_hash)`. Consumer recomputes and verifies the chain; any break is
  an alarm (mirrors Execution Reality Engine R-STORE-2).
- **Sequence.** Per-publisher monotonic `sequence`; the consumer detects gaps
  (missing bundle) and duplicates. A gap is a *known unknown*, surfaced — never
  silently interpolated.
- **Optional signature.** A detached signature over `bundle_hash`, verified
  against a Founder-registered key. Unsigned bundles are accepted only if the
  channel itself is trusted; signature is recommended before any mutation
  authority is ever granted.

## Secret-exposure guard (S4)

- Bundles carry `secret_exposure_guard.scrubbed = true` and, at most,
  `secret_findings_by_type` (e.g. `["broker_token:2"]`) — **counts and types,
  never values**. This mirrors the guarantee already implemented in
  `Collect-VajraEvidence.ps1` (secrets reported by filename/type only).
- The consumer **rejects** any bundle whose payload matches secret-shaped
  patterns, routing it to quarantine and raising an anomaly.

## No fabrication (S3)

- `observations` MAY be an empty array — a legitimate recorded state meaning
  "nothing was observable in this window" (e.g. market closed, collector
  absent). Emptiness is evidence; it is never padded.
- `capability_statuses` entries default to `unknown`; a status is upgraded only
  from an observed artifact. `last_artifact_at = null` means never/unknown, not
  "now".

## Failure & staleness of the bridge itself

The bridge is a capability with its own contract
(`evidence_bridge_publish` / `evidence_bridge_consume` in
`contracts/windows-capabilities.json`). If no new bundle arrives within the
(to-be-calibrated) freshness window, the Cloud Governor marks the bridge
**degraded/unhealthy** and treats all downstream Windows capabilities as
**stale-unknown** — it does **not** assume they are still healthy. Absence of
evidence is not evidence of health.

## What the bridge is NOT

- Not remote control. The default channel is one-way evidence.
- Not a sync of secrets, credentials, or raw account data.
- Not a place for conclusions — bundles carry observations and flagged
  anomalies; *reasoning* happens in the Cloud Governor and is recorded as
  learning with its own evidence citations.
