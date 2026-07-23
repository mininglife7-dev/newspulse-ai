# Paper-Trading Governor Supervision Protocol

**Mode:** PAPER TRADING ONLY — no live orders, no broker interaction, no
financial transactions, ever.
**Roles:** VAJRA is the research engine; Governor is the custodian of
scientific integrity. **Governor may STOP VAJRA. VAJRA may never override
Governor.**
**Primary objective:** increase scientific understanding of market behaviour.
Not profit, not win rate, not trade count. *Every trade is an experiment.*

This is the reusable experimental-control apparatus for a supervised paper
session. It runs only when a real VAJRA session and real market data are
present. Records use `schemas/trade-journal.schema.json`.

## Trade Gate (before every paper trade)

Governor executes the gate; VAJRA may act only on `verdict: approved`:

| Check | Meaning |
| ----- | ------- |
| regime identified | current market regime measured, not assumed |
| hypothesis documented | a falsifiable claim is stated **before** entry |
| expected edge stated | direction/magnitude basis given |
| invalidation defined | the pre-registered condition that would prove it wrong |
| estimated risk acceptable | within session risk policy |
| no policy violation | paper-only, size, frequency, session-window all clean |

Any failure → `no_trade` / `blocked` with reason. **Pre-registration is
structural** (schema): the hypothesis and invalidation are locked at entry, so
no post-hoc story can be fitted to the outcome.

## After every trade — record (16 fields)

timestamp · market regime · signal · confidence · expected edge · entry · exit
· duration · PnL (net of **measured** execution costs) · MFE · MAE · exit
reason · hypothesis supported? · unexpected observations · scientific lesson.

## Continuous analysis (Governor, during session — observation only)

Which hypotheses survive / fail? Which regimes most profitable? Which signals
produce false positives? Which filters improve expectancy? Where is uncertainty
highest? **Record; do not act on it mid-session.**

## Stop Conditions (Governor stops trading immediately)

unexpected behaviour · data corruption · **missing data** · confidence below
threshold · risk-policy violation · contradictory signals · **system
instability**. A STOP is itself a recorded scientific observation.

> **System-absence is the maximal missing-data condition.** If the research
> engine, market feed, or paper-trading capability is not present/verified,
> Governor STOPS before trade zero — it does not simulate a session over
> absent or synthetic data (that would be Simulation-as-Reality, forbidden).

## During-session discipline (Learning Law)

Do **not** optimise parameters, rewrite strategies, chase losses, revenge
trade, or increase frequency during market hours. Record observations.
**Learning happens after market close.**

## End-of-session report (produce only this)

Executive summary · # observations · # paper trades · regimes observed ·
hypotheses confirmed · hypotheses rejected · most valuable discovery · largest
mistake · largest surprise · recommended improvement · confidence change ·
expected impact on the long-term objective (sustainable 1% NET/day).

## Success definition

Success is **not** today's PnL. Success = *did we learn something that
permanently improves VAJRA?* If yes, the session succeeded. If no, **state
honestly why.** Never fabricate improvement. Truth over performance. Evidence
over opinion. Science over excitement.
