# DNS-GOV-019: Billing Integration — Implementation Plan

**Status:** Ready for Implementation (awaiting Founder approval)  
**Effort:** 60-80 hours (2-3 weeks)  
**Type:** Major Feature — Revenue enablement  
**Dependencies:** Supabase schema deployed, GitHub Actions restored  
**Timeline:** Week 2-4 of launch  

---

## Executive Summary

Complete billing integration enabling EURO AI to monetize through three pricing tiers (Free, Pro $49/mo, Enterprise custom). Integrates Stripe payment processing, usage metering, seat-based pricing, and automatic customer segmentation for retention incentives.

**Decision Required:** Approve billing at launch (this plan) or defer to Phase 2 after customer feedback.

---

## Scope & Deliverables

### Phase 1: Billing Data Model & Schema (Week 1)

**Deliverables:**
- Supabase schema: billing tables, subscriptions, usage tracking, invoices
- Database migrations: zero-downtime safe
- Row Level Security: customer isolation guaranteed
- Test fixtures: 8 pricing scenarios

**Schema Additions:**

```sql
-- Billing plans (Free, Pro, Enterprise)
CREATE TABLE billing_plans (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  tier TEXT NOT NULL (free, pro, enterprise),
  price_monthly DECIMAL,
  features JSONB,
  api_rate_limit INTEGER,
  max_workspaces INTEGER,
  max_team_members INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Customer subscriptions
CREATE TABLE customer_subscriptions (
  id UUID PRIMARY KEY,
  customer_id UUID REFERENCES customers,
  plan_id UUID REFERENCES billing_plans,
  stripe_subscription_id TEXT UNIQUE,
  status TEXT (active, past_due, cancelled, paused),
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  billing_cycle_anchor TIMESTAMP,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Usage tracking (for Pro+ rate limiting)
CREATE TABLE usage_tracking (
  id UUID PRIMARY KEY,
  customer_id UUID REFERENCES customers,
  subscription_id UUID REFERENCES customer_subscriptions,
  period_month DATE,
  api_calls INTEGER DEFAULT 0,
  workspaces_created INTEGER DEFAULT 0,
  team_members_invited INTEGER DEFAULT 0,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Invoices (for billing history)
CREATE TABLE invoices (
  id UUID PRIMARY KEY,
  customer_id UUID REFERENCES customers,
  subscription_id UUID REFERENCES customer_subscriptions,
  stripe_invoice_id TEXT UNIQUE,
  amount_paid DECIMAL,
  currency TEXT DEFAULT 'USD',
  status TEXT (draft, open, paid, void, uncollectible),
  issued_at TIMESTAMP,
  due_at TIMESTAMP,
  paid_at TIMESTAMP
);

-- Payment methods
CREATE TABLE payment_methods (
  id UUID PRIMARY KEY,
  customer_id UUID REFERENCES customers,
  stripe_payment_method_id TEXT UNIQUE,
  type TEXT (card, bank_account),
  last_four TEXT,
  expiry_month INTEGER,
  expiry_year INTEGER,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**RLS Policies:**
- Users can only view own subscription
- Customers can only view own billing history
- Service role can manage subscriptions and usage

---

### Phase 2: Stripe Integration (Week 1-2)

**Deliverables:**
- Stripe API client with error handling
- Webhook handlers (subscription events, payment failures, refunds)
- Customer sync (create/update Stripe customers)
- Payment method management UI
- Test coverage: 28 tests

**Stripe Events to Handle:**

| Event | Action | Flow |
|---|---|---|
| `customer.created` | Create/link Stripe customer | During signup |
| `checkout.session.completed` | Activate subscription | After payment |
| `invoice.payment_succeeded` | Mark invoice paid | Automatic |
| `invoice.payment_failed` | Alert customer, retry | Automatic retry |
| `customer.subscription.updated` | Update plan or status | When customer changes |
| `customer.subscription.deleted` | Downgrade to Free | Cancellation |

**API Endpoints to Create:**

```
POST /api/billing/create-checkout-session
  → Creates Stripe checkout for upgrade

GET /api/billing/subscription
  → Returns current subscription + usage

POST /api/billing/cancel-subscription
  → Schedules cancellation at period end

GET /api/billing/invoices
  → Returns billing history (paginated)

POST /api/billing/update-payment-method
  → Updates default payment method

POST /api/billing/webhook
  → Handles Stripe webhooks (internal)
```

---

### Phase 3: Usage Metering & Rate Limiting (Week 2)

**Deliverables:**
- Usage tracking API (increment counters)
- Rate limiter middleware (Pro+ limits)
- Usage alerts (80% threshold)
- Dashboard display (usage status)
- Test coverage: 12 tests

**Rate Limits by Tier:**

| Tier | API Calls/Month | Workspaces | Team Members | Cost |
|---|---|---|---|---|
| **Free** | 10,000 | 1 | 1 | $0 |
| **Pro** | 100,000 | 5 | 10 | $49/mo |
| **Enterprise** | Unlimited | Unlimited | Unlimited | Custom |

**Implementation:**
- Increment usage counter on each API call
- Check limits before processing request
- Return 429 (rate limit exceeded) when over limit
- Email alert at 80% threshold
- Soft limit (warn) vs hard limit (block)

**Usage Tracking Events:**

```typescript
// Track API calls
trackUsage(customerId, 'api_calls', 1);

// Track resource creation
trackUsage(customerId, 'workspaces_created', 1);
trackUsage(customerId, 'team_members_invited', 1);

// Automatic reset at billing cycle boundary
resetUsageAtCycleEnd(subscriptionId);
```

---

### Phase 4: Customer Segmentation & Retention (Week 2)

**Deliverables:**
- Integration with DNS-GOV-018 (Customer Intelligence)
- Upgrade/downgrade triggers
- Churn risk alerts
- Revenue forecasting
- Test coverage: 8 tests

**Segmentation for Billing:**

| Segment | Trigger | Action |
|---|---|---|
| **Free tier at 80% limit** | Usage nearing max | Suggest Pro upgrade |
| **Pro power user** (>80K API calls) | Heavy usage | Suggest Enterprise |
| **Churn risk + paid tier** | Health < 40 | Retention offer (discount) |
| **Upgrade candidate** | Free tier + high adoption | Upgrade incentive email |
| **Trial end soon** | Day 27 of 30-day trial | Conversion email |

**Email Triggers (via DNS-GOV-018):**
- Day 3: Feature education
- Day 7: Upgrade incentive
- Day 14: "Going paid" announcement
- Day 27: Trial ending soon

---

### Phase 5: UI & Dashboard (Week 2-3)

**Deliverables:**
- Billing settings page
- Usage dashboard
- Upgrade/downgrade flow
- Invoice management
- Payment method management
- Pricing comparison page
- Test coverage: 6 tests (E2E UI tests)

**Pages to Create:**

1. **`/settings/billing`** — Subscription management
   - Current plan display
   - Upgrade/downgrade buttons
   - Billing history
   - Payment method manager

2. **`/settings/usage`** — Usage tracking
   - API call usage (bar chart)
   - Workspace count
   - Team member count
   - Current period stats

3. **`/pricing`** (public) — Pricing page
   - Feature comparison table
   - Tier cards with call-to-action
   - FAQ section
   - Contact enterprise sales

4. **`/checkout`** — Stripe checkout redirect
   - Confirm plan selection
   - Show pricing breakdown
   - Redirect to Stripe

---

### Phase 6: Testing & Verification (Week 3)

**Test Plan: 54 Tests Total**

#### Unit Tests (16 tests)
- Subscription creation (3)
- Plan validation (2)
- Usage tracking accuracy (3)
- Rate limit calculation (3)
- Stripe event parsing (3)
- Invoice generation (2)

#### Integration Tests (20 tests)
- End-to-end upgrade flow (4)
- End-to-end downgrade flow (3)
- Stripe webhook handling (4)
- Usage reset at cycle boundary (3)
- Rate limiting enforcement (3)
- Payment failure recovery (3)

#### E2E Tests (6 tests)
- Free → Pro upgrade (via UI)
- Pro → Enterprise contact flow
- Cancel subscription (via UI)
- Update payment method (via UI)
- Invoice download (via UI)
- Pricing page accessibility (1)

#### Scenario Tests (12 tests)
- Trial → Free conversion
- Free tier → Pro upgrade
- Pro → Enterprise growth
- Pro → Free downgrade
- Subscription cancellation
- Payment method fallback
- Invoice history pagination
- Churn risk retention offer
- Upgrade incentive email sending
- Usage threshold alerts
- Concurrent subscription updates
- Stripe webhook retry logic

---

## Timeline & Milestones

### Week 1: Data Model & Infrastructure
**Days 1-2:** Schema design + migration tests (16 tests)  
**Days 3-4:** Stripe client setup + webhook handlers (28 tests)  
**Days 5:** Database review + security audit  

**Deliverable:** Safe schema, working Stripe integration

### Week 2: Features & Metering
**Days 1-2:** Usage tracking + rate limiting (12 tests)  
**Days 3-4:** Customer segmentation integration (8 tests)  
**Days 5:** Billing UI pages (6 E2E tests)  

**Deliverable:** Complete feature set, ready for testing

### Week 3: Testing & Launch
**Days 1-2:** Full integration test suite (20 tests)  
**Days 3-4:** Scenario testing (12 tests)  
**Days 5:** Staging deployment + final verification  

**Deliverable:** Production-ready billing system

---

## Risk Assessment

### 🔴 Critical Risks

**Risk 1: Stripe API Integration Complexity**
- Likelihood: Medium | Impact: High
- Mitigation: Use Stripe libraries, comprehensive test coverage, staging environment
- Contingency: Fallback to manual invoice generation

**Risk 2: Data Consistency Between EURO AI & Stripe**
- Likelihood: Medium | Impact: High
- Mitigation: Webhook reconciliation, usage audit logs, daily sync check
- Contingency: Automated reconciliation job

**Risk 3: Rate Limiting Performance Impact**
- Likelihood: Low | Impact: High
- Mitigation: Cache rate limits, async usage tracking, batch updates
- Contingency: Graceful degradation (warn instead of block on Redis failure)

### 🟠 High Risks

**Risk 4: PCI Compliance (Payment Card Data)**
- Likelihood: Low | Impact: High
- Mitigation: Never store card details, use Stripe tokenization only, PCI audit
- Contingency: Stripe becomes single source of truth

**Risk 5: Currency & Tax Handling**
- Likelihood: Medium | Impact: Medium
- Mitigation: Start with USD only, Stripe tax API for EU VAT, document for future
- Contingency: Manual tax review process

**Risk 6: Free → Paid Conversion Rate**
- Likelihood: High | Impact: Medium
- Mitigation: A/B test pricing tiers, customer feedback survey, monitor cohorts
- Contingency: Adjust pricing after first month data

### 🟡 Medium Risks

**Risk 7: Downgrade Complexity**
- Likelihood: Medium | Impact: Medium
- Mitigation: Clear downgrade flow, data retention guarantee, retention offer trigger
- Contingency: Manual intervention for edge cases

---

## Success Criteria

### Technical Success
✅ All 54 tests passing  
✅ Stripe test mode fully functional  
✅ Webhooks reliable (>99.9% delivery)  
✅ Rate limiting <5ms overhead per request  
✅ Zero payment processing errors in staging  

### Business Success
✅ First paying customer converts within week 1  
✅ Upgrade conversion rate >5% from free tier  
✅ Payment failure recovery rate >95%  
✅ Churn reduction with retention offers measurable  
✅ Revenue tracking accurate to $0.01  

---

## Stripe Account Setup (Founder Prerequisite)

**Before implementation starts:**

1. Create Stripe account: https://stripe.com
2. Get credentials:
   - Publishable key
   - Secret key
3. Set up webhook endpoint:
   - Endpoint: `https://newspulse-ai.vercel.app/api/billing/webhook`
   - Events: customer.*, checkout.*, invoice.*, subscription.*
4. Configure tax settings (VAT for EU)
5. Set up email notifications in Stripe

**Add to environment:**
```
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

---

## Phase 2 Roadmap (Post-DNS-GOV-019)

### DNS-GOV-020: Unit Economics Dashboard
- Revenue per customer
- Lifetime value (LTV)
- Customer acquisition cost (CAC)
- Churn cohort analysis

### DNS-GOV-021: Customer Success Automation
- Automated upgrade suggestions
- Churn recovery workflows
- Expansion revenue triggers
- Win-back campaigns

### DNS-GOV-022: Advanced Billing
- Volume discounts (enterprise)
- Annual prepay option
- Seat-based pricing refinement
- Custom contract terms

---

## Decision Required

**Option A: Implement DNS-GOV-019 (This Plan)**
- Timeline: 2-3 weeks
- Cost: Engineering time only
- Benefit: Revenue at launch
- Risk: Complexity + potential delays

**Option B: Defer to Phase 2**
- Timeline: Launch today with free tier only
- Cost: None (code ready)
- Benefit: Faster launch, customer feedback first
- Risk: Delayed monetization (but minimal)

**Recommendation:** Option B (defer to Phase 2)
- Reason: Get first customer feedback before monetizing
- Timeline: Launch free this week, billing in week 4
- Data-driven: Use real usage patterns to set pricing right

---

## Implementation Notes

### For Governor
Once approved:
1. Create billing feature branch
2. Implement phases sequentially
3. Run test suite at each milestone
4. Stage deploy for final verification
5. Request Founder sign-off before production

### For Founder
- Review this plan and approve/defer billing strategy
- Provide Stripe account credentials before implementation
- Decide on trial period length (14-30 days)
- Approve pricing tiers and feature gates
- Test billing flow in Stripe test mode before launch

---

## Files to Create/Modify

**New Files:**
- `lib/billing/stripe-client.ts` — Stripe API wrapper
- `lib/billing/usage-tracker.ts` — Usage tracking logic
- `lib/billing/rate-limiter.ts` — Rate limiting middleware
- `app/api/billing/checkout/route.ts` — Checkout endpoint
- `app/api/billing/subscription/route.ts` — Subscription endpoint
- `app/api/billing/webhook/route.ts` — Webhook handler
- `app/settings/billing/page.tsx` — Billing settings page
- `app/settings/usage/page.tsx` — Usage dashboard page
- `app/pricing/page.tsx` — Public pricing page
- `tests/billing/*.test.ts` — 54 test cases

**Modified Files:**
- `supabase/schema.sql` — Add billing tables + RLS
- `middleware.ts` — Add rate limiting check
- `lib/customer-retention.ts` — Add billing segment logic
- `app/api/customer-retention/route.ts` — Add upgrade triggers
- `.env.example` — Add Stripe credentials

---

## Reference

- DNS-GOV-018: Customer Intelligence & Retention (upstream dependency)
- FIRST_CUSTOMER_PLAYBOOK.md: First customer onboarding
- FOUNDER_ACTION_BOARD.md: Billing decision point

