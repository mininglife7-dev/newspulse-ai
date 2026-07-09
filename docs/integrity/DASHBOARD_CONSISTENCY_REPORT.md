# Dashboard Consistency Report — NewsPulse AI

**Audit date:** 2026-07-09
**Question audited:** can any screen contradict another screen — or itself — about the same fact?

Every user-visible metric was traced to its source. Three contradictions were
found and eliminated; each now has exactly one authoritative source.

## Metric-by-metric trace

| Displayed fact | Screens showing it | Authoritative source (after audit) | Verdict |
|---|---|---|---|
| Result count for a live search | `/` results header | `results.length` of the fetched response; header labeled with `lastQuery`, the query those results belong to | **FIXED** — header previously used the live input text, so it could claim results belonged to a query that was never run |
| Article count of a saved search | `/history` badge, `/history/[id]` header | Length of the same saved `results` array both screens render | **FIXED** — screens previously displayed the stored `result_count` column while rendering `results`; two sources for one number |
| Search timestamp | `/history` table, `/history/[id]` header | One formatter (`formatAbsoluteDate`) via the `LocalDateTime` client component, always in the visitor's timezone | **FIXED** — detail page previously formatted in the *server's* timezone; the same search could show two different times |
| Summarizer model | `/` header, `/history/[id]` header, backend call | `SUMMARY_MODEL` in `lib/constants.ts` | **FIXED** — was hard-coded in 3 places |
| History existence ("No searches yet") | `/history` empty state | Only shown on a confirmed-empty 200 response; DB failures now surface as an error banner | **FIXED** — an outage previously rendered the empty state (a claim the app could not verify) |
| Saved-search existence (404) | `/history/[id]` | `notFound()` only for confirmed-absent or malformed ids; DB failures render the error boundary | **FIXED** — outages previously rendered a false 404 |
| System health | `/api/health` | Env-credential presence, `ok` ⇔ HTTP status, `healthy`/`degraded` never claims more than it verified | PASS |
| Rate-limit state | `X-RateLimit-*` headers on `/api/search` | Single in-memory bucket in `middleware.ts` | PASS (per-instance; documented limitation) |
| API success/failure | every JSON route | `ok` flag always agrees with HTTP status | PASS — enforced by smoke suite |

## Hard-coded numbers scan

`grep` sweep for hard-coded percentages/counts in UI code: none found. The only
fixed numeric literals are layout values (skeleton counts, truncation lengths,
rate-limit config) — none is presented to the user as a measurement.

## Regression guard

`scripts/smoke-test.mjs` (wired into CI) boots the production server with no
credentials and asserts the truthfulness half of this table on every push: the
app must report degraded/error states rather than fabricate healthy ones.
