# Deployment Reality Audit — NewsPulse AI / EURO AI · Aether Governor

**Prepared by:** Governor (Founder's Chief Advisor & Chief of Staff)
**For:** Lalit (Founder)
**Date:** 2026-07-09
**Scope:** August Alpha/Beta launch readiness of the code in this repository
**Evidence basis:** Direct inspection of every file in `mininglife7-dev/newspulse-ai` on branch `main`. Claims are labelled **Verified** (I read the code), **Unknown** (requires you to log into a dashboard — not a technical question), or **Estimated** (my professional judgement).

---

## Executive Summary

You asked a fair and important question: *what should be deployed, what actually is deployed, and is this stack right for a EU-sovereignty-positioned launch?* Here is the blunt truth.

**This repository is a hackathon news-search demo — not the EURO AI / Aether Governor product.** It searches the web for a keyword, summarises articles with OpenAI, and saves the searches to a database. It was "Built for the Outskill AI Generalist Accelerator Hackathon" (its own README says so). It is well-built for what it is, but it is missing every enterprise control an EU-sovereign governance product needs: **there is no login, no user accounts, no audit log, no backups, no monitoring, and no EU data-residency guarantee.** The database can be read *and wiped* by anyone who can reach the URL.

Separately, **I cannot confirm from code alone that anything is actually live.** The project is *configured* to deploy to Vercel, but whether a production URL exists, whether the database is running, and which country the data sits in are things only you can see by logging into the Vercel and Supabase dashboards. Those are 5-minute look-ups, not engineering work.

**My recommendation:** Do **not** present this repository as the EURO AI / Aether Governor Alpha/Beta. Use it, if you wish, as a UI/technology demo only — never with real customer or governance data. For the actual Aether Governor Alpha/Beta, we build on an **EU-region cloud** with real authentication, audit logging, and backups before anyone outside the team touches it. Details and the full go/no-go are below.

---

## Part 1 — What SHOULD Be Deployed for August Alpha/Beta

For a product positioned around **EU AI governance and sovereignty**, "Alpha/Beta with real users" is not the same as "hackathon demo." Even a small, invite-only Beta that touches real people or real governance data needs the following. This is the target we measure reality against.

| # | Component | What a EU-sovereign Alpha/Beta requires |
|---|-----------|------------------------------------------|
| 1 | **Frontend** | A real, reachable web app on a stable URL, HTTPS, on infrastructure whose region you can name. |
| 2 | **Backend / API** | Server endpoints that are authenticated — not open to the public internet — with input validation and rate limiting that survives restarts. |
| 3 | **Database** | A managed database **in an EU region**, with Row-Level Security actually enforced (not bypassed), and no anonymous read/write. |
| 4 | **Authentication** | Real login. Every user identified. Admin vs. normal user separated. No unauthenticated access to any data. |
| 5 | **Audit logs** | An immutable record of *who did what, when* — a hard requirement for any governance/compliance product. Not console print-outs. |
| 6 | **Backups** | Automated, tested, point-in-time database backups with a known retention window, stored in the EU. |
| 7 | **Monitoring** | Uptime checks, error tracking (e.g. Sentry), and alerting so you know something broke before a customer tells you. |
| 8 | **Deployment pipeline** | Automated build → test → deploy, with the ability to roll back, and separate preview vs. production environments. |
| 9 | **EU data residency / sovereignty** | A *documented, verifiable* statement of which country every byte of customer data lives in, which sub-processors touch it, and a defensible position on US-based AI providers. |
| 10 | **Security controls** | Secrets management, HTTPS everywhere, dependency scanning, no anonymous data access, a documented data-deletion path (GDPR). |
| 11 | **Admin / Founder dashboard** | A private view for you to see usage, users, and system health — behind admin authentication. |

---

## Part 2 — What Is ACTUALLY Deployed Now

### 2a. In the code (Verified — I read every file)

| Question | Answer | Evidence |
|----------|--------|----------|
| Is there a working app? | **Yes**, a Next.js 14 app with a search page, history pages, and 4 API routes. | `app/` tree, `app/api/*` |
| Frontend | Next.js + Tailwind, polished dark UI. | `app/page.tsx`, `components/` |
| Backend / API | `POST /api/search`, `GET/DELETE /api/history`, `GET /api/health`. | `app/api/*/route.ts` |
| Database schema | One table, `news_searches`, storing keyword + results JSON. | `supabase/schema.sql` |
| **Authentication** | **NONE.** There is no login anywhere. No user accounts. Every API route is open to the public internet. | No auth code in `app/`, `lib/`, or `middleware.ts` |
| **`/api/history` protection** | **NONE.** Anyone who reaches the URL can list *all* saved searches — and `DELETE /api/history` **wipes the entire database** with no authentication. | `app/api/history/route.ts` |
| Database access control | RLS is enabled but policies allow **anonymous read AND anonymous insert**; the server uses the service-role key which **bypasses RLS entirely**. | `supabase/schema.sql` (`Allow anon read access`, `Allow anon insert`) |
| **Audit logs** | **NONE.** Only `console.error` / `console.log` to ephemeral server logs. No who-did-what record. | grep across repo: no audit table, no logging library |
| **Backups** | **NONE configured in code.** Any backup would depend on the Supabase plan's default, which is not set or documented here. | No backup config anywhere |
| **Monitoring** | **Minimal.** A `/api/health` endpoint exists (reports which API keys are present), but there is no error tracking, uptime monitor, or alerting wired up. | `app/api/health/route.ts`; no Sentry/Datadog/etc. |
| Rate limiting | Present but **in-memory only** — resets on every serverless cold start, so it is easily bypassed and not reliable. | `middleware.ts` (comment: "fine for hackathon scale") |
| **Admin / Founder dashboard** | **NONE.** | No admin route exists |
| Deployment pipeline | CI runs lint + type-check + build on every push/PR. A previous GitHub Actions **deploy** workflow was deliberately **removed**; deployment now relies entirely on Vercel's Git integration. | `.github/workflows/ci.yml`; commit `4f9ad97` |
| Secrets handling | Correct — secrets are env-vars, not committed; `.env*.local` is git-ignored; there's an env-check script. | `.gitignore`, `scripts/check-env.mjs` |

### 2b. Live infrastructure (Unknown — only you can confirm, by logging in)

I want to be honest rather than guess. The following **cannot be verified from the repository** and require you to open two dashboards and look. **None of these are technical questions** — you just log in and read what's on screen:

| Question | Status | How to confirm (5 minutes each) |
|----------|--------|----------------------------------|
| Is there a live **production URL**? | **Unknown** | Vercel dashboard → the project → "Domains" / "Deployments". If you see a `*.vercel.app` URL marked "Production", it's live. |
| Is it only a **Vercel preview**, or real production? | **Unknown** | Same screen — preview deployments are tied to PRs; production is the `main` deployment. |
| Is the **backend live**? | **Unknown** (backend ships *with* the frontend on Vercel — if the URL loads, the API is live) | Visit `<your-url>/api/health` in a browser. |
| Is the **database live**? | **Unknown** | Supabase dashboard → is there a project, is it "Active" (free-tier projects pause after inactivity)? |
| Is **auth** live or mocked? | **Verified: neither — it does not exist.** | (No dashboard needed — there is no auth in the code.) |
| Are **logs** live or file-only? | **Verified: ephemeral console logs only.** | Vercel → project → "Logs" shows runtime console output; nothing is persisted or audit-grade. |
| Are **backups** live or missing? | **Unknown / Estimated missing** | Supabase → Database → Backups. Free tier = **no** point-in-time backups. |
| Is **monitoring** live or missing? | **Verified: missing** beyond the health endpoint. | No monitor is configured in code or repo. |
| **Cloud provider & region** | **Unknown — this is the single most important thing to check** | Vercel → project → Functions region. Supabase → project → region. If either says a US region, you have **no EU residency**. |

**Estimated default (my judgement):** Unless someone deliberately chose otherwise, Vercel functions default to a US region and Supabase's default region is typically US (`us-east`). **So the working assumption until proven otherwise is: customer search data is currently stored in the United States, processed by OpenAI in the United States, with no EU residency and no backups.** For a EU-sovereignty product, that is the headline risk.

---

## Part 3 — Verdict Table

Priorities: **P0** = must fix before *any* external person sees it. **P1** = must fix before real customers/data. **P2** = important, can follow.

| Required component | Current status | Gap | Risk | Fix required | Owner | Priority |
|---|---|---|---|---|---|---|
| Authentication | **None** | No login on any route | Anyone can use the API and read all data; no user identity | Add real auth (e.g. Supabase Auth / Clerk) gating every route | Eng | **P0** |
| `/api/history` DELETE open | **Unprotected** | No auth on destructive endpoint | **Anyone can wipe the entire database** with one request | Require admin auth; remove anon access | Eng | **P0** |
| Anonymous DB read/insert | **Enabled** | RLS policies allow `anon` read + insert | Public can read/write the table directly via the anon key (which ships to the browser) | Remove anon policies; server-only writes | Eng | **P0** |
| EU data residency | **Unknown / likely US** | Region not pinned or documented | Contradicts EU-sovereignty positioning; potential GDPR exposure | Confirm regions; move to EU; document data map | Founder + Eng | **P0** |
| Audit logs | **None** | No who-did-what record | Fails basic governance/compliance expectation | Add an append-only audit log table | Eng | **P1** |
| Backups | **None / unknown** | No automated PITR backups | Data loss is unrecoverable | Enable EU-region backups (paid plan) | Founder (spend) + Eng | **P1** |
| Monitoring & alerting | **Health endpoint only** | No error tracking / uptime alerts | You learn of outages from customers | Add Sentry + uptime monitor | Eng | **P1** |
| Rate limiting | **In-memory, resets** | Not durable across cold starts | Abuse / cost-runaway on the OpenAI & Firecrawl bills | Move to durable store (Upstash/Vercel KV) | Eng | **P1** |
| Admin / Founder dashboard | **None** | No private ops view | No visibility into usage/health | Build a minimal admin view behind auth | Eng | **P2** |
| Deployment pipeline | **Partial** | CI tests, but deploy is dashboard-managed; no rollback runbook | Silent deploy failures; unclear rollback | Document deploy + rollback; verify Vercel link | Eng | **P2** |
| Live production URL | **Unknown** | Can't confirm from code | May not actually be reachable | You confirm in Vercel dashboard | Founder | **P1** |
| Secrets management | **Good** | — | Low | Keep rotating keys; already git-ignored | Eng | ✅ OK |
| Product-fit of the app itself | **Mismatch** | This is a news demo, not Aether Governor | Presenting it *as* the product misleads stakeholders | Decide: demo-only vs. build the real product | **Founder** | **P0 (decision)** |

---

## Part 4 — Recommended Deployment Strategy

I recommend a **three-track** approach. This is the standard, safe path for a product that starts as a demo and grows into a regulated-enterprise offering.

1. **Local — for developer testing.**
   Keep running on `localhost` with test keys for all day-to-day development. No customer data ever. This is already how the repo works and it's correct. **Cost: €0.**

2. **EU cloud — for August Alpha/Beta (the real target).**
   Deploy the *real* Aether Governor to an **EU region**: frontend + backend on Vercel with functions pinned to an EU region (e.g. Frankfurt `fra1`), database on Supabase in an **EU region** (Frankfurt/Ireland), backups enabled, real authentication, audit logging, and monitoring. Document a data-residency statement. This is where Alpha/Beta users go. This is the track that makes the "EU sovereignty" claim honest. **Cost: modest paid tiers — requires your approval to spend.**

3. **Hybrid / on-prem — later, for regulated enterprise customers.**
   When you sign enterprise customers who demand full data sovereignty (their own cloud tenancy, or on-premises), offer a self-hosted deployment. **Do not build this now** — it is expensive and premature. Note it in the sales conversation as "available on the enterprise plan" and build it when a signed customer pays for it.

The key decision this forces: **track 2 requires choosing whether OpenAI (a US provider) is acceptable in your EU-sovereignty story, or whether you need an EU-hosted model.** That is a business/positioning decision for you — I flag it, I don't decide it.

---

## Part 5 — Plain-Language Explanation (No Jargon)

**What we have now.**
A good-looking demo app that searches the news and writes AI summaries. It's the kind of thing you'd show to prove "we can build slick AI products." It is **not** the EURO AI / Aether Governor product, and it has no security around its data.

**What customers will see.**
If the demo is live, they'd see a working news-search website. It looks finished. That polish is genuinely an asset — but it hides the fact that there's nothing protecting the data behind it.

**What is safe.**
- Running it on your own laptop for testing.
- Showing the *look and feel* as a technology demo, with fake/throwaway data only.
- The code quality itself — it's clean and professionally written.

**What is NOT yet safe.**
- Putting **any real person's data** into it. There is no login, so anyone with the link can read everything and can **delete the entire database with a single click-equivalent request.**
- Claiming **EU data sovereignty.** Until you check the dashboards, we must assume the data is sitting in the United States with no backups.
- Calling it "Aether Governor Alpha/Beta." It is a different, simpler app.

**What must be fixed before the Anne / Jnani demo.**
If Anne/Jnani are seeing a *demo of the UI and vision*: use **local or a throwaway instance with fake data only**, and be clear it's a technology preview — you can demo safely **this week** with no engineering changes.
If Anne/Jnani expect the *real, secure Aether Governor product with their data*: it is **not ready**, and the P0 items (login, lock down the delete endpoint, remove anonymous database access, confirm/​move to EU region) must be done first. That is roughly a **1–2 week focused build**, and it needs your go-ahead to spend on paid EU hosting tiers.

**What can wait.**
The founder admin dashboard, the durable rate-limiter, the on-prem/enterprise option, and screenshots/polish. Important, but not blockers for a first secure Beta.

---

## Part 6 — What I Need From You (Founder Action Required)

I will **not** ask you technical questions, and I have **not** changed any deployment. Two things only you can do, both non-technical:

1. **Log into Vercel and Supabase and tell me one thing each:** does a Production URL exist, and **what region** does each say? (This resolves every "Unknown" in Part 2b.) If you'd rather, grant access and I'll read it directly.
2. **Decide the framing of the Anne/Jnani demo:** *technology preview with fake data* (safe now) or *real product with their data* (needs the P0 build + spend approval first)?

Everything else — the P0/P1 engineering fixes — I can begin the moment you confirm this repo is meant to become the real product and approve any spend involved.

---

## Final Verdict

> ## 🟡 GO WITH CONDITIONS — for a **technology-preview demo with fake data, on local or a throwaway instance.**
> ## 🔴 NO-GO — for an **August Alpha/Beta that touches real users or real data, or that claims EU sovereignty**, until the four P0 conditions are met:
> 1. **Add real authentication** on every route.
> 2. **Lock down `DELETE /api/history`** and remove anonymous database access.
> 3. **Confirm and move data to an EU region** (or document why not).
> 4. **Confirm a live, reachable production URL** (your dashboard check).
>
> Meet those four, add backups + audit logs + monitoring (P1), and this becomes a defensible **GO** for a secure EU Alpha/Beta.

*— Governor*
