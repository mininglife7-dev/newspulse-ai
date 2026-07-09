# Product Integrity Report — NewsPulse AI

**Audit date:** 2026-07-09
**Auditor:** Dashboard Integrity Governor (DNA-203)
**Scope:** every page, button, link, API route, and displayed metric in the app.
**Method:** full source review of all 16 route/component/lib files, a zero-credential
production build, and the automated smoke suite (`npm run test:smoke`, 16 checks).

---

## Executive summary

The app is small and generally well built: every navigation link resolves, every
API route responds with a correct status and an `ok` flag, error/404/loading/empty
states all exist, and the search → summarize → persist pipeline degrades gracefully.

The audit found **10 defects**, of which **1 was critical** (any build or server
boot without env vars crashed because of an eagerly-created Supabase client that
no code ever used). **All 10 were fixed and verified in this audit** — see
`UI_DEFECT_REGISTER.md` for the full register and
`PRODUCT_HEALTH_SCORE.md` for scores before/after.

## Verification performed

| Gate | Result |
|---|---|
| `tsc --noEmit` | PASS |
| `next lint` | PASS (0 warnings) |
| `next build` with CI stub env | PASS |
| `next build` with **no** env vars | PASS (failed before fixes) |
| Smoke suite (16 end-to-end checks) | 16/16 PASS |

## Truthfulness (Founder Trust Rule)

The governing rule — *if a metric cannot be verified, show an error/UNKNOWN, never
an incorrect number* — is now enforced and regression-tested:

- `GET /api/history` with an unreachable database now returns **500 + error**,
  where it previously returned a fabricated empty list (the UI showed
  "No searches yet" — false confidence).
- `/history/[id]` with an unreachable database now renders the error boundary,
  where it previously showed a false **404 Page not found**.
- `/api/health` returns **503 degraded** whenever any integration credential is
  missing, and its `ok` flag always agrees with the HTTP status.
- The smoke suite runs the production server **without any credentials** and
  asserts every route fails honestly. It runs in CI on every push/PR.

## Single source of truth

- The summarizer model name (`gpt-4o-mini`) was hard-coded in three places
  (backend + two screens). It now lives once in `lib/constants.ts`
  (`SUMMARY_MODEL`) and every consumer imports it.
- Article counts shown on the history table and detail page are now derived
  from the same saved `results` array that the screen renders, so a badge can
  never contradict the list below it.
- Timestamps are formatted by one shared code path (`formatAbsoluteDate` via
  the `LocalDateTime` client component), in the visitor's locale on every
  screen — previously the detail page used the server's timezone and could
  contradict the history table.

## Remaining known limitations (documented, not hidden)

- The `/api/search` rate limiter is in-memory and per-instance; it resets on
  cold start and keys on spoofable `x-forwarded-for`. Acceptable at current
  scale; noted in `middleware.ts` for a future Upstash/KV swap.
- `saveSearch` is intentionally fire-and-forget: a Supabase outage does not
  block search results, but that search will not appear in history. Results
  shown to the user are always real; only persistence is best-effort.
- Supabase RLS currently allows anonymous read/insert (see
  `supabase/schema.sql` comments) — fine for a single-user demo, must be
  tightened before multi-tenant use.
- No screenshots exist yet in `public/`; the README no longer references
  non-existent image files.
