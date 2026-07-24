# SPEC-02 — Capability Contracts (Capability Monitoring)

**Component:** capability contracts (Founder build list)
**Directive:** *Replace heartbeat monitoring with capability monitoring. A
capability is healthy only if its intended output is produced correctly and on
time.*

## The capability-health definition

A capability is **healthy** iff, within its evaluation window:

1. **Produced** — its intended output exists (rows in the raw store / fires on
   the calendar), AND
2. **Correct** — that output passes the named `correctness_checks` (SPEC-05
   rule ids), AND
3. **On time** — it arrived within `freshness.max_staleness_seconds`, evaluated
   session-aware.

Failing any of the three ⇒ `degraded` (partial) or `unhealthy` (none). A live
process with a beating heart but **no correct, on-time output is UNHEALTHY.**
That is the whole point of the switch away from heartbeats.

Status ladder: `absent` → `not_started` → `unverified` → `healthy` ⇄
`degraded` ⇄ `unhealthy`. Claiming `healthy` requires `status_evidence`
(Constitution Law 2/3).

## Contracts

Concrete, machine-readable contracts live in `contracts/capabilities.json`
(validated by `schemas/capability-contract.schema.json`). Summary of current
verified status:

| Capability | Intended output | Status (2026-07-23) |
| ---------- | --------------- | ------------------- |
| `market_data_collector` | fresh quote/trade obs during session | **absent** (env boundary) |
| `scheduler` | on-time, calendar-correct fires | **absent** (env boundary) |
| `execution_pipeline` | full order lifecycle + fills + rejects w/ latency | **absent** (env boundary; also credential-gated) |
| `raw_observation_store` | append-only, tamper-evident rows | **not_started** (DDL specified) |
| `freshness_detector` | session-aware staleness verdicts | **not_started** (thresholds UNKNOWN) |

`absent` = does not exist in the *observable* environment. Per the Founder's
environment-boundary ruling, that is a **provisioning fact, not a failure**.

## Session calendar (input to freshness & R-CAL-1 / R-TS-1)

Freshness and calendar checks require an authoritative session model. The
**structure** is public and legitimate to encode; the **live calendar
(holidays, special/muhurat sessions, mid-day halts) must be loaded from the
exchange, not assumed**:

- NSE/BSE cash equity regular continuous session runs ~09:15–15:30 IST, with a
  pre-open auction phase before it. Encode phases as `pre_open | continuous |
  closing | post_close | halt`.
- Holiday list, special sessions, and any circuit halts are **loaded from the
  exchange calendar/feed** and are UNKNOWN until loaded. No holiday is guessed.

## Calibration hook

Every `freshness.max_staleness_seconds`, `expected_cadence`, and
`coverage.*` field is `null` today and is populated **only** from measured
cadence once VAJRA output is observable. The contract file is the single place
those calibrated numbers will land.
