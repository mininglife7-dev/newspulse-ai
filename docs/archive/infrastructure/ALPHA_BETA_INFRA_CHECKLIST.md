# Alpha/Beta Infrastructure Launch Checklist — NewsPulse AI (EURO AI / Cathedral)

> ⚠️ **SUPERSEDED — historical record (2026-07-09).** This checklist targets the **pre-pivot NewsPulse AI** app. The repository has since pivoted to the **EURO AI / Cathedral** EU AI Act governance platform, which tracks launch readiness through its own current gates. Use the live checklists below; the items here are a **historical reference**.
>
> **Current launch gates:** [`../PRODUCTION_READINESS_CHECKLIST.md`](../PRODUCTION_READINESS_CHECKLIST.md) · [`DEPLOYMENT_FINAL_CHECKLIST.md`](./DEPLOYMENT_FINAL_CHECKLIST.md) · [`../LAUNCH-BLOCKERS.md`](../LAUNCH-BLOCKERS.md) · [`../GO-NO-GO-REPORT.md`](../GO-NO-GO-REPORT.md)

**Date:** 2026-07-09 · Tick every box in a phase before declaring that phase done.
Verdict rule: **Alpha may not launch with any P0/P1 box unchecked** (see `HARDWARE_RISK_REGISTER.md`).

---

## Phase 0 — Today (all free, ~half a day)

- [ ] Merge **PR #4** (lockfile, build fix, Next ≥14.2.35, anon RLS removal, security headers, tests); close PR #1 as superseded
- [ ] **Rotate all 5 API keys** (Firecrawl, OpenAI, Supabase URL stays, anon + service-role keys) — store in password manager
- [ ] Verify Supabase project region = **eu-central-1** (Settings → General); if US, create new EU project + run schema there
- [ ] Set GitHub secrets: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`
- [ ] Set Vercel env vars (Production): all 5 keys + `NEXT_PUBLIC_SITE_URL`
- [ ] Add `"regions": ["fra1"]` to `vercel.json`
- [ ] Push to `main` → confirm **first-ever green CI + green production deploy**
- [ ] Smoke test in production: `/`, `POST /api/search`, `/history`, `/api/health` returns 200 `healthy`
- [ ] OpenAI **hard spend limit** (e.g. $10/mo) + Vercel spend alert + Supabase usage alert
- [ ] UptimeRobot (free) monitor on `/api/health`, alert to founder email/phone
- [ ] Enable GitHub **Dependabot alerts + secret scanning + push protection**
- [ ] Stop daily dev work as Windows **Administrator** account

## Phase 1 — Before Alpha (August), ~1–2 weeks, ≤ €50–60/mo

**Security & access**

- [ ] Supabase **Auth** live (email/password or magic link)
- [ ] Every mutating API route requires a valid session (`/api/history*` all methods, `POST /api/search`)
- [ ] Wipe-all `DELETE /api/history` removed or scoped to the caller's own rows
- [ ] RLS deny-by-default; policies scoped to `auth.uid()` / `tenant_id`; **no `anon` write policy anywhere**
- [ ] `tenant_id` + `user_id` columns on `news_searches`; every query scoped
- [ ] Durable rate limiting via **Upstash Redis (EU region)** — per-user and per-IP
- [ ] Security headers verified in production (nosniff, frame-deny, referrer-policy, permissions-policy)
- [ ] `npm audit` shows **0 critical / 0 high** in production dependencies

**Reliability & data**

- [ ] Supabase **Pro** ($25/mo): daily backups on, project no longer pauses
- [ ] Weekly offsite encrypted `pg_dump` to EU object storage (30-day retention)
- [ ] **One full restore rehearsed** into a scratch project — duration written down (this is your RTO evidence)
- [ ] Retention job: auto-delete search rows older than agreed period (e.g. 90 days)
- [ ] Row-size guard on `saveSearch` (cap stored JSONB size)

**Observability**

- [ ] Sentry (free tier) wired for server + client errors, alert rule to email
- [ ] Vercel log drain configured (retain ≥30 days)
- [ ] `/api/health` extended: DB reachability check (not just env presence)

**Compliance (paperwork day)**

- [ ] DPAs signed: Vercel, Supabase, OpenAI (all self-serve, free)
- [ ] Firecrawl ToS/DPA reviewed — documented that only public news content is sent
- [ ] Privacy notice published; subprocessor list published
- [ ] Record of processing activities (1 page) written
- [ ] Incident-response runbook (1 page): who does what, provider status pages, restore steps
- [ ] UI labels summaries as **"AI-generated"** with model name (EU AI Act Art. 50 transparency)

**Pilot onboarding**

- [ ] Pilot tenant created end-to-end via the real flow (signup → search → history → deletion)
- [ ] Per-tenant data deletion executed once as a test and verified

## Phase 2 — Before Beta

- [ ] Staging environment: second Supabase (free) project + Vercel preview env pointed at it; schema changes land in git as SQL migrations, applied to staging first
- [ ] Tagged releases; rollback tested once via Vercel instant rollback
- [ ] Append-only `audit_log` table capturing every authenticated mutating action
- [ ] Evidence-export endpoint: tenant admin downloads all their data (JSON/CSV)
- [ ] PWA install layer merged (PR #2 or equivalent) and tested on iPhone + Android
- [ ] Load test `/api/search` (e.g. 50 concurrent users) — Redis limiter holds, p95 < 15 s, no double-spend of AI credits
- [ ] Restore drill #2 (staging), documented RTO/RPO vs targets (suggest RTO 4h / RPO 24h)
- [ ] Second uptime region check (UptimeRobot multi-location)
- [ ] Next.js major upgrade planned/executed (14 → 15/16) to clear remaining advisories

## Phase 3 — Before first paid contract

- [ ] Supabase PITR add-on **or** Tier C Path 2 (Hetzner EU-sovereign) per `CLOUD_DEPLOYMENT_BLUEPRINT.md`
- [ ] EU-resident LLM option (OpenAI EU residency / Azure OpenAI EU / Mistral) at least feature-flagged
- [ ] AVV (German DPA) template ready to sign with customers; TOMs document written
- [ ] Audit log retention ≥1 year; log storage in EU
- [ ] Tenant-isolation test suite (user A can never read/write tenant B — automated)
- [ ] Deletion certificates generated on tenant data deletion
- [ ] Status page public (BetterStack/Instatus free tier)
- [ ] Quarterly restore + incident drill calendar entries exist
- [ ] SSO (SAML/OIDC) if any customer asks
- [ ] Product identity resolved (NewsPulse vs Governor vs EURO AI/Cathedral) and licensing reviewed

---

**Sign-off table**

| Gate            | Date | All boxes checked? | Signed (Founder) |
| --------------- | ---- | ------------------ | ---------------- |
| Phase 0         |      | ☐                  |                  |
| Alpha (Phase 1) |      | ☐                  |                  |
| Beta (Phase 2)  |      | ☐                  |                  |
| Paid (Phase 3)  |      | ☐                  |                  |
