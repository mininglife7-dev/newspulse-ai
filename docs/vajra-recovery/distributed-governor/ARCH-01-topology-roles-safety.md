# ARCH-01 — Topology, Roles & Safety

> **Superseding framing (2026-07-23):** there is **one Governor Ω**, not a
> "Cloud Governor" and a "Windows Governor." Those names denote two *runtime
> contexts* the same Governor Ω may discover itself in. Before any mission it
> runs Phase-0 discovery ([`runtime/`](runtime/README.md)) and plans only with
> verified-`AVAILABLE` capabilities. Read "Cloud Governor" below as "Governor Ω
> in a cloud/observer context" and "Windows Governor" as "Governor Ω in a
> context where VAJRA is locally reachable." Roles are assigned by the
> Capability Registry, never assumed.

**Mission:** OMEGA — Distributed Scientific Governor
**Posture:** READ-ONLY by default. The first mission is *understanding, not
changing.*

## Topology

```
Founder
   │  (directives, authorizations)
   ▼
Cloud Governor  ───────────────┐
   │  thinks                    │  consumes verified evidence
   ▼                            ▼
Secure Evidence Bridge  ◀── append-only, integrity-checked, one-way data
   ▲                            │
   │  publishes observations    │
Windows Governor  ◀─────────────┘
   │  observes (READ-ONLY)
   ▼
C:\vajra · C:\vajra_gold · market data · schedulers · collectors ·
research · paper trading · execution evidence · logs · artifacts
```

**One organization, two organs.** *Cloud Governor thinks. Windows Governor
observes. Shared evidence becomes organizational memory. Learning belongs to
both.*

## Trust boundary & data direction

- The bridge carries **evidence from Windows → Cloud** and **authorized
  instructions from Cloud → Windows**. Instructions are the *only* Cloud→Windows
  payload, they are **inert until a Founder authorization token accompanies
  them** (ARCH-04), and in default mode there are none.
- Cloud Governor has **no direct access** to the Windows filesystem (it cannot
  reach it; environment boundary). It sees only what the bridge publishes.
- Windows Governor has **READ** authority over its domain and **no write/mutate
  authority** without explicit Founder approval.

## Roles

### Cloud Governor — *thinks*
Scientific reasoning · research planning · memory · learning · genome
evolution · mission planning · capability inventory · engineering review ·
bottleneck detection · hypothesis management · evidence verification.
Consumes the bridge; never trusts an unverified bundle; records learning.
(Detailed in ARCH-06.)

### Windows Governor — *observes*
Reads the complete VAJRA environment; observes repos, collectors, schedulers,
market-data freshness, execution evidence, logs, artifacts, paper trading,
system health. Produces verified evidence bundles. **Changes nothing.**
(Detailed in ARCH-05.)

## Safety laws (default mode)

| # | Rule |
| - | ---- |
| S1 | **READ ONLY.** No code, config, or production change; no live trading; no deletion; no irreversible operation. |
| S2 | **Mutation requires Founder authorization** — a scoped, explicit token per action (ARCH-04 §Authorization gate). |
| S3 | **No fabricated observations.** Unknown remains UNKNOWN until measured. |
| S4 | **No secret exposure.** Secret *values* never cross the bridge; secrets are reported by presence/type only. |
| S5 | **Evidence integrity.** Every bundle is hash-chained and verified before use; failures are quarantined, not dropped. |
| S6 | **Reversibility.** Nothing in default mode changes state anywhere; the whole loop is safe to run continuously. |

## The scientific laws (govern every decision)

Evidence before Assumption · Reality before Simulation · Observation before
Optimization · Root Cause before Repair · Capability before Activity ·
Economic Viability before Statistical Significance · Learning before
Repetition.

These are not slogans here — each maps to a mechanism: evidence bundles
(observation), capability contracts (capability-before-activity), the learning
loop's Verify stage (root-cause / evidence-before-assumption), and the
UNKNOWN-until-measured rule everywhere (reality-before-simulation).

## Relationship to the Execution Reality Engine

OMEGA is the *organization*; the Execution Reality Engine
(`../execution-reality-engine/`) is its *observation substrate*. Evidence
bundles carry Execution Reality Engine observation records; capability
monitoring reuses its rule ids and confidence model. OMEGA adds the bridge,
the two-governor role split, organizational memory, and the learning loop.
