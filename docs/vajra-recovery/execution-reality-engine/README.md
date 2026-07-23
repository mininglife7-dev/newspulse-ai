# Execution Reality Engine — Portable Component Kit

**Mission:** ALPHA 1.2 "Execution Reality"
**Phase:** Boundary phase — build everything that does **not** require access to
the Windows VAJRA workstation (Founder directive, 2026-07-23).
**Status:** Components specified & schematized. **No measurements. No fabricated
values. UNKNOWN stays UNKNOWN.**

## Why this kit is language-neutral

VAJRA's stack is not observable from this environment, and the mission forbids
assumption. So the engine is expressed as **JSON Schema + SQL + specifications**
— executable/portable in any language — rather than as code that would presume
a runtime. It is designed to drop into the VAJRA repository (wherever it lives)
without modification, and it adds nothing to the EURO AI product it currently
sits beside.

## Founder build list → artifact map

| Founder-requested component | Artifact(s) |
| --------------------------- | ----------- |
| schemas | `schemas/*.observation.schema.json` |
| interfaces | `schemas/observation.envelope.schema.json` + `SPEC-01` (language-neutral interfaces) |
| capability contracts | `SPEC-02` + `contracts/capabilities.json` + `schemas/capability-contract.schema.json` |
| observation formats | `SPEC-01` + all observation schemas |
| confidence models | `SPEC-03` |
| storage structures | `SPEC-04` + `storage/raw_observations.sql` |
| validation rules | `SPEC-05` + JSON Schemas (executable validation) |
| execution evidence specifications | `SPEC-06` |

## Layout

```
execution-reality-engine/
├── README.md                       # this file
├── SPEC-01-observation-formats.md
├── SPEC-02-capability-contracts.md
├── SPEC-03-confidence-model.md
├── SPEC-04-storage-structures.md
├── SPEC-05-validation-rules.md
├── SPEC-06-execution-evidence.md
├── schemas/
│   ├── observation.envelope.schema.json
│   ├── quote.observation.schema.json
│   ├── trade.observation.schema.json
│   ├── order-lifecycle.observation.schema.json
│   ├── fill.observation.schema.json
│   ├── rejection.observation.schema.json
│   └── capability-contract.schema.json
├── storage/
│   └── raw_observations.sql
└── contracts/
    └── capabilities.json
```

## Invariants honored throughout

- **Evidence before Assumption / Reality before Simulation.** Only structural
  and logical invariants (price > 0, spread ≥ 0, fill ≤ order, monotonic time)
  are asserted. Every empirical threshold and value is `null`/UNKNOWN until
  measured.
- **Uncertainty is explicit.** Confidence level + interval methodology are
  mandatory (SPEC-03); nothing is promoted above `unknown` without measured
  inputs.
- **Raw is sacred.** Append-only, tamper-evident storage; invalid data is
  quarantined, never dropped; corrections append, never edit (SPEC-04).
- **Capability, not heartbeat.** Health = correct, on-time *output* (SPEC-02).

## Activation sequence (begins when Windows access is granted)

Per the Founder's preferred sequence:

1. Governor reads `C:\vajra` → inventory every subsystem.
2. Map each subsystem to a capability in `contracts/capabilities.json`;
   set `status` from verified reality.
3. Verify collector → scheduler → execution pipeline against SPEC-02.
4. Calibrate the `null` freshness/coverage thresholds from observed cadence.
5. Begin measured execution observations into `raw_observations`.
6. Promote parameters UNKNOWN → measured per SPEC-06; attach intervals.
7. Update the Feasibility Map and Uncertainty Register from measured evidence.

Until step 1 is possible, this kit is the complete, correct, data-free
foundation — nothing here needs to be redone once data arrives.
