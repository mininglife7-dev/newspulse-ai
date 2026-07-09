# Founder Infrastructure Dashboard

> **The one question this answers:** _Is our technology foundation healthy enough to launch, scale, and support customers?_

- **Reviewed by:** Governor — Chief Infrastructure & Architecture Advisor
- **Last reviewed:** 2026-07-09
- **Product stage:** Hackathon MVP / demo-ready — **not yet a multi-customer SaaS**
- **Live version:** Visit **`/founder`** in the running app for the same view, rendered and always current.

**How to read this:** every claim carries a confidence label.

- ✅ **Verified** — confirmed by reading the code/config in this repository.
- 🔵 **Estimated** — a reasoned judgement based on how the stack behaves.
- ⚪ **Unknown** — cannot be confirmed from inside the repo; needs a look at a live console (Vercel / Supabase / OpenAI). It stays UNKNOWN until then — we do not guess.

> **Single source of truth:** this document mirrors [`lib/founder/dashboard-data.ts`](../../lib/founder/dashboard-data.ts). When infrastructure changes, update that file in the same PR and refresh this briefing. The live `/founder` page reads directly from it.

---

## 7. Executive Summary

### Launch Decision: ⚠️ **GO WITH CONDITIONS** · Overall Launch Readiness **40 / 100**

GO to keep demoing and sharing the product publicly — it is stable and impressive. NO-GO for onboarding paying or separated customers until authentication and monitoring exist. Treat the next actions below as the launch checklist.

- **Architecture health:** The core product works and is cleanly built, but it is a single-user demo: there is no sign-in, no monitoring, and no automated tests. Solid foundation, not yet a customer platform.
- **Deployment health:** Ships automatically to Vercel on every push, with automated checks (lint, type-check, build) gating each change. There is no separate staging environment and the live production URL has not been verified from inside the code.

**Biggest risks**

1. **No sign-in / accounts** — anyone can use the app and everyone shares one history. This blocks charging customers and creates privacy exposure.
2. **No monitoring or alerting** — if the site breaks at 2am, no one is told. We would learn from an angry customer, not a dashboard.
3. **No automated tests** — every change risks silently breaking something a customer relies on.
4. **Rate limiting is in-memory**, so it resets whenever the server scales or restarts — it does not reliably protect our paid AI/search spend.

**Biggest achievements**

1. End-to-end product works: search → AI summary → saved history, live on Vercel.
2. Automated quality gate (CI) blocks broken code from reaching customers.
3. Clean, strict-typed codebase with lazy, build-safe secret handling — a strong base to build on.
4. Secrets are handled correctly (server-side env vars, never shipped to the browser).

**Critical blockers**

- Authentication must exist before we can onboard or bill real, separated customers.
- Basic monitoring + error alerting must exist before we can promise uptime.

**Recommended next actions**

1. Add authentication and per-user data isolation (accounts).
2. Add uptime + error monitoring with alerts (e.g. a hosted monitor + Sentry).
3. Add a durable rate limiter (Upstash/Vercel KV) to protect AI spend.
4. Add a first layer of automated tests around the `/api/search` pipeline.
5. Verify and record the real production URL, hosting regions, and data location.

---

## 3. Founder Health Score

Honest 0–100 scores. Nothing is inflated; UNKNOWN stays UNKNOWN.

| Dimension | Score | Confidence | What is holding it there |
| --- | :---: | --- | --- |
| Deployment Readiness | 60 | ✅ Verified | Automated deploy + CI gate work; no staging and unverified prod URL hold it back. |
| Infrastructure Readiness | 45 | ✅ Verified | Core stack solid; auth, monitoring, and tests are missing. |
| Security Readiness | 35 | ✅ Verified | Secrets handled well, but no auth and only in-memory rate limiting. |
| Reliability | 40 | 🔵 Estimated | Depends on 3 external services with no monitoring or automated tests. |
| Scalability | 55 | 🔵 Estimated | Serverless scales; rate limiter and single-table design are near-term limits. |
| Maintainability | 60 | ✅ Verified | Clean strict-typed code; the absence of tests is the main drag. |
| Observability | 25 | ✅ Verified | Only a health endpoint; no monitoring, alerting, or retained logs. |
| Cost Optimization | 60 | 🔵 Estimated | Cheap model and likely free tiers, but actual spend is unmeasured. |
| Customer Readiness | 30 | ✅ Verified | No accounts, no per-user data, no billing — cannot serve separated customers. |
| Enterprise Readiness | 15 | ✅ Verified | No SSO, audit trail, SLA, or compliance posture. |
| EU AI Readiness | 20 | 🔵 Estimated | No AI transparency notices, data-residency guarantees, or DPA posture; data flows to US OpenAI. |
| **Overall Launch Readiness** | **40** | ✅ Verified | Great demo; not ready to onboard/bill real, separated customers until auth + monitoring land. |

---

## 1. Infrastructure Health

Every foundation component: status, confidence, risk, trend, business impact, and the single most valuable next move.

| Component | Status | Confidence | Risk | Trend | Business impact | Recommended action |
| --- | --- | --- | --- | --- | --- | --- |
| Frontend | Operational | ✅ Verified | Low | Stable | The website customers see and use works and looks polished. | Keep as-is; add screenshots and a customer-facing landing story before launch. |
| Backend / API | Operational | ✅ Verified | Low | Stable | The engine that runs a search and returns summaries works reliably at demo scale. | Add automated tests around the search pipeline before scaling usage. |
| Database | Operational | ✅ Verified | Medium | Stable | Every search and its results are saved so history can be replayed. | Add a user/owner column once accounts exist so data is per-customer. |
| Authentication | **Not Implemented** | ✅ Verified | **Critical** | Stable | No one signs in. Everyone shares one pool of history. We cannot tell customers apart or bill them. | Add authentication (Supabase Auth or Clerk) — the #1 launch blocker for real customers. |
| Authorization | Partial | ✅ Verified | High | Stable | With no users there are no per-user permissions. Anyone can read or clear all history. | Introduce per-user row ownership and tighten RLS once accounts exist. |
| Storage (files) | Not Implemented | ✅ Verified | Low | Stable | We do not store files/images today, so there is nothing to lose — or protect — here. | No action needed until the product stores uploads or exports. |
| AI Models | Operational | ✅ Verified | Medium | Stable | The intelligence customers pay for — article summaries — works and is inexpensive per use. | Track per-search AI cost and add a spend cap to avoid bill surprises. |
| Vector Database | Not Implemented | ✅ Verified | Low | Stable | Not needed yet. Would only matter with semantic search or a knowledge base. | Defer. Revisit only for "search across past articles" / RAG features. |
| External APIs | Operational | ✅ Verified | High | Stable | The product depends on three outside services; if any fails or rate-limits us, features break. | Add graceful degradation + alerts per dependency; monitor their status. |
| Monitoring | Partial | ✅ Verified | High | Stable | If the site breaks, we'd likely hear it from a customer first, not a system. | Add an uptime monitor hitting `/api/health` and page/notify on failure. |
| Logging | Partial | ✅ Verified | Medium | Stable | When something goes wrong we have basic clues, but no searchable, retained record. | Adopt structured logging + a log drain (Logtail/Datadog) with retention. |
| Audit Trail | Not Implemented | ✅ Verified | Medium | Stable | We cannot prove who did what — which enterprise/compliance customers require. | Add an audit log once accounts exist (who searched/deleted what, when). |
| Security | Partial | ✅ Verified | High | Stable | Secrets are handled correctly, but with no login and weak rate limiting the app is exposed to abuse. | Ship auth + a durable rate limiter; add security headers and dependency scanning. |
| Backup | **Unknown** | ⚪ Unknown | High | Stable | If the database were lost, we don't know from here whether customer history could be recovered. | Confirm Supabase plan + backup schedule in the console; document RPO. |
| Disaster Recovery | Partial | 🔵 Estimated | High | Stable | We can roll back a bad code deploy quickly, but have no tested plan for data loss or a provider outage. | Write and test a one-page DR runbook (restore DB, redeploy, rotate keys). |
| CI/CD | Operational | ✅ Verified | Low | Improving | Broken code is caught automatically before it can reach customers. | Add a test step to CI once tests exist; keep the pipeline green. |
| Production Deployment | Partial | 🔵 Estimated | Medium | Stable | The product deploys to the cloud automatically, but we haven't verified the live URL from the code. | Confirm the real production URL + region and record it below. |
| Staging Environment | Not Implemented | ✅ Verified | Medium | Stable | No safe copy of production to test on; risky changes are validated in previews only. | Promote a long-lived staging deployment with its own database before onboarding. |
| Development Environment | Operational | ✅ Verified | Low | Stable | Engineers can run and improve the product locally with a documented setup. | None; keep `.env.example` and the env-check script current. |
| Performance | Operational | 🔵 Estimated | Medium | Stable | Searches feel responsive at demo scale; a heavy search can take several seconds. | Measure real p95 latency once traffic exists; consider streaming results. |
| Scalability | Partial | 🔵 Estimated | Medium | Stable | The web layer scales automatically, but a couple of pieces will strain under real load. | Move rate limiting off in-memory; watch external API limits and DB connections. |
| Availability | **Unknown** | ⚪ Unknown | High | Stable | We cannot state an uptime figure because nothing measures it. No SLA today. | Start measuring uptime immediately; only then can we make availability promises. |
| Cost Efficiency | Operational | 🔵 Estimated | Low | Stable | Running costs are expected to be low today (cheap AI model, likely free tiers). | Record actual monthly spend across providers; add budget alerts. |
| Technical Debt | Partial | ✅ Verified | Medium | Stable | The code is clean, but missing tests, auth, and monitoring will slow us as we grow. | Pay down in order: tests → durable rate limiter → monitoring → auth foundations. |

---

## 2. Deployment Reality

Where the product actually lives, and what we can and cannot confirm from the code.

| Fact | Reality | Confidence |
| --- | --- | --- |
| Current Local Deployment | Yes — `npm run dev` (Next.js dev server) | ✅ Verified |
| Current Cloud Deployment | Vercel (via GitHub integration) | ✅ Verified |
| Production Environment | Vercel production (push to `main`) | ✅ Verified |
| Staging Environment | None (per-PR preview deployments only) | ✅ Verified |
| Preview Environment | Yes — one preview URL per pull request | ✅ Verified |
| Regions | Vercel default region; not pinned in config | ⚪ Unknown |
| Hosting Provider | Vercel (web + serverless functions) | ✅ Verified |
| Database Location | Supabase project region — set at project creation | ⚪ Unknown |
| Backup Location | Managed by Supabase (plan-dependent) | ⚪ Unknown |
| AI Model Hosting | OpenAI (gpt-4o-mini), US-hosted | ✅ Verified |
| Customer Data Location | Search history in Supabase Postgres; article content sent to OpenAI for summarization | ✅ Verified |
| Current Production URL | Not verified in-repo (README default: `newspulse-ai.vercel.app`) | ⚪ Unknown |
| Version | 1.0.0 (`package.json`) | ✅ Verified |
| Deployment Date | Continuous — on each merge to `main` | ✅ Verified |
| Last Successful Deployment | Visible in the Vercel dashboard (not readable from repo) | ⚪ Unknown |
| Last Failed Deployment | Visible in the Vercel dashboard (not readable from repo) | ⚪ Unknown |
| Rollback Capability | Yes — Vercel instant rollback to a prior deployment; git revert for code | ✅ Verified |
| Recovery Time (RTO) | Code: minutes (redeploy/rollback). Data: undefined (no drill) | 🔵 Estimated |
| Recovery Point (RPO) | Depends on Supabase backup schedule — unconfirmed | ⚪ Unknown |

---

## 4. Explain Like a Founder

Each key component in plain English (≤150 words each).

### Authentication (Sign-in / Accounts)
- **What it is:** The front door that lets a person prove who they are and gives them their own private space.
- **Why customers care:** They expect their searches and history to be theirs alone, not shared with strangers.
- **Business value:** Without it we cannot separate customers, charge them, or protect their data — so we cannot really sell the product.
- **Current implementation:** None. The app is fully public and everyone shares a single history.
- **Future improvements:** Add Supabase Auth or Clerk, give each user their own data, and gate the API behind login.
- **Risk if ignored:** No revenue path, privacy exposure, and abuse of our paid AI/search budget by anonymous users.

### Monitoring & Alerting
- **What it is:** An always-on watchman that checks the product is up and tells us the instant it breaks.
- **Why customers care:** They judge us on whether the product works when they need it — not on apologies afterward.
- **Business value:** Lets us catch and fix problems before customers notice, and eventually promise reliability (an SLA).
- **Current implementation:** A health-check endpoint exists, but nothing is watching it and no one gets alerted.
- **Future improvements:** Add an uptime monitor on `/api/health` plus error tracking (e.g. Sentry) with phone/email alerts.
- **Risk if ignored:** Outages go unnoticed for hours; we lose trust and customers before we even know something is wrong.

### Automated Tests
- **What it is:** A safety net of checks that automatically confirm the product still works after every change.
- **Why customers care:** They only see a stable product — never the bug we caught before it shipped.
- **Business value:** Lets us move fast without breaking things, which keeps customers happy and support costs down.
- **Current implementation:** None. We rely on type-checking and manual review only.
- **Future improvements:** Add tests around the search pipeline and the history API, then run them in CI.
- **Risk if ignored:** Each change risks silently breaking a customer-facing feature no one notices until it's too late.

### Rate Limiting (Spend Protection)
- **What it is:** A bouncer that stops any single user from hammering the app and running up our AI/search bill.
- **Why customers care:** It keeps the service fast and fairly available for everyone, and keeps prices sustainable.
- **Business value:** Protects our margins by preventing runaway costs and abuse of paid third-party APIs.
- **Current implementation:** A basic limiter exists but lives in memory, so it forgets everyone whenever the server restarts or scales.
- **Future improvements:** Move it to a shared store (Upstash or Vercel KV) so limits hold across all servers.
- **Risk if ignored:** A single abuser (or a bad script) could quietly run up a large OpenAI/Firecrawl bill.

### AI Summaries (the product intelligence)
- **What it is:** The AI that reads each article and writes a short, neutral 2–3 sentence summary.
- **Why customers care:** It is the reason to use us instead of a plain search engine — it saves them reading time.
- **Business value:** This is our core value proposition and it is cheap to run per search today.
- **Current implementation:** OpenAI's gpt-4o-mini summarizes up to 10 articles per search, in parallel, with a safe fallback.
- **Future improvements:** Track cost per search, add a spend cap, and consider streaming summaries into the page for speed.
- **Risk if ignored:** Uncapped AI cost and a slower experience as usage grows.

### Database & Backups
- **What it is:** The filing cabinet that stores every search and its results, plus the copies that protect against loss.
- **Why customers care:** They expect their history to still be there tomorrow — and not to vanish in an accident.
- **Business value:** Reliable storage and recovery are table stakes for trust; losing data can end a company.
- **Current implementation:** Supabase Postgres holds the data. Backup frequency is managed by Supabase and unconfirmed from the code.
- **Future improvements:** Confirm the backup schedule, test a restore, and document how fast we could recover.
- **Risk if ignored:** A data-loss event could be unrecoverable, destroying customer trust instantly.

---

## 5. Architecture Verification — Current vs World-Class

Our architecture measured against world-class SaaS practice, with practical fixes only.

| Category | Finding | World-class practice | Practical fix | Risk |
| --- | --- | --- | --- | --- |
| Missing Component | No authentication or per-user data isolation. | Every multi-tenant SaaS authenticates users and scopes all data to an owner. | Adopt Supabase Auth or Clerk; add an owner column and RLS keyed to the user. | Critical |
| Operational Risk | No monitoring, alerting, or retained logs. | Uptime checks, error tracking, structured logs, and on-call alerting from day one. | Add an uptime monitor + Sentry + a log drain; wire alerts to email/Slack. | High |
| Single Point of Failure | Hard dependency on Firecrawl, OpenAI, and Supabase with no retries or fallback. | Retries, timeouts, circuit breakers, and graceful degradation per dependency. | Add bounded retries + clear user-facing degradation when a provider fails. | High |
| Under-engineering | Rate limiting is in-memory and per-instance, so it resets on scale/restart. | Distributed rate limiting backed by a shared store, applied at the edge. | Move to Upstash Ratelimit or Vercel KV; keep it on the expensive routes. | High |
| Under-engineering | No automated test suite. | Unit + integration tests gate every merge in CI. | Start with search-pipeline and history-API tests; add a CI test step. | Medium |
| Compliance Risk | No audit trail, AI-transparency notices, or documented data-residency posture; article text flows to US OpenAI. | Audit logs, a DPA, regional data handling, and clear AI disclosures. | Add an audit log, publish an AI/data notice, document where data lives and flows. | Medium |
| Operational Risk | No persistent staging; changes validated in ephemeral previews only. | A production-like staging environment with its own data. | Stand up a long-lived staging deployment with a separate Supabase project. | Medium |
| Cost Risk | Actual cloud/AI spend is unmeasured and uncapped. | Per-feature cost tracking and hard budget alerts on every paid provider. | Record monthly spend, add budget alerts, and cap AI usage per user. | Low |

_No over-engineering found — the stack is appropriately lean for its stage. The gaps are all under-engineering relative to a customer-facing SaaS._

---

## 6. Architecture Decision Record

The significant infrastructure decisions, why we made them, and how to reverse them.

### ADR-1 — Deploy via Vercel Git integration (push-to-deploy)
- **Reason:** Vercel natively builds, previews, and deploys Next.js with zero custom pipeline to maintain.
- **Alternatives considered:** GitHub Actions deploy workflow; self-hosted/containerized deploy.
- **Benefits:** Automatic production deploys on merge, a preview URL per PR, instant rollback.
- **Trade-offs:** Deploy history/status live in Vercel, not the repo — less visible from the code.
- **Risks:** Vendor lock-in to Vercel; production URL/regions not recorded in-repo.
- **Rollback plan:** Vercel instant rollback to a previous deployment; revert the commit in git.
- **Owner:** Engineering (Governor) · **Date:** 2026-07-09
- **Evidence:** Commit `4f9ad97` removed the broken Actions deploy workflow; README documents the Vercel integration.

### ADR-2 — Store each search + results as a JSONB row in a single Postgres table
- **Reason:** Lets the `/history` page replay the exact result view with a simple, flexible schema.
- **Alternatives considered:** Normalized tables (searches + articles); a document database.
- **Benefits:** Fast to build, easy to render, flexible result shape.
- **Trade-offs:** Harder to query inside results; no per-article relationships or per-user scoping yet.
- **Risks:** Will need migration to add user ownership and richer querying as the product grows.
- **Rollback plan:** Schema is additive; a migration can normalize later without data loss.
- **Owner:** Engineering (Governor) · **Date:** 2026-07-09
- **Evidence:** `supabase/schema.sql` — `news_searches` with a JSONB `results` column.

### ADR-3 — Instantiate Supabase and OpenAI clients lazily behind guards/Proxy
- **Reason:** Allows `next build` to collect page data without real secrets and avoids crashing on cold import.
- **Alternatives considered:** Eager client creation at module load (fails the build without env vars).
- **Benefits:** CI can build with stub env vars; runtime fails loudly only when a secret is truly needed.
- **Trade-offs:** Slightly more indirection in the client modules.
- **Risks:** Low — behavior is well-contained and covered by the health endpoint.
- **Rollback plan:** Revert to eager initialization if the indirection ever causes confusion.
- **Owner:** Engineering (Governor) · **Date:** 2026-07-09
- **Evidence:** `lib/supabase.ts` (Proxy) and `lib/openai.ts` (lazy client); commit `18c751c`.

### ADR-4 — Adopt an in-memory rate limiter for `/api/search` as an interim guard
- **Reason:** Ships basic abuse protection with zero extra infrastructure at hackathon scale.
- **Alternatives considered:** Upstash Ratelimit or Vercel KV (durable, distributed) from the start.
- **Benefits:** Immediate, dependency-free protection for the expensive search route.
- **Trade-offs:** Resets on every cold start and does not coordinate across serverless instances.
- **Risks:** Does not reliably cap spend under real, distributed load — flagged as technical debt.
- **Rollback plan:** Swap the limiter implementation for a shared store; the middleware boundary stays the same.
- **Owner:** Engineering (Governor) · **Date:** 2026-07-09
- **Evidence:** `middleware.ts` — in-memory `buckets` map with an explicit "swap for Upstash/KV" note.

---

## Turning UNKNOWN into fact (Founder action)

These items are honestly UNKNOWN because they can only be confirmed from a live console, not the code. A few minutes in each dashboard turns them green:

- **Vercel dashboard:** production URL, region, last successful/failed deployment, actual monthly spend.
- **Supabase dashboard:** project region (data location), plan + backup schedule (backup location, RPO).
- **OpenAI / Firecrawl billing:** actual AI and search spend.

Once confirmed, update [`lib/founder/dashboard-data.ts`](../../lib/founder/dashboard-data.ts) and this file in the same PR.
