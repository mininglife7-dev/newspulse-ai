-- DNS-GOV-019: Billing System Schema
-- Supabase tables for subscription management, usage tracking, and payment processing
-- Created: 2026-07-15

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. BILLING_PLANS Table
-- Stores tier definitions (Free, Pro, Enterprise)
-- ============================================================================

CREATE TABLE IF NOT EXISTS billing_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  tier TEXT NOT NULL CHECK (tier IN ('free', 'pro', 'enterprise')),
  price_monthly NUMERIC,
  api_rate_limit INTEGER NOT NULL DEFAULT 10000,
  max_workspaces INTEGER NOT NULL DEFAULT 1,
  max_team_members INTEGER NOT NULL DEFAULT 1,
  features JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 2. CUSTOMER_SUBSCRIPTIONS Table
-- Stores subscription information per customer
-- ============================================================================

CREATE TABLE IF NOT EXISTS customer_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL REFERENCES billing_plans(id),
  stripe_subscription_id TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'cancelled', 'paused', 'trialing')),
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  billing_cycle_anchor TIMESTAMPTZ NOT NULL,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_subscriptions_customer_id ON customer_subscriptions(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_subscriptions_stripe_id ON customer_subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_customer_subscriptions_status ON customer_subscriptions(status);

-- ============================================================================
-- 3. USAGE_TRACKING Table
-- Tracks API calls, workspace creation, and team member invites per billing period
-- ============================================================================

CREATE TABLE IF NOT EXISTS usage_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES customer_subscriptions(id) ON DELETE SET NULL,
  period_month TEXT NOT NULL,
  api_calls INTEGER DEFAULT 0,
  workspaces_created INTEGER DEFAULT 0,
  team_members_invited INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(customer_id, period_month)
);

CREATE INDEX IF NOT EXISTS idx_usage_tracking_customer_id ON usage_tracking(customer_id);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_period ON usage_tracking(period_month);

-- ============================================================================
-- 4. INVOICES Table
-- Stores billing history and invoice details
-- ============================================================================

CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES customer_subscriptions(id) ON DELETE SET NULL,
  stripe_invoice_id TEXT UNIQUE NOT NULL,
  amount_paid NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'usd',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'open', 'paid', 'void', 'uncollectible')),
  issued_at TIMESTAMPTZ,
  due_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_stripe_id ON invoices(stripe_invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_issued_at ON invoices(issued_at);

-- ============================================================================
-- 5. PAYMENT_METHODS Table
-- Stores customer payment methods from Stripe
-- ============================================================================

CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_payment_method_id TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('card', 'bank_account')),
  last_four TEXT,
  expiry_month INTEGER,
  expiry_year INTEGER,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_methods_customer_id ON payment_methods(customer_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_stripe_id ON payment_methods(stripe_payment_method_id);

-- ============================================================================
-- 6. Row Level Security (RLS) Policies
-- Enforce customer isolation and access control
-- ============================================================================

-- Enable RLS on all billing tables
ALTER TABLE billing_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

-- BILLING_PLANS: Public read access (everyone can see pricing tiers)
CREATE POLICY "Enable read access for all users" ON billing_plans
  FOR SELECT USING (true);

-- CUSTOMER_SUBSCRIPTIONS: Users can only see their own subscriptions
CREATE POLICY "Users can view own subscriptions" ON customer_subscriptions
  FOR SELECT USING (auth.uid() = customer_id);

CREATE POLICY "Users can update own subscriptions (via service role)" ON customer_subscriptions
  FOR UPDATE USING (auth.uid() = customer_id);

-- USAGE_TRACKING: Users can only see their own usage
CREATE POLICY "Users can view own usage" ON usage_tracking
  FOR SELECT USING (auth.uid() = customer_id);

-- INVOICES: Users can only see their own invoices
CREATE POLICY "Users can view own invoices" ON invoices
  FOR SELECT USING (auth.uid() = customer_id);

-- PAYMENT_METHODS: Users can only see their own payment methods
CREATE POLICY "Users can view own payment methods" ON payment_methods
  FOR SELECT USING (auth.uid() = customer_id);

CREATE POLICY "Users can update own payment methods (via service role)" ON payment_methods
  FOR UPDATE USING (auth.uid() = customer_id);

-- ============================================================================
-- 7. Insert default billing plans
-- ============================================================================

INSERT INTO billing_plans (id, name, tier, price_monthly, api_rate_limit, max_workspaces, max_team_members, features)
VALUES
  ('free', 'Free', 'free', NULL, 10000, 1, 1, '{"custom_integrations": false, "slack_support": false, "priority_email": false}'),
  ('pro', 'Pro', 'pro', 49, 100000, 5, 10, '{"custom_integrations": true, "slack_support": true, "priority_email": true}'),
  ('enterprise', 'Enterprise', 'enterprise', NULL, 2147483647, 2147483647, 2147483647, '{"custom_integrations": true, "slack_support": true, "priority_email": true}')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 8. Triggers for updated_at timestamps
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_billing_plans_updated_at
  BEFORE UPDATE ON billing_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customer_subscriptions_updated_at
  BEFORE UPDATE ON customer_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_methods_updated_at
  BEFORE UPDATE ON payment_methods
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
