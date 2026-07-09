# Cloud vs. Local — Deployment Decision Record

**Prepared by:** Governor (Founder's Chief Advisor & Chief of Staff)
**For:** Lalit (Founder)
**Date:** 2026-07-09
**Companion to:** [`DEPLOYMENT_REALITY_AUDIT.md`](./DEPLOYMENT_REALITY_AUDIT.md)
**Status:** Recommendation — awaiting your confirmation on region + demo framing

---

## The Decision in One Sentence

Develop on **local**, run August Alpha/Beta on **EU cloud**, and keep **hybrid/on-prem** on the shelf for signed enterprise customers only.

---

## Why This Is a Decision Worth Recording

"Where does it run?" looks like a technical detail. For a product whose *entire pitch is EU sovereignty*, it is a **positioning and legal decision**, not a plumbing one. Choosing the wrong region quietly makes your core marketing claim false. This document exists so that decision is made deliberately, once, and in writing.

---

## The Three Tracks

### Track 1 — Local (developer testing) · **use now, €0**

- **What:** The app runs on a developer's machine (`npm run dev`, `localhost:3000`) with test API keys.
- **Data:** Fake/throwaway only. Never real customer data.
- **When to use:** All day-to-day development, and any demo where you only need to show look-and-feel.
- **Status:** Already works. No action needed. This is the correct home for development.
- **Verdict:** ✅ Keep as-is.

### Track 2 — EU Cloud (August Alpha/Beta) · **the real launch target, modest paid spend**

- **What:** The real Aether Governor, deployed to infrastructure **pinned to an EU region**:
  - Frontend + API: Vercel, functions region set to EU (e.g. Frankfurt `fra1`).
  - Database: Supabase in an **EU region** (Frankfurt or Ireland), with backups enabled.
  - Plus: real authentication, audit logging, monitoring/alerting, durable rate limiting.
- **Data:** Real Alpha/Beta users. Must therefore be secure and EU-resident.
- **The one open question for you:** OpenAI is a **US** provider. Either (a) accept "US AI sub-processor, EU data-at-rest" and disclose it, or (b) source an EU-hosted model. This is a **business/positioning call** — I'll implement whichever you choose.
- **Blocks before this goes live:** the four P0 items in the audit (auth, lock down delete, remove anon DB access, confirm EU region + live URL).
- **Verdict:** ✅ This is where Alpha/Beta belongs. **Requires your spend approval** for paid EU tiers.

### Track 3 — Hybrid / On-Prem (regulated enterprise) · **do NOT build yet**

- **What:** Customer-controlled deployment — their own cloud tenancy or on-premises servers.
- **When:** Only when a **signed, paying enterprise customer** requires full sovereignty.
- **Why not now:** Expensive, slow, and premature. Building it before a customer pays for it burns runway on a hypothetical.
- **How to handle it in sales:** Position as "available on the Enterprise plan." Build it against a signed contract.
- **Verdict:** 🅿️ Park it. Note it in enterprise conversations; build on demand.

---

## Comparison at a Glance

| Dimension | Local | EU Cloud | Hybrid / On-Prem |
|---|---|---|---|
| Use it for | Development & UI demos | **Alpha/Beta with real users** | Enterprise with sovereignty demands |
| Real customer data? | ❌ Never | ✅ Yes (once secured) | ✅ Yes |
| EU residency | N/A | ✅ Yes (region-pinned) | ✅ Yes (customer-controlled) |
| Cost | €0 | Modest (paid tiers) | High (per deployment) |
| Build effort now | None | P0 + P1 items | Large — **defer** |
| Recommendation | ✅ Keep | ✅ **Build for August** | 🅿️ Later, on contract |

---

## Recommended Sequence

1. **Now (no spend, no code change):** You check Vercel + Supabase regions and decide the Anne/Jnani demo framing (preview-with-fake-data vs. real product). Keep all development on **local**.
2. **On your go-ahead + spend approval:** Stand up **Track 2 (EU cloud)** — pin EU region, then complete the four P0 fixes, then P1 (backups, audit log, monitoring, durable rate limit).
3. **Later, only against a signed enterprise deal:** Open **Track 3**.

---

## Founder Action Required

- [ ] Confirm the **current Vercel + Supabase regions** (dashboard look-up — I'll act on whatever you find).
- [ ] Decide the **OpenAI-in-an-EU-story** question (accept US sub-processor + disclose, or source EU model).
- [ ] Approve (or hold) **spend on EU paid tiers** so I can begin Track 2.

No technical questions for you here. No deployment has been changed. I'm ready to move the moment you confirm the above.

*— Governor*
