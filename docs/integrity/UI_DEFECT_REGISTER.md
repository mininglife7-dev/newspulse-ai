# UI Defect Register — NewsPulse AI

**Audit date:** 2026-07-09 · **Status legend:** FIXED = corrected and verified in this audit.

| # | Severity | Location | Defect | Status |
|---|---|---|---|---|
| D-01 | **Critical** | `lib/supabase.ts` | Browser Supabase client was created eagerly at module load with `!` assertions and was **never used by any code path**. Any `next build` or server boot without env vars crashed (`Failed to collect page data for /api/history/[id]`). | FIXED — lazy `getSupabasePublic()`; zero-env build verified green. |
| D-02 | High | `app/history/page.tsx` | `/history/[id]` detail page was **orphaned** — no link anywhere in the UI navigated to it. | FIXED — keyword in each history row links to its detail page. |
| D-03 | High | `lib/supabase.ts` → `/api/history` → history screen | DB failures were swallowed and returned as an empty list, so the UI showed **"No searches yet"** during an outage (false confidence; Founder Trust violation). | FIXED — `getSearchHistory` throws, API returns 500 + error, UI shows the error banner. Smoke-tested. |
| D-04 | High | `app/history/[id]/page.tsx` | DB failures returned `null`, rendering a **false 404** ("Page not found") when the truth was "database unreachable". | FIXED — DB errors throw to the error boundary; malformed UUIDs (Postgres `22P02`) remain genuine 404s. Smoke-tested. |
| D-05 | Medium | `app/api/history/[id]/route.ts` | `DELETE /api/history/:id` existed but **no button used it** — a dead endpoint / missing workflow. | FIXED — per-row Delete button (confirm dialog, spinner, error alert) on the history table. |
| D-06 | Medium | `app/page.tsx` | Results header displayed the **live input text**, not the searched query: type something new without searching and the screen said "8 results for \"xyz\"" for results that belonged to another query. | FIXED — header bound to `lastQuery`, set only when a search actually runs. |
| D-07 | Medium | `app/page.tsx`, `app/history/[id]/page.tsx`, `lib/openai.ts` | `gpt-4o-mini` hard-coded in 3 places — screens could silently drift from the model actually used. | FIXED — single `SUMMARY_MODEL` constant in `lib/constants.ts`. |
| D-08 | Medium | `app/history/[id]/page.tsx` | Timestamp rendered server-side in the **server's timezone**, contradicting the history table which formats client-side in the visitor's timezone. Formatting logic was also duplicated inline. | FIXED — shared `LocalDateTime` client component using `formatAbsoluteDate`. |
| D-09 | Low | `app/history/page.tsx`, `app/history/[id]/page.tsx` | Count badge showed stored `result_count` while the screen rendered the `results` array — two sources for one metric. Also: suggestion chips filled the input but didn't search; "no results" was styled as a red **error**; Re-run action used an `ExternalLink` icon for internal navigation. | FIXED — counts derived from the rendered array; suggestion chips run the search; no-results renders a neutral `EmptyState`; Re-run uses the `RotateCw` icon (matching the detail page). |
| D-11 | High | `.github/workflows/ci.yml` | CI runs `npm ci`, which **requires a lockfile**, but no `package-lock.json` was committed — the CI pipeline could never pass. | FIXED — lockfile committed; smoke-test step added to CI. |
| D-10 | Low | `README.md`, `app/layout.tsx` | README embedded two screenshots from a `public/screenshots/` directory that doesn't exist (broken images on GitHub). Build warned about missing `metadataBase` (OG images resolved against localhost). | FIXED — broken image table removed until screenshots exist; `metadataBase` set from `NEXT_PUBLIC_SITE_URL`. |

## Ruled out during audit

- `useSearchParams()` on the home page without a `Suspense` boundary — suspected
  build-breaker, **disproved** by a clean production build (client page bails out
  correctly in Next 14.2).
- Home/history/API `ok`-flag contradictions — none found; every JSON response's
  `ok` agrees with its HTTP status (now locked in by smoke checks).
- Dead nav links — none; every `href` in layout, empty states, error and 404
  pages resolves to a live route.
