# VAJRA Learning System

A scientific **Learning Operating System**: it turns experiences into *verified
knowledge* and *reversible recommendations*, and it fabricates nothing.

> Memory stores · Knowledge explains · **Learning improves** · Governor decides
> · Execution acts. These are separate systems. This package is **Learning
> only** — it imports none of the others.

**Status: implemented and tested.** `python3 -m unittest discover -s tests` →
**14/14 pass**. `python3 examples/example_cycle.py` runs a full cycle.
Dependency-free (Python stdlib only), so it ports into the VAJRA repo as-is.

## Why it is safe by construction

- **No fabrication.** The Lesson Ledger ships **empty**. Engines invent no
  observations; Reflection emits only `PROPOSED` hypotheses; a hypothesis
  becomes `SUPPORTED` only via the Evidence Engine.
- **No overfit.** A finding is accepted **only** with in-sample significance
  **and** out-of-sample confirmation in the same direction. In-sample-only ⇒
  `REFUTED`. Confidence is structurally capped without OOS (`reproducibility`
  weight = 0.35).
- **Failures preserved.** Rejected hypotheses and `contradicting_evidence` are
  kept, never hidden. Ledger is append-only — `supersede`, never overwrite
  (the store exposes no `update`/`delete`).
- **Founder Protected Zone.** Recommendations touching capital allocation, max
  drawdown, daily loss limit, broker permissions, credentials, deployment, live
  trading, or emergency-stop are flagged `requires_founder_approval` and
  **cannot be applied** without a Founder token. Learning never reaches
  Execution — `apply()` records a decision; it mutates no production system.
- **Explainable + reversible.** Every Lesson carries evidence + stats +
  limitations; every Recommendation requires a `rollback_plan` (enforced).

## Components (the five engines)

| Component | File | Role |
| --------- | ---- | ---- |
| Observation Engine | `learning/observation_engine.py` | capture everything, conclude nothing (rejects payloads with a `conclusion`) |
| Reflection Engine | `learning/reflection_engine.py` | contrast winners vs losers → PROPOSED hypotheses only |
| Evidence Engine | `learning/evidence_engine.py` | test hypotheses; accept only significant + OOS-confirmed |
| Lesson Ledger | `learning/lesson_ledger.py` | append-only validated lessons; supersede, never overwrite |
| Policy Evolution Engine | `learning/policy_engine.py` | evidence-backed, reversible recommendations + Protected-Zone guard |

Supporting: `models.py` (data model), `store.py` (append-only JSONL persistence),
`confidence.py` (deterministic confidence scoring), `validation.py` (Welch
two-sample test + scientific-standards gate).

## Continuous learning cycle

```
Observe → Reflect → Hypothesize → Test → Validate → Record lesson
        → Recommend → (Founder approval) → Deploy → Observe again
```

## Requested deliverables → where they live

| # | Deliverable | Where |
| - | ----------- | ----- |
| 1 Architecture | this README + module layout |
| 2 Directory structure | `learning/`, `tests/`, `examples/` |
| 3 Module design | the five engines above |
| 4 Data model | `learning/models.py` |
| 5 APIs | engine classes (Python module interface) |
| 6 DB schema | append-only JSONL via `store.py` (portable; swap for SQL later) |
| 7 Event pipeline | Observe→…→Deploy (see cycle) |
| 8 Learning workflow | `examples/example_cycle.py` (runnable) |
| 9 Confidence model | `learning/confidence.py` |
| 10 Validation framework | `learning/validation.py` |
| 11 Lesson Ledger spec | `learning/lesson_ledger.py` + `Lesson` model |
| 12 Policy recommendation engine | `learning/policy_engine.py` |
| 13 Rollback mechanism | `Recommendation.rollback_plan` + `PolicyEvolutionEngine.rollback()` |
| 14 Documentation | this README (concise by intent) |
| 15/16/17 Unit / integration / e2e tests | `tests/test_units.py` · `test_integration.py` · `test_e2e.py` |
| 18 Example cycles | `examples/example_cycle.py` |
| 19 Sequence diagram | cycle diagram above (ASCII) |
| 20 Future roadmap | below |

## Validation Framework (OPERATION VAJRA — trusted validation)

Added for "I trust every number VAJRA produces":

- **Metric oracle** (`learning/metrics.py`) — independent reference
  implementations of Sharpe, Sortino, Profit Factor, Max Drawdown, Expectancy,
  Kelly, Win Rate, CAGR, plus `verify_metric()` to check a reported number
  against a recomputation. Covered by numerical known-answer **and** property
  tests (`tests/test_metrics.py`) — e.g. Sharpe scale-invariance, drawdown ≤ 0,
  zero-volatility → 0.0 (documented convention).
- **Walk-forward reference** (`learning/walkforward.py`) — leakage-safe **by
  construction**: test always after train, no overlap, in-bounds; each window
  self-validates. Regression tests assert no look-ahead / no leakage
  (`tests/test_walkforward.py`).
- **Experiment framework + evidence infra** (`learning/experiment.py`) —
  pre-registered `Experiment` (hypothesis/objective/data/metrics/success/
  failure/rollback/evidence/verification, all required) + append-only
  Experiment / Evidence / Decision ledgers (Learning Ledger already present).

These are the **trusted oracles** VAJRA's real numbers and WFO will be checked
against once reachable — they audit VAJRA; they are not VAJRA's own code.

## Honest limitations (truth over completeness-theater)

- Statistics are **stdlib-only**: Welch two-sample with a **normal-approximation**
  p-value. `ValidationMethod` enumerates Monte-Carlo / walk-forward / cross-val /
  stress; **only significance + out-of-sample are fully implemented** today. The
  others are named contracts to implement next, not claimed as done.
- Persistence is append-only JSONL, not a SQL database — deliberately, to stay
  dependency-free and portable. A SQL backend can implement the same append-only
  contract later.
- The system has processed **zero real observations** — as designed, since no
  real VAJRA data is reachable here. All fixtures are explicitly synthetic and
  used only to verify the code, never to assert a market finding.

## Future roadmap

1. Implement the remaining validation methods (walk-forward, Monte-Carlo,
   cross-validation, stress) behind the existing `ValidationMethod` contract.
2. SQL-backed append-only store with the same no-update/no-delete guarantee.
3. Regime-aware lesson retrieval + decay (lessons weaken as regimes shift).
4. Wire the Observation Engine's input contract to the Execution Reality Engine
   observation schemas (`../execution-reality-engine/schemas/`) so real fills
   flow in unchanged once VAJRA is reachable.
