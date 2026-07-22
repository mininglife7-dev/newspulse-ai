# Governor Ω — Experiment Queue

**Purpose:** Structure hypothesis testing pipeline before production deployment  
**Status:** ACTIVE  
**Current Queue Size:** 3 items
**Paper Study Completion:** 3 of 3 experiments (EXP-001, EXP-002, EXP-003)
**Simulation Completion:** 3 of 3 experiments (EXP-001 validated; EXP-002 validated; EXP-003 executed → NOT VALIDATED, paused)

---

## HYPOTHESIS-TO-PRODUCTION PIPELINE

All ideas must pass through all stages:

```
Hypothesis (candidate idea)
    ↓
Paper Study (understand theory from academic/professional sources)
    ↓
Simulation (validate core mechanics in isolation)
    ↓
Backtest (historical performance testing)
    ↓
Walk Forward (out-of-sample validation on subsequent data)
    ↓
Monte Carlo (stress testing and robustness validation)
    ↓
Shadow (simulate real deployment without live money)
    ↓
Promotion (approved for production deployment)
```

**No stage can be skipped.**

---

## EXPERIMENT RECORD FORMAT

```
ID: EXP-[YYYYMMDD]-[NUMBER]
Date Created: [ISO 8601]
Hypothesis: [Clear, testable statement]
Expected Outcome: [What success looks like]
Failure Condition: [What means this fails]
Priority: [CRITICAL | HIGH | MEDIUM | LOW]

STAGE 1: PAPER STUDY
Status: [NOT_STARTED | IN_PROGRESS | COMPLETED]
Key References: [Papers, articles, research]
Findings: [What the literature says]
Completion Date: [Date completed]

STAGE 2: SIMULATION
Status: [NOT_STARTED | IN_PROGRESS | COMPLETED]
Code: [Implementation details]
Test Conditions: [Setup and parameters]
Results: [Metrics and observations]
Completion Date: [Date completed]

STAGE 3: BACKTEST
Status: [NOT_STARTED | IN_PROGRESS | COMPLETED]
Data Period: [Start date - End date]
Performance Metrics: [Sharpe, returns, drawdown, etc.]
Statistical Significance: [P-value or confidence interval]
Results: [Pass/Fail with explanation]
Completion Date: [Date completed]

STAGE 4: WALK FORWARD
Status: [NOT_STARTED | IN_PROGRESS | COMPLETED]
Test Period: [Period not seen during backtest]
Performance Metrics: [Out-of-sample results]
Consistency: [Compare to backtest results]
Results: [Pass/Fail with explanation]
Completion Date: [Date completed]

STAGE 5: MONTE CARLO
Status: [NOT_STARTED | IN_PROGRESS | COMPLETED]
Perturbations: [What we varied]
Scenarios Tested: [Number and types]
Failure Cases: [When does this break?]
Robustness Score: [0-100%]
Results: [Pass/Fail with explanation]
Completion Date: [Date completed]

STAGE 6: SHADOW
Status: [NOT_STARTED | IN_PROGRESS | COMPLETED]
Simulation Period: [Duration of shadow test]
Live Market Conditions: [What we tested against]
Deployment Simulation: [Real execution simulation]
Results: [Pass/Fail with explanation]
Completion Date: [Date completed]

PROMOTION DECISION
Overall Result: [ADOPT | REJECT | MORE_EVIDENCE]
Lesson Learned: [Key insight from experiment]
Next Step: [What to do next]
Recommendation: [For VAJRA Phase 1 implementation]

GENOME IMPACT
Genes Updated: [Which genome genes did this affect?]
Evolution Details: [How did each gene change?]
```

---

## QUEUED EXPERIMENTS

### Priority Tier 1: CRITICAL (Immutable Law Foundation)

**EXP-20260722-001** — Capital Preservation Constraint Formalization

**Date Created:** 2026-07-22  
**Hypothesis:** Mathematical formalization of drawdown constraints as optimization parameters will quantify Mission Omega Immutable Law 1 and enable measurable risk boundaries for all experiments (30-40% tail risk reduction with 1-2% return cost).  
**Expected Outcome:** Validated optimization framework with VAJRA baseline drawdown metrics. Ready for Shadow stage deployment.  
**Failure Condition:** Cannot establish clear tradeoff between drawdown constraint tightness and expected returns; framework unmeasurable on VAJRA data.  
**Priority:** CRITICAL

**STAGE 1: PAPER STUDY**  
Status: COMPLETED  
Completion Date: 2026-07-22 15:30 UTC

**Key References:**

- Portfolio Theory: Markowitz (1952) mean-variance optimization; Rockafellar & Uryasev (2000) CVaR formulation
- Risk Management: Dowd (2005) "Measuring Market Risk" (2nd ed., Wiley) CVaR framework; regulatory ES/CVaR standards (Basel III FRTB, BCBS 2016) [Dowd year corrected 2007→2005 via provenance verification, GOV-EVO-2026-07-D04-001]
- VAJRA Phase 1: Mission Omega Immutable Law 1 (Capital Before Profit) quantification requirement
- Institutional Practice: Goldman Sachs risk limit frameworks, JPMorgan VaR backtesting

**Core Research Question:**
Can drawdown constraints be formalized as optimization parameters such that they measurably reduce tail risk (maximum loss) while maintaining acceptable expected returns?

**Mechanism (Findings from Literature):**

1. **CVaR Formulation (Uryasev 2000):**
   - Define CVaR(α) = expected value of returns worse than α-quantile
   - Standard: CVaR(95%) constrains portfolio to avoid losses worse than 95% historical outcomes
   - Optimization: Minimize CVaR(95%) subject to expected return ≥ R_min
   - Result: Portfolio naturally avoids tail-risk scenarios

2. **Drawdown Constraint Integration:**
   - Drawdown = current peak-to-trough decline
   - Maximum Drawdown (MDD) = worst peak-to-trough in observation period
   - CVaR approach: Constrain portfolio such that historical worst-case drawdown ≤ D_max
   - Effect: Reduces leverage and tail-risk exposure simultaneously

3. **Tradeoff Quantification (Rockafellar & Uryasev):**
   - Tighter drawdown constraint → lower tail risk (30-40% reduction possible)
   - Cost: Reduced expected return (1-2% annual return loss observed in practice)
   - Optimal zone: MDD constraint of 10-15% yields best risk-adjusted Sharpe ratio

**Expected Market Regime:**

- Effective in high-volatility regimes (reduces catastrophic drawdowns)
- Effective in trending markets (maintains upside while capping downside)
- Marginal benefit in low-volatility steady markets (constraint rarely binding)
- Testable: Compare constraint effectiveness across 2008, 2020 COVID, 2022 bear market, current regime

**Quantifiable Hypothesis:**
If VAJRA's historical returns are constrained by CVaR(95%) ≤ D_max (12% maximum drawdown), then:

- Tail risk (worst 5% loss) will reduce by 25-35%
- Expected annual return will reduce by 1-2%
- Sharpe ratio will improve (risk reduction > return reduction)
- Maximum observed drawdown will never exceed D_max

**Data Requirements:**

- VAJRA's complete historical returns series (daily, monthly as available)
- Current baseline drawdown metrics (existing peak-to-trough data)
- Transaction cost assumptions (% per trade, bid-ask estimates)
- Leverage constraints (current margin policy)

**Leakage Risks Identified:**

- Risk of optimizing constraint on historical data then testing on same data (overfitting to past regimes)
- Mitigation: Use only pre-2020 data for constraint optimization; validate on 2020-2026 out-of-sample

**Overfitting Risks Identified:**

- Risk of choosing CVaR(95%) specifically because it fits VAJRA's historical data
- Mitigation: Fix constraint level (12% MDD) a priori based on Mission Omega requirements, not on VAJRA backfit

**Evaluation Metrics:**

- Maximum Drawdown (MDD): must be ≤ 12% in backtest
- Sharpe Ratio: must improve vs baseline (denominator = risk, numerator = return)
- Return Volatility: should decrease 20-30%
- Worst-case loss (CVaR 95%): should decrease 25-35%
- Feasibility: framework must be implementable in VAJRA's current trading system

**Rejection Criteria:**

- Cannot establish clear tradeoff curve (return vs. MDD constraint)
- MDD constraint cannot be mechanically enforced in VAJRA's position management
- Expected improvement (Sharpe ratio gain) < 5% (too small relative to implementation risk)
- Constraint causes more than 50% reduction in expected return (return sacrifice too high)

**Next Validation Stage:** Simulation (build synthetic portfolio with CVaR constraint)

**STAGE 2: SIMULATION**  
Status: COMPLETED  
Completion Date: 2026-07-22 16:10 UTC

**Code:** `scripts/governor/cvar-simulation.mjs` (self-contained, zero external deps, deterministic — seed=20260722). Reproduce: `node scripts/governor/cvar-simulation.mjs`.

**Test Conditions:**

- Synthetic daily returns: GARCH(1,1) volatility clustering (long-run ~18% annualized) + fat-tailed jump crashes (~every 150 days), ~12% annual drift, 756 trading days (3 synthetic years).
- Constraint mechanisms compared (both causal, no lookahead):
  - **B. Volatility-target only** — EWMA (λ=0.94) trailing vol estimate; exposure = min(1, 15% target / trailing vol).
  - **C. Vol-target + drawdown-cut** — same, plus linear exposure reduction as trailing drawdown approaches D_max = 12%.
- A-priori D_max = 12% (Mission Omega Law 1), NOT fitted to the realized path.

**Results (seed 20260722, single path):**

| Metric            | A. Baseline | B. Vol-target | C. Vol-target + DD-cut |
| ----------------- | ----------- | ------------- | ---------------------- |
| Annualized return | 21.26%      | 13.51%        | 5.37%                  |
| Annualized vol    | 21.39%      | 15.67%        | 14.03%                 |
| Sharpe            | 1.009       | 0.888         | 0.443                  |
| Max drawdown      | 14.75%      | 11.86%        | 11.57%                 |
| CVaR95 (daily)    | −3.13%      | −2.24%        | −2.15%                 |
| CVaR95 reduction  | —           | 28.30%        | 31.21%                 |
| MDD reduction     | —           | 19.59%        | 21.52%                 |
| MDD ≤ 12% cap     | NO (14.75%) | YES (11.86%)  | YES (11.57%)           |

**Findings (honest, evidence-based):**

1. **Risk-control mechanics VALIDATED.** Both variants mechanically cap max drawdown below the a-priori 12% budget and reduce CVaR95 tail loss by 28–31% — the capital-preservation objective is achievable as a causal exposure control.
2. **The naive drawdown-cut is HARMFUL (rejected).** Variant C is procyclical: it de-levers _into_ recoveries, collapsing return (21.3% → 5.4%) and halving Sharpe (1.009 → 0.443, Δ −0.566). This refutes the intuition that adding a drawdown trigger improves outcomes.
3. **Forward-looking vol-targeting is the winning mechanism.** Variant B controls tail risk at a modest Sharpe cost (Δ −0.121) and is carried forward to Backtest.
4. **The Paper Study's "Sharpe will improve" claim is NOT confirmed on a single path** and is explicitly deferred — single-path Sharpe is statistically noisy; a Sharpe verdict requires the Monte Carlo stage (Stage 5) over many paths. Recording this rather than overclaiming.

**Stage 2 Verdict:** Mechanism **B (volatility-targeting)** VALIDATED for mechanics → advance to Backtest. Drawdown-cut variant REJECTED as procyclical.

**Next Validation Stage:** Backtest B on VAJRA historical returns once Windows Governor evidence extraction (VAJ-001 → GIT-001 → SCI-001) delivers the data.

**STAGE 3: BACKTEST**  
Status: NOT_STARTED  
Data Period: [Awaiting Windows Governor evidence extraction]
Performance Metrics: [Sharpe, max drawdown, return, Sortino ratio]
Statistical Significance: [Bootstrap confidence intervals]
Results: [Pending]
Completion Date: [Target: 2026-07-26]

**STAGE 4: WALK FORWARD**  
Status: NOT_STARTED

**STAGE 5: MONTE CARLO**  
Status: NOT_STARTED  
Perturbations: [Constraint tightness, market regime changes, volatility shocks]
Scenarios Tested: [5-10 major market stress scenarios]
Robustness Score: [To be determined]

**STAGE 6: SHADOW**  
Status: NOT_STARTED

**PROMOTION DECISION**  
Overall Result: [PENDING]

**GENOME IMPACT**  
Genes Updated: [RISK_TOLERANCE, EXECUTION_DISCIPLINE, GOVERNANCE_PRINCIPLES]

---

### Priority Tier 2: HIGH (Direct 1% Improvement)

**EXP-20260722-002** — Adaptive Execution Quality Improvement

**Date Created:** 2026-07-22  
**Hypothesis:** Adaptive execution algorithms (dynamic order routing, market-responsive timing) reduce slippage by 15-25% in liquid markets, contributing 1-2% to daily returns (VAJRA Phase 1 Category 5).  
**Expected Outcome:** Measurable slippage reduction vs. baseline; reproducible across market conditions.  
**Failure Condition:** Slippage reduction < 5%; algorithm breakdown in volatile markets; implementation cost > benefit.  
**Priority:** HIGH

**STAGE 1: PAPER STUDY**  
Status: COMPLETED  
Completion Date: 2026-07-22 16:40 UTC  
Cycle: GOV-EVO-2026-07-D02-001

**Experiment ID:** EXP-20260722-002

**Research Question:** Can an execution schedule that trades adaptively against
market impact reduce implementation shortfall (slippage) versus a naive schedule,
without increasing execution-timing risk?

**Falsifiable Hypothesis:** For a fixed parent order in a liquid instrument, an
Almgren–Chriss-style optimal-execution schedule (front-loaded, impact-aware) achieves
lower expected implementation shortfall than a uniform (TWAP) schedule at matched
timing risk; if measured slippage reduction is < 5% or timing-risk (variance of cost)
rises, the hypothesis is rejected.

**Source Evidence (provenance-verified this cycle):**

- **Almgren, R. & Chriss, N. (2000). Optimal Execution of Portfolio Transactions.
  Journal of Risk, 3(2).** — Tier **P1 (search-verified)**. Query:
  "Almgren Chriss 2000 Optimal execution of portfolio transactions market impact model";
  circulated author copy `smallake.kr/.../optliq.pdf`; confirmed: efficient frontier of
  liquidation strategies, permanent + temporary linear impact, hyperbolic optimal
  trajectory, Liquidity-adjusted VaR. Recorded in `scripts/governor/provenance-ledger.json`.
- Institutional context (P0, asserted, not yet retrieved): VWAP/TWAP benchmark practice.

**Mechanism (from verified source):** Total execution cost = permanent impact (moves the
price for everyone, ∝ trade rate) + temporary impact (transient, ∝ trade rate, paid by the
liquidator) + volatility risk over the trading horizon. Almgren–Chriss derives the
schedule minimizing E[cost] + λ·Var[cost]; for linear impact the solution is a
front-loaded hyperbolic trajectory (trade faster early to cut exposure to price
volatility, slower later to limit temporary impact). Adaptivity = re-solving the
trajectory as realized volatility/liquidity updates.

**Expected Market Regime:** Benefit largest in liquid, higher-volatility instruments
where timing risk dominates; marginal in thin/illiquid names where temporary impact
dominates and front-loading is costly. Testable across calm vs stressed liquidity.

**Expected Benefit:** 5–25% slippage reduction vs uniform schedule at matched timing
risk (literature range); translates to execution-quality contribution toward VAJRA
Phase 1 Category 5. NOT a raw-return claim — a transaction-cost reduction.

**Expected Failure Conditions:** Slippage reduction < 5%; variance of execution cost
rises (worse timing risk); front-loading degrades in low-liquidity regimes; impact
parameters unstable/unidentifiable from data.

**Data Requirements:** Per-order execution records (arrival price, fills, timestamps,
sizes), intraday volatility and spread/depth estimates, permanent & temporary impact
coefficients — all pending Windows Governor VAJRA extraction (SCI-001).

**Transaction-Cost Assumptions:** Linear permanent + linear temporary impact (Almgren–
Chriss baseline); explicit spread cost per fill; no rebates/latency modeled at Paper
stage. These assumptions are the primary model risk and must be stress-tested at
Simulation/Monte Carlo.

**Leakage Risks:** Fitting impact coefficients on the same window used to evaluate
slippage. Mitigation: fit impact model on an earlier window, evaluate on a later
held-out window.

**Overfitting Risks:** Tuning λ (risk-aversion) to minimize realized cost on the test
set. Mitigation: fix λ a priori from a target timing-risk budget, not from backfit.

**Evaluation Metrics:** Implementation shortfall vs TWAP baseline (bps); variance of
execution cost (timing risk); cost-vs-risk efficient-frontier position; robustness of
impact-parameter estimates.

**Rejection Criteria:** < 5% slippage reduction at matched timing risk; timing-risk
increase; unstable impact estimates; benefit disappears out-of-sample.

**Next Validation Stage:** Simulation — synthetic order-book / arithmetic-Brownian price
with linear impact; compare Almgren–Chriss schedule vs TWAP on shortfall and cost
variance. (Deterministic Node artifact, same pattern as `cvar-simulation.mjs`.)

**STAGE 2: SIMULATION**  
Status: COMPLETED  
Completion Date: 2026-07-22 17:10 UTC  
Cycle: GOV-EVO-2026-07-D03-001

**Code:** `scripts/governor/execution-simulation.mjs` — closed-form, deterministic
(no RNG), zero deps. Reproduce: `node scripts/governor/execution-simulation.mjs`.

**Test Conditions:** Canonical Almgren–Chriss (2000) worked example (P1-verified):
X=1,000,000 shares; σ=0.95 $/sh/day^0.5; γ=2.5e-7; η=2.5e-6; ε=0.0625; τ=1d; N=5;
λ=2e-6. Compared the Almgren–Chriss risk-averse liquidation schedule vs uniform TWAP.

**Results:**

| Metric               | Almgren–Chriss       | TWAP                   |
| -------------------- | -------------------- | ---------------------- |
| Holdings path (k sh) | 1000→429→183→76→28→0 | 1000→800→600→400→200→0 |
| E[cost]              | $1,140,715           | $662,500               |
| Timing risk √V       | $449,368             | $1,040,673             |
| Objective E+λV       | $1,544,578           | $2,828,500             |

- **Timing-risk (std) reduction: 56.82%** · variance reduction 81.35%.
- **Mean-variance objective reduction: 45.39%** (gate ≥1% → PASS).
- **Expected-cost INCREASE: $478,215** — reported, not hidden. TWAP minimizes E[cost];
  AC front-loads (more temporary impact) to cut volatility exposure.

**Findings (honest):** The mechanism validates — AC materially reduces execution timing
risk and lowers the risk-averse objective. But AC is only preferable for λ>0; a pure
cost-minimizing desk would choose TWAP. The slippage-vs-timing-risk trade-off is the
efficient frontier from Almgren–Chriss (2000), reproduced exactly. Per-share RETURN
impact on VAJRA (the 1%/day objective) is NOT established here — deferred to Backtest on
real fills with estimated impact coefficients.

**Stage 2 Verdict:** MECHANISM VALIDATED → advance to Backtest (blocked on VAJRA data).

**Next Validation Stage:** Backtest on VAJRA execution records once SCI-001 delivers fills
and impact-coefficient estimates.

**STAGE 3: BACKTEST**  
Status: NOT_STARTED  
Data Period: [Awaiting Windows Governor historical data]
Performance Metrics: [Slippage vs. baseline, Sharpe delta, execution cost]
Statistical Significance: [T-test on slippage differences]

**STAGE 4: WALK FORWARD**  
Status: NOT_STARTED

**STAGE 5: MONTE CARLO**  
Status: NOT_STARTED  
Scenarios Tested: [Flash crash, limit order book microstructure changes, low-liquidity regimes]

**STAGE 6: SHADOW**  
Status: NOT_STARTED

**PROMOTION DECISION**  
Overall Result: [PENDING]

**GENOME IMPACT**  
Genes Updated: [EXECUTION_DISCIPLINE, STRATEGY_EVOLUTION, LEARNING_VELOCITY]

---

**EXP-20260722-003** — Deep RL Portfolio Optimization (Position Sizing + Exit Logic)

**Date Created:** 2026-07-22  
**Hypothesis:** Policy-gradient RL optimizes position sizing (2-3% improvement) and exit timing (1-2% improvement) for 3-5% cumulative daily return improvement (VAJRA Phase 1 Categories 2 & 3).  
**Expected Outcome:** Learned policy outperforms fixed-rule baseline across backtests and walk-forward tests.  
**Failure Condition:** Policy underperforms baseline; overfits to training data; cannot converge to stable policy.  
**Priority:** HIGH

**STAGE 1: PAPER STUDY**  
Status: COMPLETED  
Completion Date: 2026-07-22 17:40 UTC  
Cycle: GOV-EVO-2026-07-D04-001

**Experiment ID:** EXP-20260722-003

**Research Question:** Can a reinforcement-learning policy that directly optimizes a
risk-adjusted objective (e.g. Sharpe/differential Sharpe) improve position sizing and
exit timing versus a fixed-rule baseline, _out-of-sample_, without overfitting?

**Falsifiable Hypothesis:** A direct-reinforcement policy trained on pre-2020 data yields
a higher out-of-sample (2020-2026) Sharpe than the fixed-rule baseline by a margin that
survives walk-forward and multiple random seeds; if the out-of-sample Sharpe gain is
≤ 0 or is not stable across seeds/regimes, the hypothesis is rejected.

**Source Evidence (provenance-verified this cycle):**

- **Moody, J. & Saffell, M. (2001). Learning to Trade via Direct Reinforcement.
  IEEE Transactions on Neural Networks, 12(4), 875-889.** — Tier **P1 (search-verified)**.
  Query in `scripts/governor/provenance-ledger.json`. Confirmed: recurrent reinforcement
  learning (RRL) optimizes a differential Sharpe ratio directly (not raw profit), avoids
  building a forecasting model, and sidesteps the curse of dimensionality of value-based RL.
- Modern policy-gradient methods (PPO/A3C): **P0 (asserted)** — not retrieved this cycle;
  cited as background, not evidence.

**Mechanism (from verified source):** Direct reinforcement parameterizes the trading
policy F_t = f(θ; returns, position_{t-1}) and updates θ by gradient ascent on a
risk-adjusted utility (differential Sharpe ratio), including transaction-cost terms in the
reward. Because the objective is risk-adjusted and cost-aware, the learned policy targets
_sustainable_ rather than raw return — directly aligned with the 1%/day-net objective and
with capital preservation.

**Expected Market Regime:** RRL adapts to slow regime drift but is fragile to abrupt
regime breaks not seen in training. Most credible where the traded signal has persistent
autocorrelation; least credible in pure random-walk regimes.

**Expected Benefit (CORRECTED — original claim rejected):** The original card claimed
"3-5% cumulative _daily_ return improvement." This is **rejected as unrealistic** — a
sustained multi-percent daily edge from position sizing alone contradicts the 1%/day
_sustainable_ North Star and the capital-preservation law. Reframed expected benefit:
a modest, _risk-adjusted_ Sharpe improvement (target: out-of-sample Sharpe uplift with
stability across seeds), value measured on Sharpe/Sortino, not raw return.

**Expected Failure Conditions:** Out-of-sample Sharpe ≤ baseline; policy unstable across
random seeds; performance collapses in held-out regimes; benefit vanishes once realistic
transaction costs are included.

**Data Requirements:** Long clean return series with regime diversity; realistic
transaction-cost model; VAJRA signal/feature set — all pending Windows Governor extraction.

**Transaction-Cost Assumptions:** Costs MUST be in the reward from the start (Moody &
Saffell show cost-blind RRL over-trades). Model per-trade cost + slippage; stress at
Simulation/Monte Carlo.

**Leakage Risks (HIGH for RL):** Look-ahead via feature normalization over the full
sample; training/test contamination through overlapping windows; hyperparameter tuning on
the test set. Mitigations: strict temporal splits, walk-forward only, no test-set tuning.

**Overfitting Risks (HIGH — primary risk):** DRL for trading is notoriously
non-reproducible and prone to fitting noise. Mitigations: fix architecture/hyperparameters
a priori; require stability across ≥5 random seeds; reject if variance across seeds exceeds
the mean edge; prefer the simplest policy (RRL) over deep value-based methods.

**Evaluation Metrics:** Out-of-sample Sharpe & Sortino vs baseline; seed-stability
(std of edge across seeds); regime-conditional performance; turnover and net-of-cost PnL.

**Rejection Criteria:** No positive out-of-sample risk-adjusted edge; edge not stable
across seeds; edge disappears net of costs; cannot converge to a stable policy.

**Next Validation Stage:** Simulation — implement RRL (differential Sharpe, cost-aware) on
a synthetic signal with known autocorrelation; verify it recovers a sensible policy and
that a cost-blind variant over-trades (sanity check before any VAJRA data).

**STAGE 2: SIMULATION**  
Status: COMPLETED (verdict: NOT VALIDATED — experiment PAUSED)  
Completion Date: 2026-07-22 18:10 UTC  
Cycle: GOV-EVO-2026-07-D05-001

**Code:** `scripts/governor/rrl-simulation.mjs` — RRL policy F=tanh(w·[lagged returns,
F_{t-1}, bias]) trained by finite-difference gradient ascent on net-return Sharpe.
Deterministic (seeded), 5 seeds, cost in objective. Reproduce: `node scripts/governor/rrl-simulation.mjs`.

**Test Conditions:** AR(1) momentum signal (φ=0.15) + pure-noise negative control (φ=0);
train 1500 / test 1500; cost 5 bps per unit position change; seeds {11,22,33,44,55}.

**Results (out-of-sample test Sharpe, mean over 5 seeds):**

| Condition            | RRL cost-aware     | RRL cost-blind (net) | Buy-and-hold |
| -------------------- | ------------------ | -------------------- | ------------ |
| AR(1) momentum       | −0.017 (std 0.456) | −0.547               | +0.335       |
| Pure noise (control) | +0.045             | −0.433               | +0.289       |

Turnover: cost-aware 0.019 vs cost-blind 0.426 (per step).

**Gate outcome (2 of 4 PASS):**

- (1) Beats buy-and-hold — **FAIL** (−0.017 < 0.335).
- (2) Cost-aware beats cost-blind net — **PASS** (over-trading penalty confirmed).
- (3) Edge > cross-seed std (stable) — **FAIL** (edge −0.353 vs std 0.456; seed-unstable).
- (4) No edge on pure noise (negative control) — **PASS** (0.045, no manufactured alpha).

**Findings (honest, negative result):** The simple RRL form does **not** produce a stable
out-of-sample risk-adjusted edge here, and results are **seed-unstable** — empirically
confirming EXP-003's primary flagged risk (DRL fragility/overfitting). The robust,
transferable win is that **cost-aware training prevents over-trading** (turnover 22× lower,
far better net Sharpe than cost-blind), matching Moody & Saffell (2001). The negative
control passed — the harness does not hallucinate alpha on noise.

**Portfolio decision:** **PAUSE** EXP-003. Do NOT advance to Backtest on optimistic priors.
Reconsider only with (a) a stronger/authentic signal model, (b) a proper recurrent RRL
gradient (not finite-difference), and (c) a fairer benchmark than directional buy-and-hold.
Value delivered: a false discovery was **prevented** — the harness rejected an unvalidated
strategy before it consumed Backtest/real-data resources.

**Next Validation Stage:** N/A while PAUSED (would be Backtest if revised and re-validated).

**STAGE 3: BACKTEST**  
Status: NOT_STARTED  
Data Period: [Awaiting VAJRA historical data]
Completion Date: [Target: 2026-08-01]

**STAGE 4: WALK FORWARD**  
Status: NOT_STARTED  
Completion Date: [Target: 2026-08-03]

**STAGE 5: MONTE CARLO**  
Status: NOT_STARTED

**STAGE 6: SHADOW**  
Status: NOT_STARTED

**PROMOTION DECISION**  
Overall Result: [PENDING]

**GENOME IMPACT**  
Genes Updated: [STRATEGY_EVOLUTION, LEARNING_VELOCITY, VALIDATION_DEPTH]

---

## EXPERIMENT QUEUE STATISTICS

| Metric                 | Count |
| ---------------------- | ----- |
| Total Experiments      | 3     |
| CRITICAL Priority      | 1     |
| HIGH Priority          | 2     |
| Paper Study: Queued    | 0     |
| Paper Study: Completed | 3     |
| Simulation: Completed  | 3     |
| Simulation: Rejected   | 1     |
| Total Stages Completed | 6     |

---

**Last Updated:** 2026-07-22  
**Experiments Queued:** 0  
**Experiments Completed:** 0
