# CLAUDE.md

NewsPulse AI — Next.js 14 (app router) news search: Firecrawl web search →
gpt-4o-mini summaries → Supabase persistence. TypeScript strict, Tailwind,
dark theme only.

## Commands

```bash
npm run dev            # dev server
npm run build          # production build — MUST succeed with zero env vars
npm run lint           # next lint
npm run type-check     # tsc --noEmit
npm run format:check   # prettier (enforced in CI — run `npm run format` before committing)
npm run test:smoke     # boots prod build with NO credentials, probes every route
npm run test:e2e       # Playwright, desktop + Pixel-7 mobile, no credentials needed
npm run screenshots    # regenerate docs/screenshots/*.png from fixtures
```

CI (`.github/workflows/ci.yml`) runs: lint → format:check → type-check →
build → smoke → e2e. Run the same gauntlet locally before pushing.

## Invariants — do not break these

- **Zero-env build**: `next build` with no environment variables must pass.
  Never create API/DB clients eagerly at module scope; use lazy factories
  (see `getSupabaseAdmin` in `lib/supabase.ts`).
- **Truthful failure (Founder Trust Rule)**: when a dependency is
  unavailable, surface an error — never an empty list, a 404, or a healthy
  status the app can't verify. Every JSON response's `ok` must agree with
  its HTTP status. The smoke suite enforces this by running the prod server
  without credentials.
- **Single source of truth**: displayed values derive from the data the
  screen actually renders. Shared constants live in `lib/constants.ts`
  (`SUMMARY_MODEL`, `SITE_URL`); API response shapes in `types/index.ts`
  (route handlers are typed against them). Never hard-code a metric,
  model name, or URL in a component.
- **`result_count`** is a constraint-checked cached derivation
  (`supabase/schema.sql`); the UI never displays it — counts come from the
  rendered `results` array. See `docs/decisions/0001-result-count.md`.
- Timestamps render in the visitor's locale via `components/LocalDateTime`
  (server components would use the server's timezone and contradict
  client-rendered screens).

## Testing philosophy

Both suites run **without any credentials**, so they work anywhere:

- `scripts/smoke-test.mjs` — liveness + truthfulness of every route against
  the real degraded server (including the 429 rate-limit path and security
  headers). Kills its server's whole process group; don't leave a stale
  server on the port (the script refuses to run if one exists).
- `e2e/*.spec.ts` — happy paths via `page.route()` fixture interception
  (`e2e/fixtures.mjs`, shared with the screenshot script). One fixture row
  deliberately stores a wrong `result_count` to prove the UI derives counts.
- No pixel-diff baselines by decision (cross-env font rendering flakiness);
  responsive checks are structural (no horizontal overflow at mobile width).
- Playwright browser: if the version-matched Chromium isn't downloaded, the
  config falls back to `/opt/pw-browsers/chromium`. Do not run
  `playwright install` in the remote sandbox (CI does install it).

## Environment variables

Required: `FIRECRAWL_API_KEY`, `OPENAI_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`,
`SUPABASE_SERVICE_ROLE_KEY`. Optional: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
(unused by code — do NOT make health/check-env treat it as required),
`NEXT_PUBLIC_SITE_URL`. All DB access is server-side via the service key.

## Architecture decisions

- `docs/decisions/` — ADRs (result_count constraint; static CSP — nonce CSP
  was empirically shown to break statically prerendered pages, don't
  reintroduce it without forcing dynamic rendering).
- `docs/integrity/` — audit reports (defect register D-01…D-21, health
  score, button status, consistency). Keep these truthful when changing
  behavior they describe.
- Security headers incl. CSP live in `next.config.js`; the rate limiter
  (in-memory, `/api/search` only) in `middleware.ts`.
