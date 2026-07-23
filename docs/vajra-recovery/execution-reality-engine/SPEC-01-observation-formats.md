# SPEC-01 — Observation Formats

**Component:** observation formats + interfaces (Founder build list)

Every observation shares the **envelope**
(`schemas/observation.envelope.schema.json`) and adds a type-specific body.
The envelope enforces the six Founder-mandated fields on every record.

## Mandatory fields (Founder directive)

| Directive field | Envelope location | Notes |
| --------------- | ----------------- | ----- |
| Timestamp | `event_timestamp` (+ `ingest_timestamp`) | source time and capture time are both required; they enable latency and staleness measurement |
| Instrument | `instrument.{symbol,segment,...}` | ISIN/lot/tick sourced from exchange master, `null` = UNKNOWN |
| Order size | `order.order_size` / `fill.order_size` / `rejection.order_size` | required on order-bearing observations; N/A for passive market quotes/trades |
| Market conditions | `market_conditions.{mid,best_bid,best_ask,spread,depth,session_phase,vol}` | all nullable; absent stays absent |
| Data provenance | `data_provenance.{source,capture_method,clock_source,...}` | mandatory; drives skew tolerance and trust |
| Confidence level | `confidence.{level,basis,sample_size,interval}` | `measured|derived|modeled|unknown` |

## Observation types

| Type | Schema | Purpose | Primary parameters it feeds |
| ---- | ------ | ------- | --------------------------- |
| `quote` | `quote.observation.schema.json` | top-of-book / L2 snapshot | effective & quoted spread (1,2), queue position (4), market conditions |
| `trade` | `trade.observation.schema.json` | public tape print | market impact context (8), realized-spread baseline |
| `order_lifecycle` | `order-lifecycle.observation.schema.json` | state transitions of *our* order | fill latency (7), slippage anchor (3), partials (5) |
| `fill` | `fill.observation.schema.json` | a single execution of *our* order | realized spread (2), slippage (3), market impact (8), fill quality |
| `rejection` | `rejection.observation.schema.json` | broker/exchange reject of *our* order | rejection frequency (6) |

(Parameter numbers refer to the ten measured parameters in the Cycle-1
assessment / SPEC-06.)

## Design rules

- **Our-order vs market data is explicit.** `quote`/`trade` are market data;
  `order_lifecycle`/`fill`/`rejection` are our activity. Mixing them is a
  category error that corrupts slippage and impact math.
- **Nullable, not defaulted.** Any field we have not measured is `null`. There
  are no silent zeros. `null` propagates to `confidence.level = unknown`.
- **Reference prices are captured, not reconstructed.** `arrival_reference`
  (slippage anchor) and `reference_mid_at_fill` (realized spread) must be
  captured live; if absent, the derived parameter is UNKNOWN for that order
  (SPEC-05 R-REF-1).
- **Versioned.** `schema_version` travels on every record so format evolution
  never silently reinterprets old evidence.
