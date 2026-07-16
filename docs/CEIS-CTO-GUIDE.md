# 🧬 CEIS — CTO / Engineering Guide

## Setup

1. Run [`supabase/ceis-schema.sql`](../supabase/ceis-schema.sql) in the Supabase SQL editor (after the base `schema.sql`).
2. Set `CEIS_CRON_SECRET` in Vercel env (optional but recommended — protects `/api/ceis/run`).
3. Deploy. The weekly cron (`vercel.json`: `0 6 * * 1` → `GET /api/ceis/run`) is picked up automatically. Vercel sends `Authorization: Bearer $CRON_SECRET` when `CRON_SECRET` is set on the project; `CEIS_CRON_SECRET` is checked first, then `CRON_SECRET`.

Degradation matrix — CEIS never hard-fails on missing config:

| Missing             | Behavior                                                                                                 |
| ------------------- | -------------------------------------------------------------------------------------------------------- |
| `OPENAI_API_KEY`    | Heuristic extraction (low confidence → no DNA reaches the queue)                                         |
| `FIRECRAWL_API_KEY` | The five web-research collectors are skipped                                                             |
| Supabase vars       | Cycle runs in-memory on the seed genome; nothing persists                                                |
| One collector down  | Isolated: `Promise.allSettled` + 20s timeout per collector, failure counted in `stats.collectors_failed` |

## Operating it

```bash
# Manual cycle (persisting)
curl -X POST https://<host>/api/ceis/run -H "Authorization: Bearer $CEIS_CRON_SECRET"

# Dry run — no writes, full pipeline preview
curl -X POST "https://<host>/api/ceis/run?dry=1" -H "Authorization: Bearer $CEIS_CRON_SECRET"

# Latest weekly report / dashboard payload
curl https://<host>/api/ceis/report
curl https://<host>/api/ceis/dashboard
```

`/api/ceis/run` shares the middleware rate limiter with `/api/search`
(30 req/min/IP) and has `maxDuration: 300` on Vercel.

## Code layout

Everything lives in `lib/ceis/` — pure logic separated from I/O so the core is
unit-testable without network or database:

| Module               | Pure?                   | Role                                                                |
| -------------------- | ----------------------- | ------------------------------------------------------------------- |
| `types.ts`           | —                       | shared domain vocabulary                                            |
| `util.ts`            | ✅                      | stable hashing, overlap-coefficient similarity, ISO week            |
| `collectors/*`       | parsers ✅              | research modules; each exports a pure parser + a thin fetch wrapper |
| `extraction.ts`      | `normalizePrinciple` ✅ | LLM principle extraction + keyless heuristic fallback               |
| `gap-analysis.ts`    | ✅                      | principle vs. genome classification                                 |
| `immune-system.ts`   | ✅                      | 9 rejection rules, all with reasons                                 |
| `evolution-score.ts` | ✅                      | weighted 10-dimension score                                         |
| `dna-generator.ts`   | `buildProposal` ✅      | LLM mission writing + deterministic template fallback               |
| `report.ts`          | ✅                      | weekly markdown report                                              |
| `dashboard.ts`       | `computeDashboard` ✅   | founder dashboard aggregation                                       |
| `genome.ts`          | seed ✅                 | seed capabilities + Supabase genome access                          |
| `store.ts`           | —                       | Supabase persistence (best-effort, logged errors)                   |
| `pipeline.ts`        | —                       | the orchestrated cycle                                              |

Tests: `tests/ceis/*.test.ts` (vitest, `npm test`, runs in CI). 61 tests cover
every pure module plus the pipeline orchestrator (with mocked I/O
boundaries); no test touches the network or a real database.

## Extending CEIS

**Add a Firecrawl-backed source** (blogs, news, docs): add one entry to
`WEB_RESEARCH_CONFIGS` in `collectors/web-research.ts`. Done.

**Add an API-backed source**: create `collectors/<name>.ts` implementing the
`Collector` interface (export the parser separately for tests), register it in
`collectors/index.ts`, extend the `CollectorId` union in `types.ts`, add a
parser test.

**Keep the seed genome honest**: when the Cathedral gains a real capability,
add it to `SEED_GENOME` in `genome.ts` — this is what prevents CEIS from
proposing things that already exist. Treat it like a changelog of organs.

**Tune the thresholds** (all named constants, all tested):
`MIN_EVIDENCE_CONFIDENCE` (0.55), `NEW_EVIDENCE_UPLIFT` (0.15) in
`immune-system.ts`; `EXISTS_THRESHOLD` (0.55), `PARTIAL_THRESHOLD` (0.30) in
`gap-analysis.ts`; `MIN_DNA_SCORE` (55) in `dna-generator.ts`; weights in
`evolution-score.ts`.

## Failure modes & rollback

- **LLM returns malformed JSON** → caught; extraction falls back to heuristics; DNA falls back to the template. Malformed individual principles are dropped by `normalizePrinciple`.
- **Founder decisions vs. new cycles** → `saveProposals` uses `ignoreDuplicates`, so a re-generated proposal can never overwrite a reviewed one; the `status` column is authoritative on read.
- **Rollback of CEIS itself** → fully additive: revert the commits and drop the five `ceis_*` tables. No existing table or route is modified beyond the nav link, middleware matcher, and cron entry.
