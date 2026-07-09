# Remediation Roadmap — Path to a Secure EU Alpha/Beta

**Prepared by:** Governor (Founder's Chief Advisor & Chief of Staff)
**For:** Lalit (Founder)
**Date:** 2026-07-09
**Companion to:** [`DEPLOYMENT_REALITY_AUDIT.md`](./DEPLOYMENT_REALITY_AUDIT.md) · [`CLOUD_LOCAL_DECISION.md`](./CLOUD_LOCAL_DECISION.md)
**Status:** Ready-to-execute plan. **No code or deployment has been changed by this document.**

---

## How to Read This

This is the "what to actually do, in what order" plan behind the audit's verdict. Every item is tagged so you can see at a glance what I can start immediately versus what needs a decision or money from you:

- 🟢 **I can do now** — pure engineering, no spend, no decision from you.
- 🟡 **Needs your decision** — a non-technical choice (framing, provider, region).
- 🔵 **Needs spend approval** — costs money on a paid tier.

Effort estimates are engineering time, not calendar time.

---

## Stage 0 — Immediate Safety (before ANY external person sees the live URL)

The preview URL is public right now. These stop the bleeding.

| # | Fix | Tag | Effort | Why it's urgent |
|---|-----|-----|--------|-----------------|
| 0.1 | Gate or remove `DELETE /api/history` (and the "Clear History" button) behind auth, or disable it entirely until auth exists | 🟢 I can do now | ~1 hr | Anyone with the link can wipe the whole database today |
| 0.2 | Remove the anonymous `insert` and reconsider anonymous `select` RLS policies in `supabase/schema.sql`; route all writes through the server's service-role key only | 🟢 I can do now | ~1 hr | The anon key ships to the browser; today it grants public read+write to the table |
| 0.3 | Add a "demo mode" env flag that seeds fake data and blocks real writes, for safe demos | 🟢 I can do now | ~2 hrs | Lets you demo to Anne/Jnani with zero real-data risk |

> **One decision gates Stage 0:** 🟡 If your Anne/Jnani demo relies on the "Clear History" button working, tell me and I'll gate it behind a simple admin check instead of removing it. Otherwise I disable it. *(This is the only reason I've held off doing 0.1 automatically — I don't want to change demo behavior without your nod.)*

---

## Stage 1 — P0: Required Before Real Users or Real Data

Maps directly to the four P0 conditions in the audit verdict.

| # | Fix | Tag | Effort | Notes |
|---|-----|-----|--------|-------|
| 1.1 | **Add real authentication** on every route (recommend Supabase Auth — it's already in the stack, EU-hostable, no new vendor) | 🟢 build / 🟡 pick provider | 1–2 days | If you prefer Clerk or another provider, that's your call; Supabase Auth is my recommendation for least friction |
| 1.2 | **Separate admin vs. normal user**; protect `/api/history` and any destructive action behind admin | 🟢 I can do now | ~0.5 day | Depends on 1.1 |
| 1.3 | **Confirm the EU region** for Vercel functions and Supabase; migrate if either is in the US | 🟡 you confirm region → 🔵 possible migration | 0.5–1 day | Blocked only on your dashboard look-up |
| 1.4 | **Confirm a live production URL** and document it | 🟡 you confirm | 15 min | Dashboard look-up |
| 1.5 | **Document the data-residency / sub-processor position** (incl. the OpenAI-is-US question) | 🟡 you decide the stance | ~0.5 day | I draft it; you approve the sovereignty claim |

---

## Stage 2 — P1: Required Before Scaling the Beta

| # | Fix | Tag | Effort | Notes |
|---|-----|-----|--------|-------|
| 2.1 | **Automated EU-region backups** with a known retention window | 🔵 needs paid Supabase tier | ~2 hrs setup | Free tier has no point-in-time backups |
| 2.2 | **Append-only audit log** (who did what, when) — a governance-product must-have | 🟢 I can do now | ~1 day | New table + write path on every mutating action |
| 2.3 | **Error tracking + uptime monitoring + alerting** (e.g. Sentry + an uptime monitor) | 🟢 build / 🔵 paid tiers optional | ~0.5 day | Free tiers exist; paid adds retention/alerting |
| 2.4 | **Durable rate limiting** (replace the in-memory limiter with Upstash/Vercel KV) | 🟢 build / 🔵 paid store | ~0.5 day | Protects your OpenAI/Firecrawl bill from abuse |

---

## Stage 3 — P2: Important, Can Follow

| # | Fix | Tag | Effort |
|---|-----|-----|--------|
| 3.1 | **Founder/admin dashboard** (usage, users, health) behind admin auth | 🟢 I can do now | 1–2 days |
| 3.2 | **Deploy + rollback runbook**; verify preview vs. production separation | 🟢 I can do now | ~0.5 day |
| 3.3 | **GDPR data-deletion path** (per-user delete/export) | 🟢 I can do now | ~1 day |
| 3.4 | Screenshots / README polish; add the missing `public/screenshots/` assets | 🟢 I can do now | ~1 hr |

---

## Critical Path to "GO"

The shortest honest route from today's 🔴 NO-GO to a defensible 🟢 GO for a secure EU Alpha/Beta:

```
You confirm region + framing  ─┐
                               ├─► Stage 0 (safety)  ─► Stage 1 (auth + EU + residency doc)  ─► GO for secured Alpha/Beta
Approve any EU paid-tier spend ─┘                                                              │
                                                                                              └─► Stage 2 (backups, audit log, monitoring) ─► GO to scale the Beta
```

**Rough engineering time:** Stage 0 ≈ half a day · Stage 1 ≈ 2–3 days · Stage 2 ≈ 2 days. Call it **~1 week of focused build** to a secured Alpha/Beta, plus your two look-ups and one spend approval.

---

## What I'm Doing vs. Waiting On You

**I can start immediately, no spend, no risk to your demo:** Stage 0.2 (lock down anonymous DB access), Stage 2.2 (audit log), Stage 3.2/3.4 (runbook, polish).

**I'm holding for your word on:**
- 🟡 The **Anne/Jnani demo framing** (preview-with-fake-data vs. real product) — this decides whether I gate or remove the Clear-History button, and whether Stage 1 is urgent.
- 🟡 The **Vercel + Supabase region** look-up.
- 🔵 **Spend approval** for EU paid tiers (backups, durable rate-limit store).

Say the word and I'll begin the 🟢 items.

*— Governor*
