# Button & Interactive Element Status Report — NewsPulse AI

**Audit date:** 2026-07-09
**Legend:** PASS = works as expected · FIXED = was BROKEN/NOT IMPLEMENTED, now PASS.
Backing endpoints for every button are exercised by `npm run test:smoke` in CI.

## Global navigation (`app/layout.tsx`)

| Element | Expected behaviour | Status |
|---|---|---|
| Logo "NewsPulse AI" | Navigate to `/` | PASS |
| Nav "Search" | Navigate to `/` | PASS |
| Nav "History" | Navigate to `/history` | PASS |

## Search dashboard (`/`)

| Element | Expected behaviour | Status |
|---|---|---|
| Search input | Accepts text, disabled while loading, autofocus | PASS |
| "Search" submit button | Runs search; disabled when empty/loading; spinner while loading | PASS |
| Suggestion chips (×5) | Fill input **and run the search** | FIXED — previously only filled the input (dead-feeling button) |
| Results header | States count for the **query the results belong to** | FIXED — was bound to live input text |
| No-results state | Neutral empty state, not a red error | FIXED |
| NewsCard title / URL / "Read" links | Open article in new tab, `noopener noreferrer` | PASS |
| `?q=` deep link | Auto-runs the search once | PASS |

## History dashboard (`/history`)

| Element | Expected behaviour | Status |
|---|---|---|
| "Refresh" button | Reloads history; spinner; disabled while loading | PASS |
| "Clear History" button | Confirm dialog → `DELETE /api/history` → empties table; disabled when empty | PASS |
| Row expand chevron / "View Results" | Toggle inline results grid | PASS |
| Keyword link | Open `/history/[id]` detail page | FIXED — detail page was unreachable from anywhere |
| "Re-run" link | Navigate to `/?q=…` and re-run search | PASS (icon corrected from ExternalLink to RotateCw) |
| Row "Delete" button | Confirm dialog → `DELETE /api/history/:id` → row removed | FIXED — endpoint existed with **no button** |
| Error banner | Shown when the API fails (incl. DB outage) | FIXED — outages previously masqueraded as an empty list |
| Empty state CTA "Start searching" | Navigate to `/` | PASS |

## History detail (`/history/[id]`)

| Element | Expected behaviour | Status |
|---|---|---|
| "All searches" back link | Navigate to `/history` | PASS |
| "Re-run this search" button | Navigate to `/?q=…` | PASS |
| NewsCard links | Open article in new tab | PASS |

## Error / 404 pages

| Element | Expected behaviour | Status |
|---|---|---|
| Error page "Try again" | Calls `reset()` | PASS |
| Error page "Back home" | Navigate to `/` | PASS |
| 404 "Start a new search" / "View history" | Navigate to `/` and `/history` | PASS |

**Totals:** 24 interactive elements audited · 24 PASS after fixes · 0 BROKEN · 0 NOT IMPLEMENTED.
