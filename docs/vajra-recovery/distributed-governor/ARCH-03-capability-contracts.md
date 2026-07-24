# ARCH-03 — Capability Contracts & Registry

**Directive:** every capability declares **Owner, Purpose, Entry point,
Expected artifact, Freshness requirement, Success criteria, Automated
verification**. *A capability is healthy only when its intended artifact is
produced correctly and on time.*

Schema: `schemas/omega-capability-contract.schema.json` (a superset of the
Execution Reality Engine capability contract).
Registry: `contracts/windows-capabilities.json`.

## The seven mandatory fields

| Field | Meaning | Fabrication guard |
| ----- | ------- | ----------------- |
| `owner` | `cloud_governor` or `windows_governor` — who is accountable | — |
| `purpose` | one-sentence reason the capability exists | — |
| `entry_point` | how/where its work originates (path, job, service) | verbatim; `TBD` until discovered, never invented |
| `expected_artifact` | the concrete output that proves it works | `location` null until observed |
| `freshness_requirement` | max staleness + cadence, session-aware | **null until calibrated from observed cadence** |
| `success_criteria` | objective, checkable "working correctly" statements | — |
| `automated_verification` | method + named checks + where it runs | reuses Execution Reality Engine rule ids |

## Health definition (Capability before Activity)

`healthy` ⟺ within the evaluation window the **expected_artifact** is
**produced**, **passes automated_verification**, and is **within
freshness_requirement** (session-aware). Anything less is `degraded`/
`unhealthy`. A busy process that emits no correct, on-time artifact is
**unhealthy** — activity is not health.

Status ladder: `unknown` → `absent` → `not_started` → `unverified` →
`healthy` ⇄ `degraded` ⇄ `unhealthy`. Claiming `healthy` requires
`status_evidence` (no unsupported readiness).

## Verification runs where the evidence is

- Windows-owned capabilities self-verify locally and report the verdict +
  evidence pointer in the bundle.
- The Cloud Governor **re-verifies** what it can from the bundle (integrity,
  schema, counts, rule ids) — it does not take a `healthy` claim on faith.
  `automated_verification.runs_on` records the authoritative verifier.

## Current registry status (2026-07-23)

All Windows-domain capabilities are `unknown` (nothing observed yet — READ
authority not exercised); the two bridge capabilities are `not_started`
(specified, not instantiated). This is the honest starting state the first
understanding pass will fill in. **No status is pre-supposed.**

## Calibration

Every `freshness_requirement.max_staleness_seconds` and `expected_cadence` is
`null` today. They are set **only** from observed cadence once the Windows
Governor has produced real bundles — never guessed. Until calibrated, freshness
is reported as `unknown`, not `healthy`.
