# EURO AI — Remediation Plan (companion to DEPLOYMENT_REALITY_AUDIT.md)

**Prepared by:** Governor · **For:** Lalit + the engineering org · **Date:** 2026-07-10
**Companion to:** [`DEPLOYMENT_REALITY_AUDIT.md`](./DEPLOYMENT_REALITY_AUDIT.md)

This turns the audit into an executable, sequenced plan. Each item lists the **exact fix**, the **files**, rough **effort**, and what it **depends on** (🟢 engineering-only · 🟡 needs a founder decision · 🔵 needs spend · 🔑 needs a secret set in Vercel). It's cross-referenced to the existing `docs/LAUNCH-BLOCKERS.md` where it confirms or extends a known blocker.

> These changes touch a live, actively-developed codebase (the DNS-### work). I have **not** applied them unilaterally — several are entangled with the ops-automation workflows and the CEIS access model, which their owners must fix with full context. This plan is the hand-off; nothing here merges without review.

---

## P0 — must close before any external user (blocks GO)

### P0-1 · Confirm deployment + RLS schema applied 🟡 (founder dashboard check)
- **Why:** all tenant isolation depends on `supabase/schema.sql` being applied; the pre-launch audit says it may never have been (extends **M-10** "deployment never verified").
- **Do:** In Supabase → Table Editor + Policies, confirm the 10 tables and their RLS policies exist. In Vercel → confirm a Production deployment + reachable URL, then run `npm run test:smoke` against it. If policies are missing, run `supabase/schema.sql` in the SQL editor.
- **Effort:** 15 min (founder) + re-run schema if needed.

### P0-2 · Authenticate the internal ops API routes 🟢/🔑 (confirms **M-05**)
Middleware (`lib/routes.ts:9-20`) only protects 6 `/api/*` prefixes; ~30 others are anonymous. Fix in two moves:
1. **Flip to default-deny for `/api/`** in `classifyRoute`: treat every `/api/*` path as `protected` **except** an explicit allowlist of truly-public ones (`/api/health`; the auth callbacks). This closes the whole class at once. *(Risk: the `dna-*` workflows curl `/api/production-health`, `/api/error-rate`, `/api/deployment-verification`, etc. — those calls will start 401'ing. Give the workflows a shared secret header (🔑 `MONITOR_TOKEN`) and check it in those specific routes, OR keep read-only monitoring GETs public and only protect mutations. Decide per route.)*
2. **Immediately lock the three worst, regardless of the above:**
   - **`PATCH /api/ceis/proposals/[id]`** (`app/api/ceis/proposals/[id]/route.ts:47`) — anonymous `approve/reject/gate`, writes to the genome; the `gate` action is unauthenticated so the "all gates passed" check is bypassable. **Recommended:** require the existing CEIS bearer secret (🔑 `CEIS_CRON_SECRET`, already used by `/api/ceis/run:19-23`) or an authenticated founder session. **Owner must confirm how the founder UI calls this** so the guard doesn't break the review flow.
   - **`POST /api/audit-trail`** (`:181`) — anonymous truncation of the audit log → require the same secret / admin.
   - **`GET /api/security-scan`, `/api/dependency-patch-automation`** — run `npm audit` (child process) per anonymous request → gate behind the monitor secret; these are for the scheduled workflows only.
- **Effort:** 0.5–1 day. No new dependencies.

### P0-3 · Pin the EU region 🟡🔵 (confirms risk **R-09**)
- **Do:** add `"regions": ["fra1"]` to `vercel.json`; confirm/relocate the Supabase project to `eu-central-1` (relocation may need a new project + data migration). Disclose in the privacy page that OpenAI/Firecrawl still process in the US.
- **Effort:** 5 min (vercel.json) + founder confirms/relocates Supabase (🔵 if relocation).

### P0-4 · Add rate limiting 🟢🔵 (confirms **M-09**; fixes a *false* self-claim)
- **Why:** none exists, yet `README.md:212` / `lib/governance-state.ts` claim "60/min/IP". Auth has no brute-force throttle.
- **Do:** add a limiter in `middleware.ts` (durable store 🔵 Upstash/Vercel KV for multi-instance; an in-memory fallback is better than nothing for Alpha) on `/api/*` and the auth POSTs. Then correct the docs/state that claim it already exists.
- **Effort:** 0.5 day + a KV store.

---

## P1 — before scaling the Beta

### P1-1 · Make monitoring & the founder dashboard truthful 🟢 (honours the team's own "Founder Trust Rule")
- **Wire real error capture:** nothing calls `recordEndpointError`/`recordEndpointSuccess` (`lib/error-rate-monitor.ts`) → call them from a shared API wrapper / `middleware`, and persist to a table (in-memory resets every serverless invocation).
- **De-fabricate:** replace `Math.random()` outcomes in `lib/deployment-verification.ts`, `app/api/multi-region-failover` (`simulateRegionMetrics`), `app/api/cost-analysis`, `lib/rollback-decision-engine.ts`, `lib/customer-communication.ts` with real signals or an explicit `status: "not-instrumented"`. Fix the stub workflows (`dns-incident-observability.yml` hardcodes `system_healthy=true, uptime=100`).
- **Label the dashboard:** `lib/governance-state.ts` returns hand-authored constants stamped `dataSource: 'Canonical Backend'`; either source them from real signals or mark each metric **Estimated** in `DataSourceLabel`. **Owner: whoever owns the governance dashboard.**

### P1-2 · Persisted, append-only tenant audit log 🟢
- Add an `audit_log` table (workspace-scoped, RLS, append-only) and write on every governance mutation (create/update of ai_systems, risk_assessments, obligations, evidence, remediation). The current `lib/audit-trail.ts` is in-memory and DevOps-only — insufficient for a compliance product.

### P1-3 · Backups + retention 🔵 + GDPR export/erasure 🟢🟡(legal)
- Enable Supabase Pro daily backups (or a `pg_dump` GitHub Action) + rehearse one restore. Build a per-workspace data-export and erasure path (rights are asserted in `app/privacy` but fulfillment is manual). Get `privacy`/`terms` counsel-reviewed (🟡).

### P1-4 · Reconcile the status docs to reality 🟢
- `LAUNCH-BLOCKERS.md`, `PRODUCT_INTEGRITY_REPORT.md`, `FOUNDER-DECISION-BRIEF.md`, `governance-state.ts` variously reference the old NewsPulse app (`/api/history`, `ADMIN_TOKEN`, "middleware rate limiter") and claim controls/deployment that don't exist, and contradict each other on whether EURO AI is "live." Bring them in line with the code so decisions rest on true status. **Owner: governance-doc maintainer** (coordinate — these are actively edited).

---

## P2 — track
- Add a **CSP** in `next.config.js` (safe subset first: `frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'`, then nonce-based `script-src`). Tighten `images.remotePatterns` off `**`.
- Shared `requireUser()` guard + a schema-validation lib (Zod) so new routes can't re-introduce P0-2.
- Fix `resolveContext` picking an arbitrary "first" workspace (`ai-systems`/`team` routes) — add a workspace selector.
- Fix the module-level mutable `requestId` singleton in `lib/request-context.ts` (IDs bleed across concurrent requests).
- Dead "Forgot password?" link (`app/auth/signin/page.tsx:126`).
- Update `CLAUDE.md` ("Next.js 14" → 16) and the stale `SUPABASE-PRODUCTION-SETUP.md` / `VERCEL_PLAN_DECISION.md`.

---

## Recommended sequence to a secured EU Alpha

```
Founder: P0-1 dashboard checks + P0-3 region + spend/legal approvals ─┐
                                                                       ├─► Eng: P0-2 auth on ops routes ─► P0-4 rate limit ─► GO for secured, low-data Alpha
                                                                       │
                                                                       └─► then P1-1 truthful monitoring/dashboard ─► P1-2 audit log ─► P1-3 backups/GDPR ─► GO to scale Beta
```

**Rough eng effort to close all P0s:** ~1 focused engineer-week, plus the founder's dashboard confirmations and spend/legal approvals. The foundation (auth + RLS) is already strong — this is finishing and verifying, not rebuilding.

*— Governor*
