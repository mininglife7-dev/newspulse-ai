# Hardware / Cloud Architecture Review — EURO AI / Cathedral

> ⚠️ **SUPERSEDED — historical record (2026-07-09).** This is the original infrastructure audit of the **pre-pivot NewsPulse AI** app (Firecrawl news search + AI summaries). The repository has since pivoted to the **EURO AI / Cathedral** EU AI Act governance platform (Next 16 / React 19, Supabase Auth, ~50 API routes, evidence export, CEIS). The findings below — the `news_searches` schema, the "never deployed" / low readiness scores, and the Firecrawl/OpenAI-specific risks — **no longer describe the current codebase**. Some mitigations were carried forward to `main` (e.g. the opt-in encrypted DB backup workflow, rescued in #122). Kept for provenance only.
>
> **For the current infrastructure & launch posture, see:** [`CATHEDRAL-PRODUCTION-READINESS.md`](./CATHEDRAL-PRODUCTION-READINESS.md) · [`DEPLOYMENT_READINESS_REPORT.md`](./DEPLOYMENT_READINESS_REPORT.md) · [`PREDEPLOYMENT_AUDIT.md`](./PREDEPLOYMENT_AUDIT.md) · [`INDEPENDENT_VV_AUDIT.md`](./INDEPENDENT_VV_AUDIT.md) · [`../GO-NO-GO-REPORT.md`](../GO-NO-GO-REPORT.md)

**Repository audited:** `mininglife7-dev/newspulse-ai` (the only repository accessible to this review)
**Review date:** 2026-07-09
**Reviewer role:** Senior cloud architect / security architect / DevOps lead / cost auditor
**Target:** August Alpha/Beta launch, German/EU customers, pilots, demos, future paid scale

> **Scope note:** The mission names "EURO AI / Cathedral". The only accessible codebase is
> **NewsPulse AI** (this repo). A previous audit (PR #4) reached the same conclusion: no separate
> EURO AI product repository exists. This review therefore audits the real, existing asset.
> If EURO AI / Cathedral lives elsewhere, that infrastructure was not visible to this review and
> must be audited separately.

---

## 1. Current Reality

### Where is the app running now?

**No verified production deployment.** A Vercel project is connected and builds PR previews (discovered during this review — see table), but the repo's own deploy pipeline has never gone green, and the last audited deploy logs showed empty env vars. Until the founder confirms otherwise in the Vercel dashboard, treat production as **not running**.

| Question | Answer | Evidence |
|---|---|---|
| Cloud deployment | **No production deploy has ever gone green through the repo's pipeline.** The only push to `main` (2026-05-08) failed both the CI and the "Deploy to Vercel" workflows | GitHub Actions run history: `CI / main / push / failure`, `Deploy to Vercel / main / push / failure` |
| Vercel project | **Exists and is connected** via the Vercel GitHub integration (separate from the broken Actions workflow): project `newspulse-ai`, team `lalit-kumar-d-s-projects`, auto-builds PR previews. Whether its **production** deployment works and has real env vars is unverified from here — a prior audit (PR #4) found the env empty in deploy logs. **Founder to-do: open the Vercel dashboard and verify production state + env vars** | `vercel[bot]` preview-build comment observed on PR #6 (2026-07-09) |
| Why the deploy failed | No `package-lock.json` in the repo → `npm ci` and the Actions npm cache fail; Vercel secrets (`VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`) apparently never set | Reproduced locally: `npm ci` → "loadVirtual requires existing shrinkwrap file"; PR #4 verified env empty in deploy logs |
| Where it actually runs | Founder's local **Windows machine**, as the **Administrator** account, via `npm run dev` on `localhost:3000` | `push_to_github.ps1` references `C:\Users\Administrator\Documents\Claude\Projects\Hackathon Outskill` |
| Intended target | Vercel (serverless) + Supabase (managed Postgres) + Firecrawl + OpenAI | `vercel.json`, `.github/workflows/deploy.yml`, `lib/*.ts` |

### Hardware inventory

There is **no owned or rented hardware**. The architecture is serverless-by-design:

- **Compute:** Vercel serverless functions (not yet provisioned/working). No CPU/RAM/disk to audit — Vercel allocates per-invocation (default 1 vCPU / 2 GB on Hobby). `vercel.json` sets `maxDuration: 60` for `/api/search`.
- **Database:** Supabase managed Postgres. Project ref/region **unknown from the repo** — the region was chosen at project creation and must be verified in the Supabase dashboard (critical for EU residency, see §5). Free tier assumed: 500 MB database, project **pauses after ~1 week of inactivity**, **no daily backups, no PITR**.
- **Network/OS:** N/A (managed). Local dev machine is Windows, running as Administrator (bad practice — dev should run as a normal user).
- **Backups:** None. The GitHub repo is the only durable copy of anything. The database has no backup story at all on the free tier, and no restore has ever been tested.
- **Uptime status:** No production uptime to measure. No uptime monitoring configured. `/api/health` exists but nothing polls it.

### Exposed ports / services (once deployed as designed)

| Surface | Method | Protection | Risk |
|---|---|---|---|
| `/` , `/history` | GET pages | none needed | low |
| `/api/search` | POST | in-memory rate limit only (30/min/IP), **no auth** | **wallet drain** — each call spends Firecrawl + OpenAI credits |
| `/api/history` | GET | **none** | anyone can read all stored searches |
| `/api/history` | **DELETE** | **none** | **anyone on the internet can wipe the entire database** |
| `/api/history/[id]` | GET/DELETE | **none** | same |
| `/api/health` | GET | none | fine (leaks only booleans) |
| Supabase REST API | direct, via public anon key | RLS policies grant `anon` **SELECT + INSERT** on the whole table | public DB read/write bypassing the app entirely |

Locally, only `:3000` is exposed while `npm run dev` runs.

### Secrets inventory

| Secret | Where stored | Status |
|---|---|---|
| `FIRECRAWL_API_KEY` | `.env.local` on founder's Windows machine | not in git ✅ |
| `OPENAI_API_KEY` | same | not in git ✅ |
| `NEXT_PUBLIC_SUPABASE_URL` | same (public by design) | not in git ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | same (public by design) | not in git ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | same — **bypasses RLS, full DB admin** | not in git ✅ |
| `VERCEL_TOKEN` / `VERCEL_ORG_ID` / `VERCEL_PROJECT_ID` | GitHub Actions secrets — **apparently never set** | deploy broken |

A full-history secret scan (all commits, patterns for OpenAI/Firecrawl/Supabase/AWS/GitHub key formats) found **no leaked secrets in git history**. However, `.env.local.template` says *"fill in your rotated values"*, which suggests keys were exposed at some point in the past. **Rotate all five keys before any launch** — cost: €0.

The single biggest secret risk is structural: all production secrets live in one plaintext file on one Windows machine that also runs as Administrator, with no password manager, no second copy, and no rotation schedule.

---

## 2. Launch Fitness Scores (current state, 0–10)

| Dimension | Score | Justification |
|---|---:|---|
| Reliability | **2/10** | Never deployed; free-tier Supabase pauses when idle; no redundancy; no green pipeline. (+2 because the serverless design is sound once it works.) |
| Security | **2/10** | No authentication at all; unauthenticated DELETE-everything endpoint; public anon INSERT/SELECT RLS policies; `next@14.2.15` has 1 critical + 3 high advisories (`npm audit`), including middleware bypasses — and middleware is the *only* rate limiter; no security headers. (+2: HTTPS-by-default target, secrets kept out of git.) |
| EU data sovereignty | **1/10** | Nothing pinned to EU. Vercel functions default to US (iad1) unless configured; Supabase region unverified; OpenAI + Firecrawl process data in the US; no DPAs, no SCC review, no processing records. |
| Backup & disaster recovery | **1/10** | No DB backups (free tier), no restore ever tested, no export job, no runbook. Code on GitHub is the only backup of anything. |
| Scalability | **4/10** | Serverless compute scales automatically — but the in-memory rate limiter is per-instance (meaningless under scale), the DB free tier is 500 MB, and unauthenticated LLM spend scales linearly with abuse. |
| Cost control | **3/10** | Free tiers everywhere is good; but `/api/search` lets any anonymous visitor spend your OpenAI/Firecrawl budget at 30 req/min/IP; no billing alerts on any provider. |
| Monitoring | **1/10** | `/api/health` exists; nothing polls it. No error tracking, no log retention, no alerting, no dashboards. |
| Deployment repeatability | **2/10** | CI/CD workflows exist and are well-written, but have **never passed on main**: no lockfile (breaks `npm ci`), Vercel secrets unset. No staging, no rollback plan. |
| Mobile / PWA support | **3/10** | Responsive Tailwind UI works on mobile browsers. A full PWA install layer exists **only in unmerged PR #2**. |
| Pilot customer readiness | **1/10** | No login, no tenants, no audit log, no data-deletion capability per customer, no DPA — a German business pilot cannot be onboarded on this today. |

**Average: 2.0/10 — not launch-ready as it stands, but the gap is closable in weeks, mostly for free** (see verdict, §6).

---

## 3. Hardware / Cloud Risks

Full register with owners and severities in [`HARDWARE_RISK_REGISTER.md`](./HARDWARE_RISK_REGISTER.md). Headlines:

1. **Single point of failure — the founder's laptop.** The only running instance, the only copy of all secrets, and the deploy credentials live on one Windows machine.
2. **No backup, no restore test.** A Supabase free-tier incident, accidental `DELETE /api/history` call (which any stranger can trigger), or fat-fingered SQL = permanent data loss.
3. **Local-only deployment.** Demos depend on one machine being on, on hotel Wi-Fi working, on `npm run dev` not crashing.
4. **Public exposure of destructive endpoints.** Unauthenticated wipe-all DELETE; public anon INSERT lets anyone fill the DB with garbage to the 500 MB cap (denial of service by storage exhaustion).
5. **Wallet-drain risk.** Unauthenticated `/api/search` spends real money per call; the rate limiter is in-memory (resets per serverless cold start, per instance) and sits in Next.js middleware, which has known bypass advisories in the pinned version.
6. **Secret leakage risk.** Single plaintext `.env.local`; historical hint that keys already needed rotation; no rotation done.
7. **No monitoring/logging.** An outage or a breach would be discovered by a customer, not by you.
8. **No staging/production separation.** One Supabase project for everything; schema changes are applied by pasting SQL into the production SQL editor.
9. **No rollback plan.** No tagged releases, no tested restore, no runbook.
10. **Broken deploy pipeline masquerading as automation.** The repo *looks* like it auto-deploys; it doesn't. That false confidence is itself a risk.

---

## 4. Recommended Architecture

Three tiers, cheapest-first. Full implementation detail, migration steps, and diagrams in
[`CLOUD_DEPLOYMENT_BLUEPRINT.md`](./CLOUD_DEPLOYMENT_BLUEPRINT.md); costs in [`COST_ESTIMATE.md`](./COST_ESTIMATE.md).

### A. Founder Demo Architecture — €0/mo + AI usage (~€5–20)

Get off the laptop **today** using what's already designed:

- **Compute:** Vercel **Hobby** (free), functions pinned to **fra1 (Frankfurt)**.
- **Database:** Supabase **Free** — create/verify project in **eu-central-1 (Frankfurt)**.
- **Fixes first:** commit `package-lock.json`, upgrade Next to ≥14.2.35 (both already done in open PR #4 — merge it), remove anon INSERT/SELECT policies, put a shared secret or Vercel password protection in front of destructive endpoints.
- **Monitoring:** UptimeRobot free pinging `/api/health`; Vercel built-in logs.
- **Backup:** weekly GitHub Actions cron running `pg_dump` to an encrypted artifact (free).
- **Secrets:** rotate all keys; store in Vercel env vars + a password manager (Bitwarden free).

### B. Alpha/Beta Pilot Architecture — ~€50–75/mo + AI usage

Secure enough for named German/EU pilot customers:

- **Compute:** Vercel **Pro** ($20/mo), region fra1, separate **staging + production** environments.
- **Database:** Supabase **Pro** ($25/mo) in eu-central-1 → **daily backups, 7-day retention**, 8 GB DB, no pausing. Second free-tier project = staging.
- **Auth:** Supabase Auth (email/password + magic link) in front of every API route; deny-by-default RLS keyed to `auth.uid()`; per-pilot tenant column.
- **Rate limiting:** Upstash Redis (free tier, EU region) — durable, cross-instance; middleware remains defense-in-depth only.
- **Monitoring:** Sentry (free dev tier) for errors + UptimeRobot + Vercel log drains; simple `audit_log` table (append-only) for every auth'd action.
- **Backups:** Supabase daily + weekly offsite `pg_dump` to EU object storage (Hetzner Object Storage, ~€5/mo); **one rehearsed restore before Alpha**.
- **Compliance basics:** sign DPAs with Vercel/Supabase/OpenAI, records of processing, privacy notice; see §5.

### C. Paid Customer Architecture — ~€150–500/mo + AI usage

Production-grade, auditable, EU-sovereign option for signed contracts:

- **Path 1 (managed, faster):** stay Vercel Pro + Supabase Team ($599/mo only when justified) with PITR add-on, SSO, log drains to EU storage. Simpler, but US parent companies remain in the chain (fine for most customers with DPAs + SCCs, not for the strictest).
- **Path 2 (EU-sovereign, cheaper at steady state):** **Hetzner** (Falkenstein/Nuremberg, German company, German datacenters) — 2× CPX31 (4 vCPU/8 GB) behind a Hetzner Load Balancer running the Next.js app in Docker (standalone output) + Caddy; **managed EU Postgres** or HA self-hosted with streaming replica; Hetzner Object Storage for evidence exports and backups; restic nightly encrypted offsite to a second EU provider; Grafana/Loki/Prometheus or BetterStack for monitoring; Cloudflare (EU plan) or bunny.net WAF/CDN in front.
- **Either path:** per-tenant isolation enforced by RLS + tenant_id on every row, immutable audit log, evidence-export endpoint (JSON/CSV of a tenant's data), customer data-deletion endpoint, quarterly restore drills, incident-response runbook, EU-residency LLM (OpenAI EU data residency, Azure OpenAI in Germany West Central / Sweden Central, or Mistral for a pure-EU story).

---

## 5. EU AI Act / German Customer Requirements

| Requirement | Today | Tier B (Alpha/Beta) | Tier C (Paid) |
|---|---|---|---|
| EU data residency | ❌ nothing pinned; Vercel defaults US | ⚠️ Vercel fra1 + Supabase eu-central-1; **but** OpenAI/Firecrawl still process in US unless replaced/configured | ✅ EU compute + EU DB + EU-resident LLM (OpenAI EU residency / Azure OpenAI EU / Mistral); Firecrawl replaced or contractually covered |
| Audit logs | ❌ none | ✅ append-only `audit_log` table | ✅ immutable, exportable, retained ≥1 yr |
| Access control | ❌ no auth at all | ✅ Supabase Auth + RLS deny-by-default | ✅ + SSO, roles, least-privilege service keys |
| Encryption | ⚠️ TLS in transit by default; Supabase encrypts at rest | ✅ same, documented | ✅ + encrypted backups (restic/age), key inventory |
| Backup retention | ❌ none | ✅ 7-day daily + weekly offsite | ✅ 30-day + PITR + quarterly restore drills |
| Customer tenant separation | ❌ single shared table | ✅ tenant_id + RLS per pilot | ✅ enforced + tested per-tenant isolation, optional schema-per-tenant |
| Evidence export | ❌ | ⚠️ manual SQL export on request | ✅ self-serve tenant export endpoint |
| Data deletion | ⚠️ only "delete everything" (and anyone can!) | ✅ per-tenant deletion, authenticated | ✅ + deletion certificates, retention policy |
| Incident recovery | ❌ no plan | ✅ 1-page runbook + tested restore | ✅ RTO/RPO defined (e.g. RTO 4h / RPO 24h), drills |
| Legal/compliance trust | ❌ no DPAs | ✅ DPAs with Vercel, Supabase, OpenAI (all offer them free); privacy notice; processing records | ✅ + AVV (German DPA) template for customers, subprocessor list, ISO/SOC evidence from providers |

**EU AI Act positioning:** NewsPulse AI (news search + LLM summarization) is a **minimal/limited-risk** AI system — not a prohibited practice, not Annex III high-risk. Obligations are mainly **transparency** (Art. 50: tell users content is AI-generated — add an "AI-generated summary" label, already implicitly present, make it explicit) and **GPAI flows down to the model provider** (OpenAI), not you. German customers will care much more about **GDPR** (residency, DPA/AVV, TOMs document, deletion) than the AI Act for this product class. The Tier B checklist covers what a German Mittelstand pilot's procurement will actually ask.

---

## 6. Decision Verdict

## ⛔ NO-GO — in the current state
## ✅ GO WITH RISKS — for August Alpha, **if** the P0 list ships (realistic: 1–2 weeks, ~€0–50/mo)

**Why NO-GO today:**
1. The product has **never been deployed** — there is nothing to launch. The pipeline has never been green on `main`.
2. **Anyone on the internet could delete the entire database** and read/write it directly via the public anon key.
3. **No authentication** means no pilots, no tenants, no audit trail, no GDPR answers for German customers.
4. **Zero backups** and an untested restore path mean the first serious mistake is unrecoverable.
5. The pinned framework version carries a **critical advisory**, and the app's only abuse protection lives in the affected middleware layer.

**Why GO WITH RISKS is realistic for August:**
- Every blocker is fixable with configuration and code, not money: the fixes for the build, lockfile, Next upgrade, and RLS are **already written in open PR #4** — they just need to be merged and deployed.
- The chosen stack (Vercel + Supabase) has first-class EU regions and free DPAs; residency is a project-settings decision, not a re-architecture.
- Today is July 9. The P0 list (see action plan) is ~1–2 focused weeks. The remaining accepted risks for Alpha (US-based LLM subprocessor with DPA, no PITR, single region) are disclosable and normal for a pilot-stage product.

**Conditions attached to the GO:** all "Before Alpha" items in §7 complete, one successful restore rehearsal performed, and keys rotated. If those aren't done by launch date, the verdict reverts to NO-GO.

---

## 7. Action Plan

### Top 10 fixes (priority order)

1. **Merge PR #4** (or equivalent): lockfile, Next ≥14.2.35, anon-policy removal, rate-limit widening, security headers, tests. *(today, €0)*
2. **Rotate all 5 API keys**; store in Vercel env + password manager. *(today, €0)*
3. **Verify/create Supabase project in eu-central-1**; if the current project is in a US region, create a new EU project and migrate the (tiny) schema. *(today, €0)*
4. **Set the 3 GitHub Vercel secrets + 5 Vercel env vars; pin functions to fra1; get one green deploy to production.** *(today–tomorrow, €0)*
5. **Authentication on every mutating endpoint** (Supabase Auth); deny-by-default RLS; remove the unauthenticated wipe-all. *(before Alpha)*
6. **Backups:** enable Supabase Pro daily backups ($25/mo) or, at minimum, a free weekly `pg_dump` GitHub Action to encrypted storage — **and rehearse one restore**. *(before Alpha)*
7. **Durable rate limiting** via Upstash Redis (EU region, free tier) + provider billing alerts (OpenAI hard limit, Vercel spend alert). *(before Alpha)*
8. **Monitoring:** UptimeRobot on `/api/health`, Sentry free tier, Vercel log drain. *(before Alpha)*
9. **Staging/production separation:** second free Supabase project + Vercel preview env pointed at it; releases via tagged deploys with instant Vercel rollback. *(before Beta)*
10. **Compliance pack:** DPAs (Vercel/Supabase/OpenAI), privacy notice, processing record, 1-page incident runbook, audit-log table, per-tenant deletion. *(before Beta / first German pilot contract)*

### What can be done today (all €0)
Items 1–4 plus: enable GitHub secret scanning + Dependabot, add billing alerts, document the stack (this PR).

### Must be done before Alpha (August)
Items 5–8. Accepted, disclosed risks: single region, no PITR, OpenAI US processing under DPA.

### Must be done before Beta
Items 9–10, plus: PWA layer (merge PR #2 or equivalent), evidence-export endpoint, restore drill #2, load test of `/api/search` under the Redis limiter.

### Can wait until paid customers
Supabase Team/PITR, EU-resident LLM switch (OpenAI EU residency / Azure OpenAI EU / Mistral), Hetzner sovereign migration (Tier C Path 2), WAF, SSO, SOC2-style evidence collection, multi-region DR.

---

## Checks executed during this review

| Check | Result |
|---|---|
| `npm ci` | ❌ fails — no `package-lock.json` (confirms CI break) |
| `npm install` | ✅ |
| `npm audit` | ❌ 5 vulns: **1 critical**, 3 high, 1 moderate — all fixed by Next upgrade |
| `npm run lint` | ✅ clean |
| `npx tsc --noEmit` | ✅ clean |
| `npm run build` (stub env) | ✅ builds; all routes compile |
| Full-git-history secret scan | ✅ no leaked keys found |
| GitHub Actions history | ❌ `main` has never had a green CI or deploy run |
| Open PR inventory | 5 open PRs, none merged; PR #4 contains most P0 fixes already |

---

*Companion documents:*
- [`HARDWARE_RISK_REGISTER.md`](./HARDWARE_RISK_REGISTER.md) — full risk register with severity, likelihood, owner, mitigation
- [`CLOUD_DEPLOYMENT_BLUEPRINT.md`](./CLOUD_DEPLOYMENT_BLUEPRINT.md) — concrete build-out for tiers A/B/C incl. migration steps
- [`ALPHA_BETA_INFRA_CHECKLIST.md`](./ALPHA_BETA_INFRA_CHECKLIST.md) — tick-box launch checklist
- [`COST_ESTIMATE.md`](./COST_ESTIMATE.md) — monthly cost model per tier
