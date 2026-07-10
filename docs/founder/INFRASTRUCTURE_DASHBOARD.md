# Founder Infrastructure Dashboard

> **The one question this answers:** _Is our technology foundation healthy enough to launch, scale, and support customers?_

- **Reviewed by:** Governor — Chief Infrastructure & Architecture Advisor
- **Last reviewed:** 2026-07-10
- **Product stage:** Customer-readiness build in progress — accounts, per-user data isolation, monitoring, durable-capable rate limiting, and an automated test suite are **code-complete and verified locally**; enabling Supabase Auth on the live project is the remaining step before real customers.
- **Live version:** Visit **`/founder`** in the running app for the same view, rendered and always current.

**How to read this:** every claim carries a confidence label.

- ✅ **Verified** — confirmed by reading the code/config and running it locally.
- 🔵 **Estimated** — a reasoned judgement, or a capability that is built and locally verified but not yet proven against the live project.
- ⚪ **Unknown** — cannot be confirmed from inside the repo; needs a look at a live console. It stays UNKNOWN until then — we do not guess.

> **Single source of truth:** this document mirrors [`lib/founder/dashboard-data.ts`](../../lib/founder/dashboard-data.ts). When infrastructure changes, update that file in the same PR and refresh this briefing. The live `/founder` page reads directly from it.

---

## What changed this session (customer-readiness build)

The product moved from a polished public **demo** toward a genuinely **customer-ready** app. Delivered and verified locally (lint + type-check + 36-test suite + production build + live HTTP checks against a running server):

1. **Authentication + accounts** — Supabase Auth (email + password) with sign-in / sign-up / sign-out, session refresh in middleware, and route protection.
2. **Per-customer data isolation** — every saved search is owned by a `user_id`; all reads/writes/deletes are scoped to the signed-in customer in application code, plus owner-only RLS policies (migration 0002). **Automated tests prove one customer cannot read or delete another’s searches.**
3. **Security hole closed** — the previously unauthenticated `DELETE /api/history/:id` (which could delete *any* row by id) is now owner-locked; anonymous database policies removed.
4. **Monitoring** — structured, request-traced JSON logging (no secrets/PII) and a richer `/api/health` that distinguishes healthy / degraded / unavailable and reports rate-limit durability.
5. **Durable-capable rate limiting** — user- and IP-aware limits, tighter for anonymous visitors, durable across servers when Upstash is configured, with an honest in-memory fallback the health check reports.
6. **Automated test shield** — from **zero tests to 36**, wired into CI (validation, auth, cross-customer isolation, rate limiting, dashboard invariants).

**Honest limitation:** a real end-to-end signed-in journey (create account → login → saved search → cross-account isolation) has **not** been exercised against the live Supabase project, because that needs Email auth enabled and real credentials (console access we don’t have here). That path is proven by the isolation unit tests and code review, and by verified anonymous-rejection / redirect / rate-limit behavior on a running server — not by live E2E.

---

## 7. Executive Summary

### Launch Decision: ⚠️ **GO WITH CONDITIONS** · Overall Launch Readiness **52 / 100** (previously 40)

GO to keep demoing publicly and to proceed toward a **gated** launch — the customer-readiness foundation (accounts, data isolation, tests, spend protection) is now built and locally verified. Still NO-GO for onboarding or billing **real** customers until Supabase Auth is enabled + verified live, external alerting exists, and a billing path is added. These are the conditions, and they are now a short, concrete list rather than a rebuild.

- **Architecture health:** Materially stronger than a demo. Customers can create accounts and sign in; every saved search is private to its owner (isolation proven by tests); expensive routes are rate-limited; a 36-test suite guards the core paths. The gap between “built” and “serving customers” is enabling Supabase Auth live and running the migration.
- **Deployment health:** Ships automatically to Vercel on every push, now gated by lint, type-check, **an automated test suite**, and build. The Vercel preview for this work deployed successfully. Still no separate staging environment; the live production URL/region remain unverified from inside the code.

**Biggest risks**

1. Live Supabase Auth is not yet enabled/verified — the sign-in code is complete and fails closed, but a real end-to-end login has not been exercised on the production project.
2. No external monitoring or alerting yet — logging is structured and the health check is richer, but nothing pages a human when the site breaks.
3. Rate limiting is durable **only** if Upstash is configured; otherwise it falls back to per-instance memory (reported honestly at `/api/health`).
4. No billing/subscription system — accounts exist, but there is no way to charge yet.

**Biggest achievements**

1. Authentication + per-customer data isolation built end-to-end (Supabase Auth, middleware-protected routes, server-side ownership on every query).
2. Cross-user isolation proven by automated tests: one customer cannot read or delete another’s searches.
3. The previously unauthenticated delete-any-row endpoint is now locked to the owner — a real security hole closed.
4. From zero tests to a 36-test suite in CI; durable-capable rate limiting protects our AI/search spend.

**Critical blockers**

- Enable Email auth in the Supabase console and run migration 0002 on the live project — the last step to turn accounts on for real customers.
- Stand up external uptime + error alerting before promising any reliability.

**Recommended next actions**

1. Enable Supabase Email auth + run `supabase/migrations/0002` on the live project, then verify a real signup/login/isolation journey.
2. Configure Upstash (or Vercel KV) so rate limiting is durably distributed in production.
3. Add uptime + error alerting (a hosted monitor on `/api/health` + Sentry).
4. Add a billing/subscription layer once auth is live, to enable revenue.
5. Verify and record the real production URL, hosting regions, and data location.

---

## 3. Founder Health Score

Honest 0–100 scores. Scores reflect what is **built and verified locally**; where a capability is code-complete but not yet proven live (auth, RLS), confidence is 🔵 Estimated and the score is not pushed to where live proof would put it. Nothing is inflated; UNKNOWNs stay UNKNOWN.

| Dimension | Score (prev) | Confidence | What is holding it there |
| --- | :---: | --- | --- |
| Deployment Readiness | 63 (60) | ✅ Verified | Deploy + CI (now with tests) work; preview verified. No staging / unverified prod URL remain. |
| Infrastructure Readiness | 58 (45) | ✅ Verified | Auth, per-user data, tests, structured logging now exist; live enablement + alerting remain. |
| Security Readiness | 58 (35) | 🔵 Estimated | Real auth, owner-scoped data, no anon DB, spend limits, critical delete hole closed. Not yet verified live; no external alerting. |
| Reliability | 50 (40) | 🔵 Estimated | Graceful degradation, honest health, test suite; still no external monitoring or staging. |
| Scalability | 60 (55) | 🔵 Estimated | Serverless scales; rate limiter durable-capable when Upstash configured. |
| Maintainability | 70 (60) | ✅ Verified | Clean strict-typed code now backed by a 36-test suite in CI. |
| Observability | 42 (25) | ✅ Verified | Structured request-traced logs + dependency-aware health; still no external monitor/alerting/retention. |
| Cost Optimization | 62 (60) | 🔵 Estimated | Cheap model; tighter user/IP-aware limits reduce abuse. Actual spend still unmeasured. |
| Customer Readiness | 52 (30) | 🔵 Estimated | Accounts + private per-customer data built and locally verified; needs live enablement + billing. |
| Enterprise Readiness | 22 (15) | ✅ Verified | Auth + per-user isolation exist; still no SSO, durable audit trail, SLA, or compliance posture. |
| EU AI Readiness | 22 (20) | 🔵 Estimated | Marginal: no AI transparency notices, data-residency guarantees, or DPA; data still flows to US OpenAI. |
| **Overall Launch Readiness** | **52 (40)** | 🔵 Estimated | Foundation built and locally verified; gated launch is now a short checklist, not a rebuild. |

---

## 1. Infrastructure Health

| Component | Status | Confidence | Risk | Trend | Business impact | Recommended action |
| --- | --- | --- | --- | --- | --- | --- |
| Frontend | Operational | ✅ Verified | Low | Stable | The website customers see works and looks polished. | Add screenshots + a customer-facing landing story before launch. |
| Backend / API | Operational | ✅ Verified | Low | Improving | Routes now authenticated, validated, and test-covered. | Grow test coverage with features; send request traces to a log drain. |
| Database | Operational | ✅ Verified | Medium | Improving | Each customer’s searches are saved and private; anonymous searches aren’t persisted. | Run migration 0002 on the live database so ownership + RLS are enforced there too. |
| Authentication | Partial | ✅ Verified | Medium | Improving | Customers can create accounts and sign in; built and fails closed, needs switching on live. | Enable Email auth in Supabase + run migration 0002, then verify a real login. |
| Authorization | Partial | ✅ Verified | Medium | Improving | Each customer’s searches are private; cross-user access rejected (proven by tests). | Run migration 0002 so RLS enforces ownership at the database tier too. |
| Storage (files) | Not Implemented | ✅ Verified | Low | Stable | We store no files today — nothing to lose or protect here. | No action until the product stores uploads/exports. |
| AI Models | Operational | ✅ Verified | Medium | Stable | The summaries customers value work and are inexpensive per use. | Track per-search AI cost; add a spend cap. |
| Vector Database | Not Implemented | ✅ Verified | Low | Stable | Not needed yet. | Defer until semantic search / RAG. |
| External APIs | Operational | ✅ Verified | High | Stable | Depends on 3 outside services; a failure breaks features. | Add graceful degradation + alerts per dependency. |
| Monitoring | Partial | ✅ Verified | High | Improving | We can see structured errors + a smarter health check, but nothing pages a human. | Point an uptime monitor at `/api/health`; wire error alerts (Sentry). |
| Logging | Partial | ✅ Verified | Medium | Improving | Failures are traceable (request id + customer id), but logs aren’t retained long-term. | Send structured logs to a drain with retention + alerting. |
| Audit Trail | Partial | ✅ Verified | Medium | Improving | Searches/deletions are now attributable to a customer id in logs — not yet a durable audit store. | Persist an audit log (who did what, when) to a queryable store. |
| Security | Partial | ✅ Verified | Medium | Improving | Real sign-in, per-customer isolation, no anon DB, spend-protecting limits; critical delete hole closed. | Enable live auth; configure durable rate limiting; add security headers + dependency scanning. |
| Backup | **Unknown** | ⚪ Unknown | High | Stable | If the DB were lost, we can’t confirm from here whether history is recoverable. | Confirm Supabase plan + backup schedule; document RPO. |
| Disaster Recovery | Partial | 🔵 Estimated | High | Stable | Fast code rollback exists; no tested plan for data loss or a provider outage. | Write + test a one-page DR runbook. |
| CI/CD | Operational | ✅ Verified | Low | Improving | Broken code — incl. anything breaking customer isolation — is caught before customers see it. | Keep the pipeline green; grow coverage. |
| Production Deployment | Partial | 🔵 Estimated | Medium | Stable | Deploys automatically; live URL not verified from code. | Confirm + record the real production URL + region. |
| Staging Environment | Not Implemented | ✅ Verified | Medium | Stable | No safe production-like copy to test on. | Stand up a long-lived staging deployment with its own database. |
| Development Environment | Operational | ✅ Verified | Low | Stable | Engineers can run + improve the product locally. | Keep `.env.example` + env-check current. |
| Performance | Operational | 🔵 Estimated | Medium | Stable | Responsive at demo scale; heavy searches take a few seconds. | Measure real p95 once traffic exists; consider streaming results. |
| Scalability | Partial | 🔵 Estimated | Medium | Improving | Web layer scales; rate limiting holds across instances once the shared store is set. | Configure Upstash/Vercel KV in production. |
| Availability | **Unknown** | ⚪ Unknown | High | Stable | No uptime figure because nothing measures it. | Start measuring uptime; only then promise availability. |
| Cost Efficiency | Operational | 🔵 Estimated | Low | Stable | Costs expected low; tighter limits reduce abuse. | Record actual monthly spend; add budget alerts. |
| Technical Debt | Partial | ✅ Verified | Low | Improving | Tests, auth, durable-capable limiter, structured logging now exist; remaining debt is live-config + observability retention. | Add monitoring retention/alerting + a billing layer; keep coverage growing. |

---

## 2. Deployment Reality

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
| Customer Data Location | Per-customer search history in Supabase Postgres; article content sent to OpenAI for summarization | ✅ Verified |
| Current Production URL | Not verified in-repo (README default: `newspulse-ai.vercel.app`) | ⚪ Unknown |
| Version | 1.0.0 (`package.json`) | ✅ Verified |
| Deployment Date | Continuous — on each merge to `main` | ✅ Verified |
| Last Successful Deployment | Vercel dashboard (not readable from repo); this PR’s preview deployed successfully | 🔵 Estimated |
| Last Failed Deployment | Visible in the Vercel dashboard (not readable from repo) | ⚪ Unknown |
| Rollback Capability | Yes — Vercel instant rollback; git revert for code | ✅ Verified |
| Recovery Time (RTO) | Code: minutes (redeploy/rollback). Data: undefined (no drill) | 🔵 Estimated |
| Recovery Point (RPO) | Depends on Supabase backup schedule — unconfirmed | ⚪ Unknown |

---

## 5. Architecture Verification — Current vs World-Class

| Category | Finding | Practical fix | Risk |
| --- | --- | --- | --- |
| Operational Risk | Authentication is built but not yet enabled/verified live. | Enable Email auth, run migration 0002, verify a real journey. | Medium |
| Operational Risk | Structured logs + health check exist, but no external monitoring/alerting/retention. | Monitor `/api/health` + Sentry + log drain; alert to email/Slack. | High |
| Single Point of Failure | Hard dependency on Firecrawl/OpenAI/Supabase with no retries/fallback. | Add bounded retries + clear degradation per dependency. | High |
| Under-engineering | Rate limiting is durable-capable but in-memory until Upstash is configured. | Set Upstash env in production; adapter switches automatically. | Medium |
| Missing Component | No billing/subscription system — accounts exist but no way to charge. | Add Stripe subscriptions gated on the authenticated user. | Medium |
| Compliance Risk | No durable audit trail / AI-transparency notices / documented data residency; text flows to US OpenAI. | Add an audit store, publish an AI/data notice, document data flows. | Medium |
| Operational Risk | No persistent staging; changes validated in ephemeral previews only. | Stand up a long-lived staging deployment with a separate Supabase project. | Medium |
| Cost Risk | Actual cloud/AI spend is unmeasured and uncapped. | Record monthly spend, add budget alerts, cap AI usage per user. | Low |

_No meaningful over-engineering found — the stack remains appropriately lean for its stage._

---

## 6. Architecture Decision Record (new decisions this session)

- **Auth via Supabase Auth (email+password), not a new vendor** — reuses our existing Supabase project (no new bill), cookie-based SSR sessions fit Next.js App Router, RLS keyed to `auth.uid()`. Rollback: auth is additive; reverting returns the app to anonymous demo. Evidence: `lib/supabase/server.ts`, `lib/auth.ts`, `middleware.ts`, `app/login`.
- **Hybrid access** — anonymous visitors may search (demo preserved) but only signed-in customers’ searches are saved, scoped to them; anonymous searches are never stored. Rollback: flip the protected-route list / persistence rule (localized, test-covered). Evidence: `app/api/search/route.ts`, `middleware.ts`.
- **Durable-capable rate limiting (Upstash REST) with honest in-memory fallback** — real distributed durability when configured, zero-config dev fallback, mode reported at `/api/health`. Rollback: adapter behind one interface. Evidence: `lib/rate-limit.ts`, rate-limit tests.

_(The three original ADRs — Vercel push-to-deploy, JSONB single-table, lazy Supabase/OpenAI clients — remain in [`lib/founder/dashboard-data.ts`](../../lib/founder/dashboard-data.ts).)_

---

## Turning UNKNOWN into fact + enabling live auth (Founder / operator action)

A few minutes in each console turns these green — and switches on real customer accounts:

- **Supabase dashboard:** enable **Authentication → Email**; run `supabase/migrations/0002_auth_user_isolation.sql` in the SQL editor; note the project **region** (data location) and **plan/backup schedule** (backup location, RPO).
- **Vercel dashboard:** confirm production URL + region; optionally set `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` for durable rate limiting; record actual monthly spend.
- **OpenAI / Firecrawl billing:** record actual AI and search spend.

Once confirmed, update [`lib/founder/dashboard-data.ts`](../../lib/founder/dashboard-data.ts) and this file in the same PR.
