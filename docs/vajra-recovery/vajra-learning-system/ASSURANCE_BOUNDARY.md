# Assurance Boundary — VAJRA Learning & Validation Code

**Authority:** Governor Ω, Scientific Validation Governor.
**Rule:** every future report references this document. A claim not listed
`VERIFIED` here is not verified. Verification = a citable test/probe, not the
author's confidence.

**Last audited:** 2026-07-24 (Day 2 independent self-audit).
**Evidence:** `python3 -m unittest discover -s tests` → **41/41 PASS**, and the
same suite **41/41 PASS under `python3 -O`** (optimized mode).

## VERIFIED (evidence-backed, test-covered)

| Item | Evidence |
| ---- | -------- |
| Metric oracle numerical correctness (Profit Factor, Win Rate, Kelly [binary model], Max Drawdown, CAGR) | known-answer tests in `tests/test_metrics.py` |
| Sharpe scale-invariance (rf=0) | property test `test_sharpe_scale_invariance_rf0` |
| Zero-volatility → 0.0 convention (Sharpe/Sortino) | `test_zero_volatility_returns_zero` |
| Max drawdown ≤ 0, and **ruin capped at −1.0** for returns ≤ −100% | `test_max_drawdown_ruin_is_capped_at_minus_one` (defect fixed Day 2, Probe 1) |
| Walk-forward: no look-ahead, no train/test overlap, in-bounds | `tests/test_walkforward.py` |
| Walk-forward invariant survives `python -O` (explicit raise, not `assert`) | full suite green under `-O` (defect fixed Day 2, Probe 4) |
| Experiment pre-registration requires all planning fields | `tests/test_experiment.py` |
| Ledgers are append-only (no `update`/`delete` API) | `test_no_update_or_delete_api`, `test_experiment_ledger_records` |
| Protected Zone cannot auto-apply without Founder token | `test_protected_target_requires_approval` |
| Anti-overfit gate (in-sample+OOS required) | `test_in_sample_only_is_refuted_as_overfit` |

## PARTIALLY VERIFIED (correct within a stated model/convention)

| Item | Caveat |
| ---- | ------ |
| **Kelly fraction** | Implements the **binary** Kelly `W − (1−W)/R`; NOT full-distribution Kelly. Probe 3: returns a value on non-binary pnls using avg-win/avg-loss as payoff. Correct for the binary model only. |
| **Sortino** | Downside deviation uses **total-n** denominator (MAR convention), not downside-count. Probe 6. VAJRA may use a different convention — reconcile before comparing. |
| **Sharpe/Sortino/CAGR annualization** | `periods_per_year=252` assumed; results scale with it. iid-per-period assumption not tested. |
| **Statistical test** | Welch two-sample with **normal-approximation** p-value (stdlib-only); exact t-distribution not used. |

## NOT VERIFIED (built, but no independent confirmation yet)

- Behaviour on empty inputs returns `0.0` (Probe 2) — a **sentinel convention**,
  not a proven "no-data" semantic; downstream code must not treat 0.0 as a real
  measurement.
- Overlapping **test** windows when `step < test_size` (Probe 5) — permitted, but
  aggregate statistics across overlapping test sets are **not independent**.
  No guard/warning yet.
- File-level append-only durability: the in-memory API blocks update/delete, but
  a process editing the JSONL directly is not prevented (out of the library's
  control).

## OUT OF SCOPE (cannot be verified in this environment)

- **VAJRA's own metrics, WFO, modules, and code** — `vajra_repository:
  UNAVAILABLE` (Capability Register). Auditing code that cannot be read is
  forbidden; no claim about VAJRA's implementation is made anywhere.
- **Any real market/trading result** — zero real observations; all fixtures are
  synthetic and used only to verify code.

## Status summary

The **oracle is a trustworthy reference for its documented conventions** and has
been adversarially challenged and corrected. It is ready to *verify* VAJRA's
numbers the moment they are readable — it does not and cannot verify them today.
