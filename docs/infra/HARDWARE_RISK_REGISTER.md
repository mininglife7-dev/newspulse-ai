# Hardware / Infrastructure Risk Register — NewsPulse AI (EURO AI / Cathedral)

**Date:** 2026-07-09 · **Status:** living document — review at every launch gate
**Scoring:** Severity × Likelihood → Priority. P0 = fix before any launch, P1 = before Alpha, P2 = before Beta, P3 = before paid customers.

| ID | Risk | Severity | Likelihood | Priority | Evidence | Mitigation | Cost | Owner |
|----|------|----------|------------|----------|----------|------------|------|-------|
| R-01 | **App has never been deployed** — CI and Vercel deploy failed on the only `main` push; "launch" currently means the founder's laptop | Critical | Certain (it already happened) | **P0** | Actions runs 2026-05-08: CI failure + Deploy failure; missing `package-lock.json`; Vercel secrets unset | Merge PR #4 (lockfile + build fix), set `VERCEL_TOKEN`/`VERCEL_ORG_ID`/`VERCEL_PROJECT_ID` + 5 env vars, achieve one green production deploy | €0 | Founder |
| R-02 | **Unauthenticated destructive endpoint** — `DELETE /api/history` wipes the whole table; no auth anywhere | Critical | High once URL is public | **P0** | `app/api/history/route.ts` DELETE handler; no auth middleware | Require auth (Supabase Auth) on all mutating routes; interim: shared bearer secret or Vercel deployment protection | €0 | Eng |
| R-03 | **Public anon read/write to the database** — RLS policies grant `anon` SELECT + INSERT on `news_searches`; the anon key ships to every browser | Critical | High | **P0** | `supabase/schema.sql` lines 42–54 | Drop anon policies (PR #4 includes this); re-run schema in Supabase; deny-by-default RLS | €0 | Eng |
| R-04 | **Wallet drain** — `/api/search` spends Firecrawl + OpenAI money per call with no auth; limiter is in-memory, per-instance, resets on cold start | High | High | **P0** | `middleware.ts` (in-memory Map); `app/api/search/route.ts` | Upstash Redis rate limit (EU, free tier); OpenAI hard spend limit; Firecrawl plan cap; Vercel spend alert; later: auth-gate search | €0 | Eng |
| R-05 | **Critical framework advisories** — `next@14.2.15`: 1 critical + 3 high (`npm audit`), incl. middleware bypass classes; middleware is the app's only abuse control | High | Medium | **P0** | `npm audit` output during this review | Upgrade to ≥14.2.35 (in PR #4); schedule Next 15/16 migration; enable Dependabot | €0 | Eng |
| R-06 | **No database backups & no restore test** — free tier has no daily backups/PITR; nothing exports the DB; restore never rehearsed | Critical | Medium | **P1** | Supabase free-tier limits; no backup job in repo | Supabase Pro ($25/mo, 7-day daily backups) or free weekly `pg_dump` GitHub Action to encrypted EU storage; **rehearse one restore before Alpha** | €0–25/mo | Founder |
| R-07 | **Single point of failure: founder's Windows machine** — only runtime, only copy of all 5 secrets, runs as Administrator | Critical | Medium | **P0/P1** | `push_to_github.ps1` path `C:\Users\Administrator\...`; `.env.local` single copy | Deploy to cloud (R-01); move secrets to Vercel env + password manager; stop daily work as Administrator | €0 | Founder |
| R-08 | **Secret hygiene** — all keys in one plaintext file; template wording ("rotated values") suggests a past exposure; no rotation since; service-role key = full DB admin | High | Medium | **P0** | `.env.local.template`; git-history scan clean (no current leak) | Rotate all 5 keys now; quarterly rotation calendar; GitHub secret scanning + push protection on | €0 | Founder |
| R-09 | **No EU data residency** — Vercel functions default to US (iad1); Supabase region unverified; OpenAI + Firecrawl process in US; no DPAs signed | High (blocks German pilots) | Certain today | **P1** | No region config in `vercel.json`; no compliance docs in repo | Pin functions to fra1; verify/move Supabase to eu-central-1; sign DPAs (Vercel/Supabase/OpenAI — free); document subprocessors; Tier C: EU-resident LLM | €0 | Founder |
| R-10 | **No monitoring, logging, or alerting** — outages/breaches would be discovered by users | High | Certain (there is zero) | **P1** | No monitoring config anywhere in repo | UptimeRobot free on `/api/health`; Sentry free tier; Vercel log drain; provider billing alerts | €0 | Eng |
| R-11 | **No staging/production separation** — one Supabase project; schema changes pasted into production SQL editor | Medium | High | **P2** | Single project implied by docs/env | Second free Supabase project as staging; Vercel preview envs point at it; migrations via checked-in SQL files | €0 | Eng |
| R-12 | **No rollback plan / release process** — no tags, no runbook, restore untested | Medium | Medium | **P2** | Repo inspection | Tagged releases; use Vercel instant rollback; 1-page incident runbook; quarterly restore drills | €0 | Eng |
| R-13 | **Storage-exhaustion DoS** — anon INSERT (R-03) + unbounded JSONB `results` rows can fill the 500 MB free tier | Medium | Medium | **P1** | `schema.sql` (no size limits, anon insert) | Fix R-03; add row-size guard in `saveSearch`; retention job (delete >90-day rows) | €0 | Eng |
| R-14 | **No tenant separation** — single shared table, no user/tenant column; pilot customers would see each other's searches | High (blocks pilots) | Certain | **P1** | `schema.sql`; `lib/supabase.ts` | Add `tenant_id`/`user_id` columns + RLS scoped to `auth.uid()`; backfill n/a (fresh data) | €0 | Eng |
| R-15 | **No audit log / evidence export / per-tenant deletion** — GDPR Art. 17 & German procurement asks cannot be answered | High (blocks contracts) | Certain | **P2** | Repo inspection | Append-only `audit_log` table; tenant export endpoint; scoped deletion endpoint | €0 | Eng |
| R-16 | **Free-tier pausing** — Supabase free projects pause after ~1 week idle; demo dies mid-pitch | Medium | High on free tier | **P1** | Supabase free-tier policy | Uptime pinger keeps it warm (interim); Supabase Pro removes pausing (Alpha) | €0–25/mo | Founder |
| R-17 | **Dependency on 4 external SaaS with no fallback** — Vercel, Supabase, OpenAI, Firecrawl; any outage = full outage | Medium | Low-Medium | **P3** | Architecture | Accept for Alpha/Beta (disclose in SLA); Tier C: graceful degradation (serve cached summaries), EU LLM alternative wired behind a flag | €0 | Eng |
| R-18 | **Unmerged work pile-up** — 5 open PRs incl. overlapping fixes (PR #1 vs #4); risk of divergence and re-breaking | Medium | Medium | **P1** | PR list 2026-07-09 | Merge order: #4 → close #1 (superseded) → #2 (PWA) → others after review; keep `main` green from then on | €0 | Founder |
| R-19 | **AI-transparency gap (EU AI Act Art. 50)** — summaries are AI-generated but not explicitly labeled as such in the UI | Low | Certain | **P2** | UI copy | Add visible "AI-generated summary" label + model name in footer/tooltip | €0 | Eng |
| R-20 | **License/branding confusion** — repo is MIT-licensed hackathon project ("NewsPulse AI") being repositioned as commercial "EURO AI / Cathedral"; PR #2 introduces third name "Governor" | Low | Medium | **P3** | README, LICENSE, PR #2 | Founder decision on product identity; keep MIT or relicense before paid customers; single name everywhere | €0 | Founder |

## Status update — 2026-07-09 (post-consolidation)

The table above is the audit snapshot from the morning of 2026-07-09. The PR-backlog consolidation (#14, #16, #19, #20) changed the state of several risks the same day — current status:

| ID | Current status |
|----|----------------|
| R-01 | **Remediated.** Lockfile merged; CI (lint, type-check, 55 unit tests, build, smoke, E2E) green on `main`; broken Actions deploy workflow removed (#14); Vercel Git integration builds and deploys every push. Residual: Founder to confirm production env vars via `/api/health` on the live URL. |
| R-02 | **Remediated in repo (opt-in).** `ADMIN_TOKEN` bearer guard on both DELETE endpoints merged (#16). **Pending:** set `ADMIN_TOKEN` in Vercel env to activate it. |
| R-03 | **Remediated in repo.** `supabase/schema.sql` drops the anon SELECT/INSERT policies; deny-by-default RLS (#16). **Pending:** re-run the schema in the live Supabase project for it to take effect there. Not a current code risk; remains open only as a live-database action. |
| R-04 | **Partially remediated.** Rate limiting extended to all API routes (#16); limiter is still in-memory/per-instance. Provider spend caps and a durable (Redis) limiter remain open. |
| R-05 | **Substantially remediated.** `next` upgraded to 14.2.35 (#16); critical advisory eliminated. Residual: 1 high + 1 moderate require the breaking Next ≥15 migration. |
| R-06 | **Backup mechanism added (opt-in).** Free weekly encrypted `pg_dump` GitHub Action (`.github/workflows/backup.yml`) + restore runbook (`docs/infra/BACKUP_RESTORE_RUNBOOK.md`). Inert until the Founder sets `SUPABASE_DB_URL` + `BACKUP_PASSPHRASE` secrets. **Pending:** set the secrets and run one restore drill (RTO evidence). |
| R-13 | **Row-size guard added.** `boundResultsForStorage` caps article count and truncates oversized fields in `saveSearch` (unit-tested); anon INSERT already dropped (#16). Retention job (delete >90-day rows) still open; live schema re-run pending as in R-03. |
| R-18 | **Remediated.** Backlog consolidated: #4→#16, #11→#19, #12/#3/#6/#7/#8→#20; superseded PRs closed. Only #2 (PWA/branding) and #5 (CEIS) remain open, held for Founder decisions. |
| R-19 | **Remediated.** "AI-generated summary" labels merged (#16). |

## Risk summary (as audited)

- **P0 (fix before anything ships):** R-01, R-02, R-03, R-04, R-05, R-07, R-08 — all €0, most already fixed in open PR #4.
- **P1 (before August Alpha):** R-06, R-09, R-10, R-13, R-14, R-16, R-18 — ≤ €25/mo total.
- **P2 (before Beta):** R-11, R-12, R-15, R-19.
- **P3 (before paid customers):** R-17, R-20 + Tier C build-out.

**Accepted risks for Alpha (disclosed, not fixed):** single region (fra1), no PITR, OpenAI US processing under DPA+SCCs, Firecrawl US processing (public news content only).
