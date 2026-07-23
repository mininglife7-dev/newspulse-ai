# SPEC-06 — Execution Evidence Specification

**Component:** execution evidence specifications (Founder build list)

This is the umbrella spec: for each of the ten mission parameters, it states
**the minimum observation set required to measure it**, the **formula** that
turns those observations into the parameter, and the **promotion rule** from
`UNKNOWN` → `measured/derived`. It supplies **no values** — it is the contract
that lets a future cycle compute values honestly.

## Promotion rule (applies to every parameter)

A parameter for a bucket (instrument × size-band × session-phase) becomes
publishable only when **all** hold:
1. its required observation set (below) exists for that bucket,
2. sample size ≥ `n_min` (SPEC-03 policy gate; UNKNOWN until set),
3. inputs are `measured`-grade (or the result is labelled `modeled` with the
   model named),
4. an interval is attached (SPEC-03).

Until then the parameter is **UNKNOWN** — and stays UNKNOWN. That is a correct
scientific state, not a gap to fill.

## Parameter → evidence map

| # | Parameter | Required observations | Formula (per fill/order, then aggregated) |
| - | --------- | --------------------- | ----------------------------------------- |
| 1 | Effective bid-ask spread | `quote` (bid/ask around event) | `2 × |price − mid| / mid` for marketable executions; else quoted `(ask−bid)/mid` |
| 2 | Real (realized) execution spread | `fill.reference_mid_at_fill` + short-horizon `quote`/`trade` | `side × (fill_price − mid_after_Δ) / mid` |
| 3 | Slippage | `order_lifecycle.arrival_reference` + `fill` | `side × (fill_price − arrival_mid) / arrival_mid` (R-REF-1 required) |
| 4 | Queue position effects | `quote.book` (L2) at submit + `fill` timing | fill probability / time-to-fill vs. depth ahead at our price |
| 5 | Partial fills | `fill.cumulative_filled_qty` vs `order_size` | filled fraction distribution; count of child fills per order |
| 6 | Order rejection frequency | `rejection` + total `order_lifecycle` submits | rejects / submits, Wilson interval; bucketed by `reject_stage`/code |
| 7 | Fill latency | `order_lifecycle` timestamps (submit→ack→fill) | Δt per transition; report quantiles, not just mean |
| 8 | Market impact | `fill` + `post_trade_mid[horizons]` + pre-trade `quote` | `side × (mid_{t+h} − mid_{t−}) / mid_{t−}` vs order_size |
| 9 | Time-of-day execution quality | any of the above + `session_phase`/`event_timestamp` | parameters 1–8 re-bucketed by session phase |
| 10 | Symbol-specific execution | any of the above + `instrument.symbol` | parameters 1–8 re-bucketed by instrument |

`side = +1` for buy, `−1` for sell, so a positive slippage/impact is always
adverse.

## Effective Cost Model (assembly)

Per executed order, effective implementation cost assembles the measured
components (all `UNKNOWN` until the map above is satisfied):

```
effective_cost = half_spread_paid            # from (1)/(2)
               + slippage                     # from (3)
               + market_impact                # from (8)
               + latency_cost                 # adverse move over (7)
               + fees_and_taxes               # from fill.fees (sourced rates)
```

`fees_and_taxes` component **taxonomy** is known (brokerage, STT, exchange txn
charge, SEBI turnover fee, stamp duty, GST); the **rates** are sourced from the
broker contract note / regulator schedule, never assumed.

## Deliverables this operationalizes

The mission's reporting deliverables (spread distribution, slippage
distribution, latency analysis, fill-quality analysis, execution-quality
dashboard, updated feasibility map, recommended search regions) are all
**views/aggregations over `effective_observations`** defined by the map above.
They are intentionally **empty today** and populate the moment measured
observations land. Emitting them now would fabricate evidence — prohibited.

## Feeds the Uncertainty Register

Each row here maps to a Remaining Uncertainty Register entry
(`EXECUTION_REALITY_ENGINE_ASSESSMENT.md` §5). A parameter's promotion from
UNKNOWN → measured is exactly the event that collapses its uncertainty. That is
the mission's definition of success: *not discovering alpha — eliminating
uncertainty.*
