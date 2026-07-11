# Deployment Reality Audit — EURO AI (Aether Governor) · August Alpha/Beta

**Prepared by:** Governor (Founder's Chief Advisor & Chief of Staff)
**For:** Lalit (Founder)
**Date:** 2026-07-10
**Product audited:** EURO AI — the EU AI Act governance platform on `main` (Next.js 16.2.10 / React 19, Supabase, Vercel). This supersedes an earlier draft that mistakenly audited the original NewsPulse scaffold; that scaffold has been replaced by this product.
**Method:** Read-only inspection of the real codebase on `main` by four parallel audit passes (deployment, auth/security, database/RLS, monitoring/ops), cross-checked against the team's own docs. Claims are labelled **Verified** (read in code, with file evidence), **Unknown** (only confirmable in the Vercel/Supabase dashboards — not a technical question), or **Estimated** (my judgement).

> **Post-audit verification addendum (2026-07-11).** This audit was taken at `main` commit `31717ae` (Next 16.2.10). `main` is under **very active parallel development** (many concurrent Governor sessions; dozens of `DNA-GOV-*` commits/day) and has since advanced — it is now on **Next.js 15.5.20 LTS**. Two facts re-verified against the *latest* `main`:
> - **Tests: 295 passing across 23 files** (`npm test`, green). This corrects the stale doc claims of "86" and "178 tests" — the suite is larger and green than the docs say.
> - **`npm audit`: 7 vulnerabilities (1 critical, 1 high, 5 moderate) — but the critical and high are in the DEV/TEST toolchain, not production runtime.** The "critical" is `vitest`'s UI-server arbitrary-file-read and the "high" is `vite`'s dev-server path traversal — tools that run only when executing tests locally, never in CI-build or the deployed app. The only build-relevant item is a **moderate PostCSS XSS** (unescaped `</style>` in CSS stringify). So the deployed app is **not** exposed to the scary-sounding ones; the fix is a breaking `vitest@4` dev-dependency bump (low urgency), deliberately **not** applied here to avoid conflicting with the heavy parallel work on `package.json`.

---

## Executive Summary

You asked a fair question: *what should be deployed, what actually is, and is the stack right for a EU-sovereignty launch?* Here is the honest answer for the **real** EURO AI product.

**The core of this product is genuinely well-built.** Authentication is real (Supabase Auth, email confirmation, JWT validated server-side in middleware). The multi-tenant data model is the strongest part of the codebase — Row-Level Security is enabled on every customer table and correctly scopes every row to the caller's workspace, and the powerful "service-role" key is quarantined to an internal subsystem where customer data can't reach it. Running on Next.js 16 also closes a serious middleware-auth-bypass vulnerability that the older stack had. **This is not a hollow demo — the compliance product exists and its security spine is sound.**

**But three things make it NOT ready for real EU customers yet, and one of them is about trust in our own numbers:**

1. **We cannot confirm anything is actually live and correctly configured.** The single most repeated item in your own team's notes is *"production deployment never verified,"* and the entire isolation model depends on a database schema that the team's own pre-launch audit says *was never deployed to the live database.* If that schema isn't applied, tenant isolation quietly collapses. This is verifiable only by logging into Supabase and Vercel — a 15-minute check, not engineering work.

2. **The EU-sovereignty promise is not configured.** The landing page says *"EU AI Act compliant from day one"* and *"Built for Europe,"* but **no EU region is pinned anywhere in the code** — serverless functions default to the US, and the Supabase region is unconfirmed. For a product whose entire pitch is EU governance, this is the headline gap (your own risk register already logs it as R-09, "EU sovereignty 1/10").

3. **Our own monitoring and founder dashboard report health they cannot actually see.** The error-rate monitor has no code feeding it, so it *always* reads "0 errors, healthy." One workflow emits "100% uptime, healthy" as a hardcoded constant. The founder governance dashboard's launch-readiness scores are **hand-authored numbers labelled "Canonical Backend."** This directly violates the "Founder Trust Rule" your own integrity reports established: *never show a number you can't verify.* You are, right now, partly flying on instruments that are painted on.

**My recommendation:** Treat EURO AI as a **strong Alpha candidate that is a focused week of work — plus a few dashboard confirmations from you — away from a safe, invite-only EU Beta.** Do not open it to real customers, and do not repeat the "EU compliant from day one / companies across Europe trust us" claims, until the P0 items below are closed. Details and the go/no-go are below.

---

## Part 1 — What SHOULD Be Deployed for August Alpha/Beta

For a **multi-tenant EU AI Act compliance product** handling customers' governance data, an invite-only Alpha/Beta needs:

| # | Component | Requirement |
|---|-----------|-------------|
| 1 | **Frontend** | Reachable HTTPS app on a stable URL, EU-region hosting. |
| 2 | **Backend / API** | Every route either public-by-design or authenticated; no unauthenticated route that mutates data or bypasses tenant security. |
| 3 | **Database** | Managed Postgres **in an EU region**, RLS enforced on every tenant table, schema actually applied to the live project. |
| 4 | **Authentication** | Real login, server-validated sessions, email confirmation required, brute-force protection. |
| 5 | **Audit logs** | Persisted, append-only record of *who changed which governance record, when* — a core expectation of a compliance tool. |
| 6 | **Backups** | Automated EU-region backups + one rehearsed restore; a written retention policy. |
| 7 | **Monitoring** | Real uptime + error alerting that reflects actual production state (not self-generated data). |
| 8 | **Deployment pipeline** | CI gate → deploy → verify → rollback path, with preview vs. production separation. |
| 9 | **EU residency / sovereignty** | Documented, verifiable region for every byte of customer data; DPAs signed; US sub-processors (OpenAI/Firecrawl) disclosed. |
| 10 | **Security controls** | Rate limiting, CSP, input validation, secrets server-only, dependency scanning. |
| 11 | **Admin / founder dashboard** | A private status view that clearly labels real vs. estimated data. |

---

## Part 2 — What Is ACTUALLY There

### 2a. Verified strengths (read in code)

- **Real authentication.** Supabase email/password + confirmation; middleware validates the JWT with `getUser()` (not the unsafe `getSession()`) and protects paths — `middleware.ts:43-50`, `app/auth/*`. On **Next 16.2.10**, closing CVE-2025-29927 (the Next 14 middleware-auth bypass your `LAUNCH-BLOCKERS.md` flagged).
- **Excellent multi-tenant RLS.** RLS enabled on all 10 customer tables, every policy scoped to active workspace membership, no `USING (true)` / anon holes; RLS-recursion handled via `SECURITY DEFINER` helpers — `supabase/schema.sql:252-514`. Customer API routes run as the signed-in user (RLS on) **and** add app-layer `workspace_id` checks (defense in depth).
- **Service-role key contained.** The RLS-bypassing admin key is used **only** inside the internal CEIS subsystem on its own `ceis_*` tables — never on any customer table (verified: zero admin-client callers under customer routes).
- **Real customer dashboard.** `app/dashboard/page.tsx` reads the signed-in user's actual workspace/AI-system/assessment counts from Supabase — honest.
- **One real monitor.** `lib/production-monitoring.ts` genuinely probes `/`, `/auth/signup`, `/api/health` and measures real latency.
- **Good hygiene.** Security headers (`nosniff`, `X-Frame-Options: DENY`, referrer, permissions-policy) in `next.config.js`; no secrets committed; `.env*.local` git-ignored; comprehensive CI (lint, type-check, test, build, smoke, E2E); daily `npm audit` workflow.

### 2b. Verified problems (read in code)

- **~30 unauthenticated internal ops API routes.** Middleware only protects 6 API prefixes (`lib/routes.ts:9-20`); the rest pass through as public. The dangerous ones: **`PATCH /api/ceis/proposals/[id]`** ("founder approve/reject/gate") writes via the **service-role key (RLS bypass) with zero auth** — anyone on the internet can approve or reject the system's self-evolution proposals; **`POST /api/audit-trail`** truncates the audit log unauthenticated; **`/api/security-scan`** and **`/api/dependency-patch-automation`** run `npm audit` (a child process) on every anonymous request (DoS + info disclosure).
- **No rate limiting exists anywhere** — yet `README.md`, `GO-NO-GO-REPORT.md`, and the app's own `lib/governance-state.ts` **self-attest "Rate limits on all API routes (60/min/IP)."** A fictional control. Sign-in has no brute-force throttle.
- **No EU region pinned.** `vercel.json` has no `regions` key → functions default to US (`iad1`); Supabase region unconfirmed. The privacy page's "EU-region hosting is available" is aspirational, not enforced.
- **Monitoring reports health it can't see.** `lib/error-rate-monitor.ts` has **zero callers** feeding it → `/api/error-rate` always returns "0 errors, healthy." `dns-incident-observability.yml` emits hardcoded `system_healthy=true, uptime=100`. `multi-region-failover`, `deployment-verification`, `cost-analysis`, `rollback` produce `Math.random()` outcomes. "Deployment recovery" never actually calls Vercel to roll back.
- **Founder governance dashboard shows hand-authored constants as "Canonical Backend."** `lib/governance-state.ts` (819 lines) hardcodes every blocker, mission, and category score; the launch-readiness % is computed from those constants; the data-source label doesn't distinguish real from estimated.
- **Audit trail is in-memory and DevOps-only.** `lib/audit-trail.ts` stores entries in a process array that resets on every serverless invocation, and only logs deployments/rollbacks — **there is no persisted, append-only audit of tenant governance actions.** For a compliance product this is a Beta-level gap.
- **No backups/retention automation; no GDPR export/erasure path; legal pages are DRAFT** (`app/privacy`, `app/terms` marked "Pending legal review"); **no CSP** in the headers.

### 2c. Unknown — only you can confirm (dashboard look-ups, ~15 min total)

| Question | Why it's critical | Where to look |
|----------|-------------------|---------------|
| **Is the app actually deployed & is a production URL live?** | Your own docs say deployment was never verified | Vercel → Deployments |
| **Is `schema.sql` (tables + RLS) applied to the live Supabase DB?** | If not, tenant isolation does not exist in production | Supabase → Table Editor / Policies |
| **What region is Vercel? What region is Supabase?** | The entire EU-sovereignty claim | Vercel → Functions region; Supabase → project region |
| **Is email confirmation required? Password/leaked-password protection on?** | Otherwise unverified accounts get live sessions | Supabase → Auth settings |
| **Is `SUPABASE_SERVICE_ROLE_KEY` server-only (never `NEXT_PUBLIC_`)?** | A public service-role key = total data exposure | Vercel → Env vars |
| **Backups: Free tier (none) or Pro (daily/PITR)? DPAs signed?** | Data-loss & GDPR posture | Supabase → Backups; contracts |

**Estimated default until confirmed:** US region, Free-tier (no backups), schema-deployment unverified. Treat the EU-sovereignty and durability claims as **not yet true** until you check.

### 2d. Runtime verification — I ran the app and captured what it actually returns

To move the most important claims from "read in code" to "observed," I built and started the real app locally (Next 16 production build) and called the endpoints. Actual responses:

- **`GET /api/error-rate`** → `{"ok":true,"status":"healthy","alert":"✅ Error rate normal: 0 errors across 0 endpoints","summary":{"totalEndpoints":0,"totalErrors":0}}`. It reports **healthy because nothing feeds it** — a real error surge would still read green.
- **`GET /api/multi-region-failover`** → `{"overallStatus":"critical","criticalRegions":["us-east","eu-west"],"affectedUsers":11173,"failoverTriggered":true,...}`. It **fabricates a CRITICAL multi-region outage affecting 11,173 users and an active failover** — across regions the app doesn't run in. Pure invention, and it's screaming red.
- **`GET /api/cost-analysis`** → `{"estimatedMonthlyVercel":680.67,"estimatedMonthlySupabase":1147.96,"totalMonthlyEstimate":1828.63,"dbSizeGB":3.46,"realtimeUsage":8978,...}`. A **fabricated ~$1,829/month** cloud-spend estimate presented as real.
- **`PATCH /api/ceis/proposals/<id>` sent anonymously** → **HTTP 404 "Proposal not found"** (not 401). The endpoint **accepted the unauthenticated mutation** and only failed because the id was fake — **a real proposal id would have been approved/rejected/mutated by an anonymous caller.** The P0 auth hole, proven live.

This is the "flying on painted instruments" point made concrete: the system simultaneously reports "0 errors / healthy" **and** "CRITICAL / 11,173 users affected," and neither number is real. Build/lint/type-check/test all pass — the code is *well-formed*; the problem is that several endpoints report **fiction**, and one accepts **anonymous writes**.

---

## Part 3 — Verdict Table

P0 = blocks any external user. P1 = before scaling the Beta. P2 = important, can follow.

| Required component | Current status | Gap | Risk | Fix | Owner | Priority |
|---|---|---|---|---|---|---|
| Live deployment verified | **Unknown** | Never confirmed | Nothing may actually be running | Confirm prod URL + smoke test | Founder | **P0** |
| RLS schema applied to live DB | **Unknown** | Self-audit says not deployed | Tenant isolation collapses if unapplied | Run `schema.sql`; verify policies | Founder + Eng | **P0** |
| Unauthenticated ops routes | **Open (Verified)** | ~30 routes unauth; one writes via service-role | Anyone can approve self-evolution, wipe audit log, DoS | Protect `/api/*` by default; allowlist public | Eng | **P0** |
| Rate limiting | **Absent (Verified)** | None, despite claims | Credential-stuffing on auth; DoS | Add limiter (Upstash/Vercel KV) | Eng | **P0** |
| EU region | **Not pinned (Verified)** | No `regions` in `vercel.json`; DB region unknown | Core EU-sovereignty claim untrue | Pin `fra1`; confirm Supabase `eu-central-1` | Founder + Eng | **P0** |
| Monitoring truthfulness | **Fabricated (Verified)** | Reports "healthy" it can't see | Real outage shows green; false confidence | Wire real error capture; fix stub workflows | Eng | **P1** |
| Founder dashboard truthfulness | **Hardcoded (Verified)** | Constants labelled "Canonical Backend" | You can't trust your own status view | Label Verified/Estimated; source real data | Eng | **P1** |
| Tenant audit log | **Ephemeral/DevOps-only (Verified)** | No persisted governance audit | Compliance-tool expectation unmet | Add `audit_log` table + write path | Eng | **P1** |
| Backups & retention | **None in repo (Verified)** | No automation, no restore rehearsed | Unrecoverable data loss | Enable EU backups; rehearse restore | Founder (spend) + Eng | **P1** |
| GDPR export/erasure + legal | **Draft / manual (Verified)** | No self-service path; legal DRAFT | GDPR obligation; legal exposure | Build export/erase; counsel-review legal | Founder (legal) + Eng | **P1** |
| CSP | **Absent (Verified)** | No script/style policy | XSS blast radius uncapped | Add CSP | Eng | **P2** |
| Doc/dashboard integrity | **Contradictory (Verified)** | Docs disagree; claim controls that don't exist | Decisions made on false status | Reconcile docs to code reality | Eng | **P1** |
| Auth / RLS design | **Strong (Verified)** | — | Low | Keep; verify deployed | ✅ | OK |

---

## Part 4 — Recommended Deployment Strategy

Same three-track shape as before, now concrete for EURO AI:

1. **Local — developer testing.** Keep as-is. €0.
2. **EU cloud — August Alpha/Beta (the target).** Pin Vercel functions to **Frankfurt (`fra1`)**, confirm/relocate Supabase to **`eu-central-1`**, apply the schema, then close the P0s (authenticate ops routes, add rate limiting) and the residency P1s (backups, real monitoring, persisted audit log, DPAs). Disclose that OpenAI/Firecrawl still process in the US. **Modest paid tiers — needs your spend approval.** Your own `CLOUD_DEPLOYMENT_BLUEPRINT.md` already specifies most of this; the gap is execution, not design.
3. **Hybrid / on-prem — regulated enterprise.** Park until a signed enterprise customer requires it.

---

## Part 5 — Plain-Language Explanation (No Jargon)

**What we have now.** A real, well-engineered AI-governance product. The login, the per-customer data walls, and the core screens are genuinely solid — better than most early startups. This is not vaporware.

**What customers will see.** A polished SaaS that says "EU AI Act compliant from day one," "Enterprise Grade," and "companies across Europe trust EURO AI." It looks finished and trustworthy.

**What is safe.** The way customer data is separated between companies (assuming the database schema is actually switched on in production — please confirm). The login system. The code quality.

**What is NOT yet safe.**
- We **can't prove it's even running correctly** — deployment was never verified, and the data-separation rules may not be switched on in the live database.
- A handful of **internal control panels have no lock on the door** — including one where a stranger could approve or reject the system's own self-improvement decisions.
- The **"EU / Europe" promise isn't wired up** — the data most likely sits in the US right now.
- Our **own dashboards are telling us "all healthy" without actually looking** — if something broke, we might not know.

**What must be fixed before the Anne / Jnani demo.** If it's a *vision/UI demo with fake data*: safe **this week** — just present it on a throwaway instance and don't make live "we're EU-compliant / we have customers" claims. If they expect the *real product with their data*: **not yet** — close the four P0s first (confirm deploy + schema, lock the internal doors, turn on EU region, add basic rate limiting). That's roughly a **focused week** plus your dashboard confirmations.

**What can wait.** The persisted audit log, real monitoring wiring, GDPR self-service, CSP, and the founder-dashboard truthfulness cleanup — important for scaling the Beta, not blockers for a first invite-only, low-data Alpha.

**One thing I owe you plainly:** several of your existing status documents contradict each other (one says "live on Vercel, production-ready," another says "the product doesn't exist"), and the founder dashboard shows hand-typed numbers as if they were live. **Until we fix that, don't trust the green lights — trust the dashboard confirmations you do yourself.** Your own team already wrote the right rule for this ("never show a number you can't verify"); we're not living up to it yet.

---

## Part 6 — Founder Action Required (all non-technical)

1. **Log into Vercel + Supabase and confirm four things:** is there a live production URL; is the database schema applied (any policies listed); what region is each; is the service-role key server-only. This resolves every P0 "Unknown."
2. **Decide the Anne/Jnani framing:** fake-data vision demo (safe now) vs. real product with their data (needs the P0 week first).
3. **Approve or hold spend** on EU paid tiers (Supabase Pro for backups + EU region, a rate-limit store).
4. **Legal:** get `privacy`/`terms` reviewed by counsel before any real EU user, and confirm DPAs.

Everything else — authenticating the ops routes, adding rate limiting, pinning `fra1`, wiring real monitoring, the persisted audit log — I can begin the moment you approve.

---

## Final Verdict

> ## 🟡 GO WITH CONDITIONS — for an internal / fake-data **vision demo** (throwaway instance, no live compliance claims). Safe this week.
> ## 🔴 NO-GO — for an **August Alpha/Beta with real customer data, or any public "EU-compliant / trusted by European companies" claim**, until these P0s are met:
> 1. **Confirm the app is deployed and the RLS schema is applied** to the live DB (your dashboard check).
> 2. **Authenticate the internal ops routes** — especially the service-role-writing `PATCH /api/ceis/proposals/[id]`, the audit-log truncation, and the `npm audit` endpoints.
> 3. **Pin the EU region** (Vercel `fra1` + confirmed Supabase `eu-central-1`).
> 4. **Add rate limiting** on auth and public endpoints.
>
> Close those four, then the P1s (real monitoring, persisted audit log, backups, GDPR path, doc/dashboard truthfulness), and EURO AI becomes a defensible **GO** for a secured EU Alpha/Beta. **The foundation is strong; the gap is verification, honesty of our own instruments, and finishing the EU-residency wiring — not a rebuild.**

*— Governor*
