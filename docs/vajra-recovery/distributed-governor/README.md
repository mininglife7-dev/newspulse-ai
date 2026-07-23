# MISSION OMEGA — Distributed Scientific Governor

> **One Governor Ω (2026-07-23):** "Cloud Governor" and "Windows Governor" are
> two *runtime contexts* of a single Governor Ω, not two entities. Every mission
> begins with Phase-0 runtime discovery → verified Capability Registry → plan
> with `AVAILABLE` capabilities only. See [`runtime/`](runtime/README.md); the
> latest verified registry is `runtime/RUNTIME-REGISTRY.latest.json`.

**Objective:** unify Cloud Governor and Windows Governor into one scientific
organization for continuous observation, evidence, learning, and evolution —
**not remote control.**

**Posture:** READ-ONLY by default. *The first mission is understanding, not
changing.* No mutation without an explicit, scoped Founder authorization token.

> *Cloud Governor thinks. Windows Governor observes. Shared evidence becomes
> organizational memory. Learning belongs to both.*

## Where this sits

This is the **organization layer**. Its **observation substrate** is the
Execution Reality Engine (`../execution-reality-engine/`): evidence bundles
carry its observation records, and capability monitoring reuses its rule ids,
confidence model, and append-only storage discipline. OMEGA adds the bridge,
the two-governor split, organizational memory, and the learning loop.

## Contents

| File | What |
| ---- | ---- |
| `ARCH-01-topology-roles-safety.md` | topology, roles, trust boundary, safety laws, scientific laws |
| `ARCH-02-evidence-bridge.md` | the Secure Evidence Bridge: transport, integrity, secret guard, staleness |
| `ARCH-03-capability-contracts.md` | the 7-field capability contract + health definition |
| `ARCH-04-learning-loop-memory.md` | Observe→Verify→Record→Learn→Recommend→Execute loop + org memory + authorization gate |
| `ARCH-05-windows-governor.md` | read-only observation spec + first understanding pass |
| `ARCH-06-cloud-governor.md` | reasoning/consumption pipeline + recommendation format |
| `schemas/evidence-bundle.schema.json` | the bridge unit |
| `schemas/omega-capability-contract.schema.json` | capability contract (superset of Execution Reality Engine's) |
| `schemas/learning-record.schema.json` | append-only organizational-memory record |
| `contracts/windows-capabilities.json` | concrete Windows capability registry (all `unknown` until observed) |
| `windows-governor/observe.reference.ps1` | **unverified** read-only observer skeleton |
| `EXECUTIVE-CYCLE-PROTOCOL.md` | the executive decision discipline every cycle runs (value test, loop, Daily Review, gates) |
| `research-gate.json` | **canonical** Alpha Campaign 2 gate (5 preconditions) — single source of truth |
| `CYCLE-LEDGER.jsonl` | append-only record of each executive cycle (the permanent product: learning) |
| `paper-trading/SUPERVISION-PROTOCOL.md` | Trade Gate + pre-registered journal + stop conditions for supervised PAPER sessions |
| `paper-trading/schemas/trade-journal.schema.json` | pre-registered paper-trade record (hypothesis locked at entry) |
| `paper-trading/SESSION-REPORT-2026-07-23.md` | session report: Governor STOPPED (system absent) — honest, zero fabricated trades |

## Safety laws (default mode)

READ ONLY · no code/config/production change · no live trading · no deletion ·
no irreversible operation · no fabricated observation · no secret exposure ·
mutation requires a scoped Founder token.

## Scientific laws

Evidence before Assumption · Reality before Simulation · Observation before
Optimization · Root Cause before Repair · Capability before Activity ·
Economic Viability before Statistical Significance · Learning before
Repetition.

## Verified status (2026-07-23)

- Architecture, bridge protocol, capability contracts, learning loop, memory
  model, and both Governor specs: **specified.**
- Windows capability registry: **all `unknown`** — nothing observed yet (READ
  authority not exercised; environment boundary).
- Bridge publish/consume: **`not_started`** — specified, not instantiated.
- Every empirical threshold (freshness, cadence): **`null`/UNKNOWN**, to be
  calibrated from observed reality. **Nothing fabricated.**

## Activation (when Founder grants Windows READ access)

1. Run/validate `windows-governor/observe.reference.ps1` on the workstation.
2. First understanding pass fills `contracts/windows-capabilities.json`
   statuses from real observation (ARCH-05).
3. Windows Governor publishes evidence bundles across the bridge (ARCH-02).
4. Cloud Governor verifies + records into organizational memory (ARCH-06).
5. Learning loop runs Observe→Verify→Record→Learn→Recommend and **stops at the
   authorization gate** — recommendations accumulate; nothing executes without a
   Founder token (ARCH-04).
6. After several cycles, calibrate freshness thresholds from observed cadence.

Until step 1 is possible, this is the complete, correct, data-free foundation —
nothing here needs redoing once observation begins.
