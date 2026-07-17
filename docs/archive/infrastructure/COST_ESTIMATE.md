# Infrastructure Cost Estimate — NewsPulse AI (EURO AI / Cathedral)

> ⚠️ **SUPERSEDED — historical record (2026-07-09).** These costs model the **pre-pivot NewsPulse AI** app (Firecrawl + OpenAI `gpt-4o-mini` per search). The repository has since pivoted to the **EURO AI / Cathedral** EU AI Act governance platform, whose cost drivers differ. Treat the figures below as a **historical baseline**, not current pricing.
>
> **Current cost/plan decisions:** [`../VERCEL_PLAN_DECISION.md`](../VERCEL_PLAN_DECISION.md) · [`CATHEDRAL-PRODUCTION-READINESS.md`](./CATHEDRAL-PRODUCTION-READINESS.md) · [`../GO-NO-GO-REPORT.md`](../GO-NO-GO-REPORT.md)

**Date:** 2026-07-09 · Currency mixed $/€ as billed by providers; treat as ≈ equivalent.
**Disclaimer:** list prices as of the review date from public pricing pages; verify before purchase — providers change tiers. Nothing in this plan requires spending money before the founder approves it.

---

## Tier A — Founder Demo (target: €0 fixed)

| Item                | Plan                                                   |      Monthly |
| ------------------- | ------------------------------------------------------ | -----------: |
| Vercel              | Hobby (non-commercial demos)                           |           €0 |
| Supabase            | Free, eu-central-1                                     |           €0 |
| UptimeRobot         | Free (50 monitors, 5-min)                              |           €0 |
| GitHub              | Free (Actions minutes within free tier)                |           €0 |
| Backups             | GitHub Action `pg_dump` artifact                       |           €0 |
| Password manager    | Bitwarden Free                                         |           €0 |
| **Fixed subtotal**  |                                                        |       **€0** |
| OpenAI usage        | see model below                                        |        ~€1–5 |
| Firecrawl usage     | Free tier 500 credits ≈ 50 searches; then Hobby $16/mo |        €0–16 |
| **Realistic total** |                                                        | **€0–20/mo** |

## Tier B — Alpha/Beta Pilot (target: ≤ €75)

| Item                      | Plan                                  |         Monthly |
| ------------------------- | ------------------------------------- | --------------: |
| Vercel                    | Pro (1 seat)                          |            ~$20 |
| Supabase                  | Pro (daily backups, no pausing, Auth) |             $25 |
| Supabase staging          | Free project #2                       |              €0 |
| Upstash Redis             | Free tier → pay-as-you-go             |           €0–10 |
| Hetzner Object Storage    | offsite backups                       |             ~€5 |
| Sentry                    | Developer (free)                      |              €0 |
| UptimeRobot / BetterStack | Free                                  |              €0 |
| **Fixed subtotal**        |                                       |     **~€50–60** |
| OpenAI usage (pilots)     | ~500–2,000 searches/mo                |          ~€2–10 |
| Firecrawl                 | Hobby/Standard                        |          $16–83 |
| **Realistic total**       |                                       | **~€70–150/mo** |

## Tier C — Paid Customers

**Path 1 (managed):** Tier B + Supabase PITR add-on (~$100) + log retention + status page → **~€150–250/mo fixed**.
**Path 2 (EU-sovereign, Hetzner):**

| Item                          | Spec                                  |          Monthly |
| ----------------------------- | ------------------------------------- | ---------------: |
| 2× Hetzner CPX31              | 4 vCPU / 8 GB / 160 GB each           |             ~€31 |
| Hetzner Load Balancer LB11    |                                       |              ~€6 |
| Managed EU Postgres           | 2 vCPU / 8 GB + backups               |           €30–80 |
| Hetzner Object Storage        | 1 TB                                  |              ~€5 |
| Offsite backup (2nd provider) | restic to Scaleway/OVH                |              ~€5 |
| Monitoring                    | BetterStack or self-hosted Grafana VM |            €5–30 |
| WAF/CDN                       | Cloudflare Pro / bunny.net            |            €0–20 |
| **Fixed subtotal**            |                                       |     **~€90–180** |
| AI usage at ~10k searches/mo  |                                       |         ~€40–120 |
| **Realistic total**           |                                       | **~€150–300/mo** |

---

## AI usage model (the real variable cost)

Per search: Firecrawl returns ≤10 articles; each is summarized by `gpt-4o-mini`.

- **OpenAI:** ~10 summaries × (~2,000 input + ~100 output tokens) ≈ 20k in / 1k out per search.
  At $0.15/1M input + $0.60/1M output → **≈ $0.0036 per search** (~0.4 cents).
  1,000 searches ≈ **$3.60**. 10,000 searches ≈ **$36**.
- **Firecrawl:** search+scrape credits ≈ 10 credits/search. Free = 500 credits (~50 searches). Hobby $16/mo ≈ 3,000 credits (~300 searches); Standard $83/mo ≈ 100k credits (~10k searches). **Firecrawl, not OpenAI, is the dominant variable cost.**
- **Implication:** an attacker hitting unauthenticated `/api/search` at the current limiter's 30 req/min could burn a month of Firecrawl credits in ~10 minutes. This is why R-04 (auth + durable rate limit + provider hard caps) is a P0 cost control, not just security.

## Cost controls to set (all free)

1. OpenAI: hard monthly spend limit ($10 Alpha, raise deliberately).
2. Firecrawl: stay on a fixed plan (credits are a natural cap) — don't enable auto-recharge.
3. Vercel: spend management alert + pause threshold (Pro).
4. Supabase: usage alerts at 80% of plan.
5. Upstash: free tier caps requests naturally; alert at 80%.
6. Review this sheet monthly; upgrade tiers only on hitting a documented limit.

## Bottom line

| Phase               |    Fixed | With realistic usage |
| ------------------- | -------: | -------------------: |
| Demo (now → Alpha)  |       €0 |             €0–20/mo |
| Alpha/Beta pilots   |   €50–60 |           €70–150/mo |
| Paid (managed)      | €150–250 |          €200–350/mo |
| Paid (EU-sovereign) |  €90–180 |          €150–300/mo |

**No spending is required to fix the P0 blockers.** The first unavoidable spend is ~€50/mo (Vercel Pro + Supabase Pro) when the first pilot customer logs in — a founder decision to approve at that moment.
