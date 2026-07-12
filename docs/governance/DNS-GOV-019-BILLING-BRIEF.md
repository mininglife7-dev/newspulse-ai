# DNS-GOV-019: Billing Integration — Executive Brief

**Status:** Specification Complete | Ready for Implementation  
**Created:** 2026-07-12  
**Priority:** High (enables revenue model)  
**Effort Estimate:** 60-80 engineering hours | 2-3 week implementation

---

## Executive Summary

DNS-GOV-019 implements autonomous usage-based billing with per-workspace metering, payment processing, and tier management. This enables EURO AI to monetize immediately upon launch without Founder intervention.

**Outcome:** Transform product from free-only to sustainable SaaS business with automated invoicing, rate limiting, and feature gating.

---

## What It Enables

### For Your Customers
- **Self-service tiers:** Free → Pro ($49/month) → Enterprise (custom)
- **Transparent usage tracking:** API calls, storage, active users, all visible in dashboard
- **Graceful limits:** Rate limiting instead of hard block (Free tier slows down instead of stops)
- **Smart alerts:** "You're at 80% of API quota — consider upgrading"
- **Flexible payment:** Monthly or annual billing with 20% discount for annual

### For Your Business
- **Automatic invoicing:** Monthly usage-based charges generated and sent automatically
- **Revenue per workspace:** No manual tracking or customer-by-customer setup
- **Tier-based feature gating:** Pro customers unlock advanced features (custom integrations, Slack)
- **Retention alignment:** Identify at-risk customers and offer Pro upgrade as retention strategy
- **Unit economics tracking:** Foundation for revenue forecasting and growth decisions

### For Your Operations
- **Founder hours:** $0 post-launch (Stripe webhooks handle everything)
- **Payment handling:** Stripe integration with automatic retry for failed cards
- **Overage protection:** Spending cap per workspace prevents surprise bills
- **Compliance:** Automated invoice audit trail, tax-ready reporting

---

## Pricing Model (Proposed)

| Tier | Monthly | Annual | API Requests | Storage | Active Users | Feature Set |
|------|---------|--------|--------------|---------|--------------|-------------|
| **Free** | $0 | — | 10K/mo | 5 GB | 1 | Core search, basic reports |
| **Pro** | $49 | $490 | 100K/mo | 50 GB | 5 | ↑ + custom integrations, Slack, priority support |
| **Enterprise** | Custom | Custom | Custom | Custom | Custom | ↑ + dedicated account manager, SLA |

**Overage pricing:** $0.001 per 100 API requests, $5/GB storage, $10/extra active user

---

## How It Works (Workflow)

1. **Customer signs up** → Automatically placed on Free tier
2. **Uses the product** → Middleware tracks API calls, storage, users
3. **At 80% of quota** → Automatic email alert: "You're close to limit"
4. **Wants to scale** → Clicks "Upgrade to Pro" in dashboard
5. **Selects Pro tier** → Securely submits payment method to Stripe
6. **Payment verified** → Stripe processes, workspace tier updated immediately
7. **New limits active** → Customer can now make 100K API calls/month
8. **Monthly billing** → Stripe automatically charges for usage-based costs
9. **Invoice delivered** → Email with cost breakdown, next billing date
10. **At-risk detection** → If customer usage drops, retention system suggests re-engagement

---

## Technical Highlights

### What's New
- **Billing schema:** `workspace_billing`, `usage_meters`, `billing_invoices`, `billing_alerts` tables
- **Usage tracking:** Middleware captures API calls, storage operations, active logins
- **Cost calculation:** Tier-based + usage-based overages + annual discounts
- **Stripe integration:** Customer creation, subscription management, webhook handling
- **Rate limiting:** 429 responses when quota exceeded, Free tier graceful degradation
- **Retention hook:** Connects to DNS-GOV-018 to identify upgrade opportunities

### Implementation
- **Core library:** `lib/billing.ts` (tier definitions, cost calculation, enforcement)
- **Payment integration:** `lib/stripe-integration.ts` (Stripe API wrapper)
- **Usage tracking:** `lib/usage-tracker.ts` (middleware hooks)
- **HTTP API:** `/api/billing/*` endpoints for Founder dashboard + customer self-service
- **Database changes:** 5 new tables with RLS policies (auto-encrypted per workspace)
- **Verification:** 54 comprehensive tests (tiers, usage, payments, webhooks, alerts, retention integration)

---

## Launch Prerequisites

**Before DNS-GOV-019 implementation:**
1. ✅ DNS-GOV-018 (Customer Intelligence) — COMPLETE
2. ✅ DNS-GOV-017 (Analytics Pipeline) — COMPLETE (provides usage data)
3. 📖 Stripe account setup — Founder action (5 min): Create account at stripe.com, get API keys
4. 📖 Billing configuration — Founder decision: Confirm tier pricing and limits (use proposal above or customize)

**After DNS-GOV-019 implementation:**
1. 📖 Supabase schema deployment — Founder action: Deploy `billing_*` tables (copy-paste SQL)
2. 📖 Stripe API keys → .env — Founder action: Add STRIPE_SECRET_KEY and STRIPE_PUBLISHABLE_KEY
3. 📖 Billing email template — Founder decision: Customize invoice email (default provided)

---

## Why This Now?

**Launch blocker:** Without billing, EURO AI is not a business—it's a free product.

**Revenue urgency:** First German customer (already interested) needs pricing transparency. Current options:
- Option A (Recommended): Ship DNS-GOV-019 before launch → customer sees pricing, can upgrade immediately
- Option B (Risky): Launch free-only → customer never converts, replicates NewsPulse failure mode
- Option C (Manual): Launch without automation → Founder manually invoices each customer (doesn't scale)

**Retention alignment:** DNS-GOV-018 identifies at-risk customers. Offering Pro tier upgrade is natural retention tactic.

**Unit economics:** Need billing data to calculate CAC/LTV and guide marketing spend.

---

## Founder Action Required

**No action required immediately.** Once Supabase schema is deployed (Priority 1) and GitHub Actions spending limit is increased (Priority 2), I recommend:

1. **Approve DNS-GOV-019 implementation** (this brief confirms specification is solid)
2. **Set up Stripe account** (5 min, if not already done)
3. **Confirm pricing model** (accept proposed tiers or customize)
4. Once approved, implementation will take 2-3 weeks and be deployment-ready

---

## Next Steps

**If approved:**
1. Governor implements DNS-GOV-019 (60-80 hours)
2. 54 tests verify functionality
3. All GitHub Actions green
4. Merged to `main` and deployed to production
5. First customer can upgrade to Pro immediately

**Estimated timeline:** Specification today → Approval request next → Implementation starts after Priority 1/2 Founder actions complete → Launch-ready in 2-3 weeks.

---

## Questions for Founder

1. **Pricing:** Accept $49/month for Pro tier, or prefer different price point?
2. **Feature gating:** Which features should Pro have that Free doesn't? (Current: custom integrations, Slack support)
3. **Free tier limit:** Should Free tier include 10K API requests/month? Too generous, too restrictive, or right?
4. **Payment processor:** Ready to use Stripe, or prefer Paddle, Chargebee, or other?
5. **First customer:** Should I prioritize DNS-GOV-019 for launch readiness, or focus on other high-value work first?
