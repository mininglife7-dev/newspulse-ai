# SPEC-03 — Confidence Model

**Component:** confidence models (Founder build list)
**Law:** *Maintain confidence intervals. Record uncertainty explicitly. Never
hide uncertainty.* This spec fixes the **methodology**; it asserts **no values**.

## Confidence levels (per-record)

| Level | Meaning | Allowed inputs |
| ----- | ------- | -------------- |
| `measured` | direct observation of the quantity | the raw feed/broker event itself |
| `derived` | computed **only** from `measured` inputs via a stated formula | measured records |
| `modeled` | involves an explicit model/assumption; the model **must be named** in `basis` | measured + a declared model |
| `unknown` | insufficient evidence | — |

Promotion is one-directional per evidence: a quantity is `unknown` until the
inputs required by SPEC-06 exist. Nothing is ever promoted by convenience.

## Interval methodology (per-aggregate)

When we publish an aggregate execution parameter (e.g. mean effective spread
for an instrument×session-phase bucket), it carries an interval:

- **Sample size gate.** No interval is published below `n_min` observations for
  that bucket. `n_min` is a **policy parameter to be set from data richness**
  (UNKNOWN until we see real volumes); until then the parameter stays `unknown`.
- **Method by quantity shape:**
  - bounded ratios / frequencies (rejection rate, partial-fill rate) →
    **Wilson** interval.
  - real-valued means (spread, slippage, latency) → **bootstrap** (preferred,
    distribution-free) or **t-interval** when approximately normal; the method
    used is stored in `confidence.interval.method`.
  - heavy-tailed quantities (latency tails, impact) → report **quantiles with
    bootstrapped quantile CIs**, not just a mean.
- **Coverage** (`interval.coverage`, e.g. 0.95) is recorded on every interval.
- **Heterogeneity is not averaged away.** Parameters are bucketed by the
  dimensions the mission names — instrument, order size band, time-of-day /
  session phase — before any interval is computed. A single blended number
  hides real structure and is prohibited as a headline.

## Uncertainty accounting

- Every published parameter records: `n`, method, coverage, bucket definition,
  and the observation window.
- **Provenance-weighted trust:** records whose `clock_source` is
  `system_unsynced/unknown` cannot contribute `measured`-grade latency; they
  degrade the confidence of any latency aggregate they enter.
- **Revision on new evidence** (Founder: *when evidence changes, immediately
  revise conclusions*): parameters are recomputed as observations accrue;
  each publication is stamped with the window so a later revision supersedes,
  never edits, the earlier claim (mirrors the append-only store).

## Explicitly out of scope until data exists

Priors, shrinkage, or Bayesian pooling across instruments are **not** applied
in the grounding phase — they would inject assumed structure. They may be
revisited *after* an empirical baseline exists and only with the model named.
