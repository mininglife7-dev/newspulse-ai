import { getSupabaseAdmin } from '@/lib/supabase';
import type { UsageStats, BillingPlan } from './types';

const BILLING_PLANS: Record<string, BillingPlan> = {
  free: {
    id: 'free',
    name: 'Free',
    tier: 'free',
    priceMonthly: null,
    features: {
      custom_integrations: false,
      slack_support: false,
      priority_email: false,
    },
    apiRateLimit: 10000,
    maxWorkspaces: 1,
    maxTeamMembers: 1,
    createdAt: new Date().toISOString(),
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    tier: 'pro',
    priceMonthly: 49,
    features: {
      custom_integrations: true,
      slack_support: true,
      priority_email: true,
    },
    apiRateLimit: 100000,
    maxWorkspaces: 5,
    maxTeamMembers: 10,
    createdAt: new Date().toISOString(),
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    tier: 'enterprise',
    priceMonthly: null,
    features: {
      custom_integrations: true,
      slack_support: true,
      priority_email: true,
    },
    apiRateLimit: Number.MAX_SAFE_INTEGER,
    maxWorkspaces: Number.MAX_SAFE_INTEGER,
    maxTeamMembers: Number.MAX_SAFE_INTEGER,
    createdAt: new Date().toISOString(),
  },
};

export function getPlanLimits(tier: string) {
  const plan = BILLING_PLANS[tier];
  if (!plan) {
    return BILLING_PLANS.free;
  }
  return plan;
}

function getPeriodMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
}

export async function trackApiCall(customerId: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  const periodMonth = getPeriodMonth();

  await supabase
    .from('usage_tracking')
    .upsert(
      {
        customer_id: customerId,
        period_month: periodMonth,
        api_calls: 1,
      },
      { onConflict: 'customer_id,period_month' }
    )
    .select();
}

export async function trackWorkspaceCreation(
  customerId: string
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const periodMonth = getPeriodMonth();

  await supabase
    .from('usage_tracking')
    .upsert(
      {
        customer_id: customerId,
        period_month: periodMonth,
        workspaces_created: 1,
      },
      { onConflict: 'customer_id,period_month' }
    )
    .select();
}

export async function trackTeamMemberInvite(customerId: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  const periodMonth = getPeriodMonth();

  await supabase
    .from('usage_tracking')
    .upsert(
      {
        customer_id: customerId,
        period_month: periodMonth,
        team_members_invited: 1,
      },
      { onConflict: 'customer_id,period_month' }
    )
    .select();
}

export async function getUsageStats(
  customerId: string,
  subscriptionId: string
): Promise<UsageStats> {
  const supabase = getSupabaseAdmin();
  const now = new Date();
  const periodMonth = getPeriodMonth();

  const { data: usage } = await supabase
    .from('usage_tracking')
    .select('*')
    .eq('customer_id', customerId)
    .eq('period_month', periodMonth)
    .single();

  const { data: subscription } = await supabase
    .from('customer_subscriptions')
    .select('plan_id, current_period_end')
    .eq('id', subscriptionId)
    .single();

  const plan = subscription
    ? BILLING_PLANS[subscription.plan_id as keyof typeof BILLING_PLANS]
    : BILLING_PLANS.free;

  const currentApiCalls = usage?.api_calls ?? 0;
  const percentageUsed =
    plan.apiRateLimit > 0 ? (currentApiCalls / plan.apiRateLimit) * 100 : 0;

  const currentPeriodEnd = subscription?.current_period_end
    ? new Date(subscription.current_period_end)
    : new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const daysRemaining = Math.ceil(
    (currentPeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  return {
    currentPeriodApiCalls: currentApiCalls,
    currentPeriodWorkspaces: usage?.workspaces_created ?? 0,
    currentPeriodTeamMembers: usage?.team_members_invited ?? 0,
    percentageUsed,
    daysRemaining: Math.max(0, daysRemaining),
  };
}

export async function isRateLimited(
  customerId: string,
  plan: BillingPlan
): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  const periodMonth = getPeriodMonth();

  const { data: usage } = await supabase
    .from('usage_tracking')
    .select('api_calls')
    .eq('customer_id', customerId)
    .eq('period_month', periodMonth)
    .single();

  const currentApiCalls = usage?.api_calls ?? 0;
  return currentApiCalls >= plan.apiRateLimit;
}
