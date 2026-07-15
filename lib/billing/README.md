# DNS-GOV-019: Billing Integration

## Overview

This directory contains the implementation scaffold for the EURO AI billing system. The scaffold includes types, Stripe client integration, usage tracking, API routes, and UI components for a complete billing system supporting three pricing tiers: Free, Pro ($49/mo), and Enterprise (custom).

## Status

**Status:** Implementation Scaffold (Ready for Full Development)
**Last Updated:** 2026-07-15
**Effort Remaining:** 60-80 engineering hours (2-3 weeks for complete implementation)

## Directory Structure

```
lib/billing/
├── types.ts                    # TypeScript types for billing domain
├── stripe-client.ts            # Stripe API integration
├── usage.ts                    # Usage tracking and rate limiting
├── __tests__/
│   ├── subscription.test.ts    # Subscription management tests
│   ├── usage.test.ts           # Usage tracking tests
│   └── stripe-client.test.ts   # Stripe client tests
└── README.md                   # This file

app/api/billing/
├── subscription/route.ts       # GET current subscription + usage
├── checkout-session/route.ts   # POST create Stripe checkout
└── webhook/route.ts            # POST Stripe webhook handler

components/billing/
├── billing-settings.tsx        # Subscription management UI
└── pricing-table.tsx           # Public pricing page
```

## Environment Variables Required

```bash
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_PRICE_ID_PRO=price_xxx
STRIPE_PRICE_ID_ENTERPRISE=price_xxx
```

## Implementation Phases

### Phase 1: Billing Data Model & Schema

- [ ] Create Supabase tables: `billing_plans`, `customer_subscriptions`, `usage_tracking`, `invoices`, `payment_methods`
- [ ] Add RLS policies for customer isolation
- [ ] Create database migrations
- [ ] Add test fixtures

### Phase 2: Stripe Integration

- [ ] Implement Stripe API methods (create customer, checkout, subscriptions, invoices)
- [ ] Build webhook handlers (subscription events, payment failures, refunds)
- [ ] Create API endpoints
- [ ] Add comprehensive error handling
- [ ] 28 tests required

### Phase 3: Usage Metering & Rate Limiting

- [ ] Implement usage tracking API
- [ ] Add rate limiter middleware
- [ ] Build usage threshold alerts
- [ ] Create dashboard display
- [ ] 12 tests required

### Phase 4: Customer Segmentation & Retention

- [ ] Integrate with DNS-GOV-018 (Customer Intelligence)
- [ ] Build upgrade/downgrade triggers
- [ ] Create churn risk alerts
- [ ] Implement revenue forecasting
- [ ] 8 tests required

### Phase 5: UI & Dashboard

- [ ] Build billing settings page (`/settings/billing`)
- [ ] Create usage dashboard (`/settings/usage`)
- [ ] Implement pricing page (`/pricing`)
- [ ] Add checkout flow
- [ ] 6 E2E tests required

### Phase 6: Testing & Verification

- [ ] Unit tests: 16
- [ ] Integration tests: 20
- [ ] E2E tests: 6
- [ ] Scenario tests: 12
- [ ] **Total: 54 tests**

## Pricing Tiers

| Tier       | API Calls/Month | Workspaces | Team Members | Price  |
| ---------- | --------------- | ---------- | ------------ | ------ |
| Free       | 10,000          | 1          | 1            | $0     |
| Pro        | 100,000         | 5          | 10           | $49/mo |
| Enterprise | Unlimited       | Unlimited  | Unlimited    | Custom |

## API Endpoints

```
POST /api/billing/checkout-session
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

## Key Types

- `BillingTier`: 'free' | 'pro' | 'enterprise'
- `SubscriptionStatus`: 'active' | 'past_due' | 'cancelled' | 'paused' | 'trialing'
- `BillingContext`: Complete billing info for a customer
- `UsageStats`: Current period usage with percentage and days remaining

## Testing Strategy

All components include test scaffolds with TODO comments marking implementation points. Tests use Vitest with mocked Supabase and Stripe clients.

Run tests:

```bash
npm test -- lib/billing
```

## Next Steps

1. ✅ Scaffold created (types, clients, routes, components, tests)
2. ⏳ **Awaiting Founder approval** to proceed with full implementation
3. 📋 Upon approval: Execute implementation phases in order
4. 🧪 Each phase completes with full test coverage
5. 🚀 Integration with DNS-GOV-018 (retention system)
6. ✨ Final verification before production deployment

## Related Documentation

- Implementation Plan: `docs/governance/DNS-GOV-019-IMPLEMENTATION-PLAN.md`
- Founder Brief: `docs/governance/DNS-GOV-019-BILLING-BRIEF.md`
- Integration with DNS-GOV-018: `docs/governance/CHECKPOINT-2026-07-12-EVENING.md`

## Questions?

Refer to the detailed implementation plan for specific technical requirements and Stripe integration patterns.
