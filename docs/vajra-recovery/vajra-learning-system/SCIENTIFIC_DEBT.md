# Scientific Debt Register

Every unanswered scientific question and unproven assumption. Debt is not a
failure — hidden debt is. Each item states what would retire it. Recorded by
Governor Ω (Scientific Validation Governor); most items surfaced by the Day-2
adversarial self-audit.

| ID | Debt | Type | Retired when |
| -- | ---- | ---- | ------------ |
| SD-01 | Kelly uses the **binary** model (`W−(1−W)/R`); real pnl is a distribution, so this over/under-states optimal fraction. | hidden assumption | full-distribution (log-growth) Kelly implemented + tested vs binary on known cases |
| SD-02 | Sortino downside deviation uses **total-n** denominator; the downside-count convention gives different values. | convention ambiguity | reconcile with VAJRA's definition; document the chosen one as canonical |
| SD-03 | Annualization assumes iid per-period returns and `periods_per_year=252`. | untested assumption | autocorrelation check + a documented ppy per instrument/timeframe |
| SD-04 | p-values use a **normal approximation** (stdlib-only), not the exact t-distribution. | statistical approximation | exact t with agreement test on small n — **PARTIALLY RETIRED** 2026-07-24: seeded bootstrap CIs + Monte-Carlo robustness added (`stats_validation.py`); exact-t still pending |
| SD-05 | Overlapping **test** windows (`step < test_size`) make cross-window aggregates statistically **dependent**. | reproducibility risk | add `allow_overlap` guard + independence-aware aggregation, or forbid by default |
| SD-06 | Empty-input metrics return `0.0` (a sentinel), not a distinct "no data" value. | semantic ambiguity | decide sentinel vs exception vs `None`; document and test |
| SD-07 | No **benchmark** to compare VAJRA metrics against (buy-and-hold, random-entry null). | missing benchmark | implement null/benchmark generators; every result reported vs null |
| SD-08 | No **confidence intervals** on the metrics themselves (only on the two-sample test). | missing CIs | **RETIRED** 2026-07-24: seeded percentile-bootstrap `bootstrap_ci()` works for any metric (`stats_validation.py`, reproducible) |
| SD-09 | No **datasets**: zero real observations; all validation is on synthetic fixtures. | missing dataset | real read-only market data / VAJRA fills (blocked on `vajra_repository`/`market_data`) |
| SD-10 | No **reproducibility proof** across environments (only this Linux container). | missing repro proof | run suite on the Windows/VAJRA host; compare oracle outputs bit-for-bit |
| SD-11 | Monte-Carlo / walk-forward-*optimization* / cross-validation / stress methods are **named but not implemented**. | missing capability | implement each behind the existing `ValidationMethod` contract with tests |
| SD-12 | Float determinism of JSONL persistence across platforms not proven. | reproducibility risk | round-trip + cross-platform hash comparison |
| SD-13 | Regime-engine thresholds (vol/trend/event_sigma) are **unvalidated heuristics**, not empirically calibrated. | hidden assumption | calibrate on real regime-labelled data once available |
| SD-14 | Backtest Integrity Engine audits the **declared spec only**; the actual backtest code stays OUT OF SCOPE until readable. | scope limit | run against VAJRA's real backtest once `vajra_repository` is AVAILABLE |
| SD-15 | Autopsy & Skeptic engines enforce that evidence/answers **exist**, but cannot judge the **quality** of human-supplied content. | structural limit | pair with peer/independent review of the supplied content |

## Priority for retirement (highest scientific value first)

1. **SD-09 / SD-10** — real data + cross-host reproducibility (blocked on VAJRA
   access; the binding constraint).
2. **SD-07 / SD-08** — benchmarks + metric confidence intervals (buildable now).
3. **SD-05 / SD-01 / SD-02** — tighten the oracle's known conventions.
4. **SD-11 / SD-04** — broaden validation methods and exactness.

Nothing here is fabricated as resolved. Open debt stays open until evidence
closes it.
