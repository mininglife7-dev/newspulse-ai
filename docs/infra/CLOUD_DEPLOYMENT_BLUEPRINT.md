# Cloud Deployment Blueprint — NewsPulse AI (EURO AI / Cathedral)

**Date:** 2026-07-09 · Three architectures, cheapest-first, each a strict superset of the previous.
Costs are summarized here and modeled fully in [`COST_ESTIMATE.md`](./COST_ESTIMATE.md).

---

## Tier A — Founder Demo Architecture

**Goal:** off the laptop, demoable from any device, €0 fixed cost. Achievable in one day.

```
Browser ──HTTPS──► Vercel Hobby (Next.js 14, functions pinned fra1/Frankfurt)
                      │
                      ├─► Supabase Free (Postgres, eu-central-1) ── weekly pg_dump (GitHub Action)
                      ├─► Firecrawl API (US)  ← rotated key
                      └─► OpenAI gpt-4o-mini (US) ← rotated key, hard spend limit
UptimeRobot (free) ──► GET /api/health every 5 min
```

| Component | Choice | Spec | Cost |
|---|---|---|---|
| Compute | Vercel Hobby | serverless, 1 vCPU / 2 GB per invocation, 60s max on `/api/search` | €0 |
| Database | Supabase Free, **eu-central-1** | 500 MB Postgres, pauses when idle | €0 |
| Object storage | none needed yet | — | €0 |
| Backup | GitHub Actions weekly `pg_dump` → encrypted artifact (90-day retention) | RPO 7 days | €0 |
| Monitoring | UptimeRobot free + Vercel logs | 5-min checks | €0 |
| Security | key rotation, anon RLS policies dropped, shared bearer secret on DELETE routes, Next ≥14.2.35 | — | €0 |
| **Total fixed** | | | **€0/mo** (+ ~€5–20 AI usage) |

**Migration steps (Day 1):**
1. Merge PR #4 (lockfile, build fix, Next 14.2.35, anon-policy removal, headers, tests). Close PR #1 as superseded.
2. Rotate all 5 keys at their dashboards. Store in a password manager.
3. In Supabase: check project region (Settings → General). If not an EU region, create a new project in **eu-central-1**, run `supabase/schema.sql` (post-PR-#4 version) there, retire the old project.
4. `vercel link` → set the 5 env vars for Production (+ `NEXT_PUBLIC_SITE_URL`); add to `vercel.json`: `"regions": ["fra1"]`.
5. Set GitHub secrets `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`; push to `main`; confirm green CI + green deploy.
6. Create UptimeRobot monitor on `https://<domain>/api/health`; set OpenAI hard spend limit (e.g. $10/mo) and Vercel spend alert.
7. Add the weekly-backup GitHub Action (`pg_dump` via `SUPABASE_DB_URL` secret).

> Vercel Hobby's terms restrict commercial use — fine for internal demos; move to Tier B before customer pilots.

---

## Tier B — Alpha/Beta Pilot Architecture (Germany/EU pilots)

**Goal:** named German/EU pilot customers, real logins, backups you can restore, evidence you can show procurement. Achievable in 1–2 weeks.

```
Browser/PWA ──HTTPS──► Vercel Pro (fra1) ── prod + staging environments
                          │        │
                          │        └─ staging → Supabase Free #2 (staging DB)
                          │
                          ├─► Supabase Pro (eu-central-1)
                          │     • Auth (email/magic link)   • RLS deny-by-default, tenant_id scoped
                          │     • daily backups (7-day)     • audit_log (append-only)
                          ├─► Upstash Redis (EU) — durable rate limiting
                          ├─► OpenAI (US, DPA signed, spend-capped)
                          └─► Firecrawl (US, DPA/ToS reviewed — public news content only)

Sentry (errors) · UptimeRobot (uptime) · Vercel log drain
Weekly pg_dump ──► Hetzner Object Storage (EU, encrypted, 30-day retention)
```

| Component | Choice | Spec | Cost |
|---|---|---|---|
| Compute | Vercel Pro | fra1, staging+prod, instant rollback, spend controls | ~$20/mo |
| Database | Supabase Pro, eu-central-1 | 8 GB, daily backups 7-day, no pausing, Auth included | $25/mo |
| Staging DB | Supabase Free #2 | 500 MB | €0 |
| Rate limiting | Upstash Redis, EU region | @upstash/ratelimit sliding window | €0–10/mo |
| Object storage / backup offsite | Hetzner Object Storage (Falkenstein) | weekly encrypted `pg_dump`, 30-day retention | ~€5/mo |
| Monitoring | Sentry free + UptimeRobot free + Vercel logs | errors, uptime, request logs | €0 |
| Security | Supabase Auth on all routes; tenant_id RLS; security headers; Dependabot; secret scanning | — | €0 |
| **Total fixed** | | | **~€50–60/mo** (+ AI usage) |

**Code changes required (all in-repo, no re-architecture):**
1. **Auth:** Supabase Auth; middleware verifies session JWT on `/api/history*` (all methods) and `POST /api/search`; server routes read the user from the token, not the service key path.
2. **Schema v2:** add `user_id uuid references auth.users`, `tenant_id uuid`; RLS: `using (tenant_id = auth.jwt()->>'tenant_id')`-style policies; drop the wipe-all path — replace with scoped deletes.
3. **Rate limit:** swap in-memory Map for Upstash sliding-window (per-user for authed routes, per-IP for public pages); keep spend caps at providers.
4. **Audit log:** `audit_log(id, at, actor, tenant_id, action, target, meta jsonb)` insert on every mutating call; no UPDATE/DELETE grants on it.
5. **Retention:** nightly cron (Vercel cron) deleting `news_searches` rows older than the pilot's agreed retention (e.g. 90 days).
6. **AI transparency:** visible "AI-generated summary (gpt-4o-mini)" label (EU AI Act Art. 50).

**Compliance steps (paperwork, €0):** sign Vercel, Supabase, OpenAI DPAs; record of processing activities (one page); subprocessor list on your website; privacy notice; 1-page incident-response runbook; **rehearse one full backup restore into staging and write down how long it took (RTO evidence).**

**Migration A→B:** upgrade Vercel to Pro and Supabase to Pro in-place (no data move if the project is already eu-central-1); everything else is additive.

---

## Tier C — Paid Customer Architecture

**Goal:** production-grade, auditable, contract-ready. Two paths — choose per customer demands.

### Path 1: Managed (fastest, keep current stack)

Tier B plus: Supabase **PITR add-on** (RPO minutes), log drains to EU object storage (1-yr retention), Vercel Enterprise/fra-only commitments if required, SSO (Supabase Auth SAML), quarterly restore + incident drills, status page (BetterStack free). **~€150–250/mo.** US parent companies (Vercel, Supabase, OpenAI) remain subprocessors under DPA+SCCs — acceptable to most German customers, not to the strictest public-sector ones.

### Path 2: EU-sovereign (German datacenters, German provider)

```
Cloudflare/bunny.net WAF+CDN (EU)
        │
Hetzner Load Balancer (Falkenstein)
   ├── VM1 CPX31 (4 vCPU/8 GB/160 GB) — Docker: Next.js standalone + Caddy
   └── VM2 CPX31 — identical (zero-downtime deploys, HA)
        │
Managed EU Postgres (Aiven/Scaleway EU or Hetzner-hosted Postgres w/ streaming replica)
        │
Hetzner Object Storage — evidence exports, backups
restic nightly encrypted ──► second EU provider (Scaleway/OVH) — offsite
Grafana + Loki + Prometheus (small VM) or BetterStack — metrics/logs/alerts
LLM: OpenAI EU data residency, or Azure OpenAI (Germany West Central / Sweden Central), or Mistral (FR)
```

| Component | Spec | Cost |
|---|---|---|
| 2× Hetzner CPX31 + LB | 4 vCPU / 8 GB / 160 GB NVMe each | ~€35/mo |
| Managed Postgres (EU) or replica pair | 2 vCPU / 8 GB, daily backups + WAL | €30–80/mo |
| Object storage + offsite backup | 1 TB class | ~€10/mo |
| Monitoring stack | small VM or BetterStack | €5–30/mo |
| WAF/CDN | Cloudflare Pro or bunny.net | €0–20/mo |
| **Total fixed** | | **~€90–180/mo** (+ AI usage) |

**Migration B→C (Path 2):** containerize (`output: 'standalone'` in `next.config.js`, Dockerfile, Caddy TLS); replace Supabase Auth with Keycloak/Auth.js or keep Supabase solely as auth+DB (hybrid); `pg_dump`/restore Supabase → EU Postgres during a maintenance window (data volumes are tiny); cut DNS over; keep Vercel as instant-rollback fallback for 30 days.

**Either path, non-negotiable for paid:** per-tenant RLS with tests proving isolation; immutable audit log ≥1 yr; self-serve tenant evidence export (JSON/CSV); per-tenant deletion with confirmation record; RTO 4h / RPO 24h documented and drilled quarterly; AVV (German DPA) template ready for customers; subprocessor list published.

---

## Decision guidance

- **Today → Alpha:** Tier A this week, Tier B before the first pilot logs in. Both use the stack the code already targets — least engineering risk before August.
- **Beta → first contracts:** stay Tier B; add Tier C items as procurement demands them (usually: PITR, audit log retention, AVV).
- **Trigger for Path 2 (Hetzner):** a customer contractually requires no US subprocessors, or steady-state Vercel+Supabase+Upstash costs exceed ~€200/mo — Path 2 is cheaper at scale and stronger on sovereignty, at the price of owning ops (patching, TLS, deploy scripts).
