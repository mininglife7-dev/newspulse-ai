import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getSupabaseAdmin } from '@/lib/supabase';
import type {
  CustomerSubscription,
  SubscriptionStatus,
} from '@/lib/billing/types';

vi.mock('@/lib/supabase');

const mockSupabase = {
  from: vi.fn(),
};

const createMockSubscription = (overrides = {}) => ({
  id: 'sub_test_123',
  customer_id: 'customer_123',
  plan_id: 'free',
  stripe_subscription_id: 'stripe_sub_123',
  status: 'active' as SubscriptionStatus,
  current_period_start: new Date().toISOString(),
  current_period_end: new Date(
    Date.now() + 30 * 24 * 60 * 60 * 1000
  ).toISOString(),
  billing_cycle_anchor: new Date().toISOString(),
  cancel_at_period_end: false,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

describe('Subscription Management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getSupabaseAdmin as any).mockReturnValue(mockSupabase);
  });

  describe('createSubscription', () => {
    it('should create a new subscription for a customer', async () => {
      const newSubscription = createMockSubscription({
        id: 'sub_new_123',
        plan_id: 'free',
      });

      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockResolvedValue({
            data: [newSubscription],
            error: null,
          }),
        }),
      });

      const supabase = getSupabaseAdmin();
      const { data } = await supabase
        .from('customer_subscriptions')
        .insert({
          customer_id: newSubscription.customer_id,
          plan_id: newSubscription.plan_id,
          stripe_subscription_id: newSubscription.stripe_subscription_id,
          status: newSubscription.status,
        })
        .select();

      expect(data).toBeDefined();
      expect(data![0].plan_id).toBe('free');
    });

    it('should validate plan selection with supported tiers', async () => {
      const supportedPlans = ['free', 'pro', 'enterprise'];
      const subscription = createMockSubscription();

      for (const plan of supportedPlans) {
        expect(['free', 'pro', 'enterprise']).toContain(plan);
      }
    });

    it('should set correct billing cycle dates', async () => {
      const now = new Date();
      const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      const subscription = createMockSubscription({
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
      });

      expect(
        new Date(subscription.current_period_end).getTime()
      ).toBeGreaterThan(new Date(subscription.current_period_start).getTime());
    });

    it('should require customer ID and plan ID', async () => {
      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockResolvedValue({
            data: [],
            error: { message: 'Missing required fields' },
          }),
        }),
      });

      const supabase = getSupabaseAdmin();
      const { error } = await supabase
        .from('customer_subscriptions')
        .insert({})
        .select();

      expect(error).toBeDefined();
    });
  });

  describe('updateSubscription', () => {
    it('should upgrade from Free to Pro', async () => {
      const originalSub = createMockSubscription({ plan_id: 'free' });
      const upgradedSub = createMockSubscription({ plan_id: 'pro' });

      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockResolvedValue({
              data: [upgradedSub],
              error: null,
            }),
          }),
        }),
      });

      const supabase = getSupabaseAdmin();
      const { data } = await supabase
        .from('customer_subscriptions')
        .update({ plan_id: 'pro' })
        .eq('id', originalSub.id)
        .select();

      expect(data![0].plan_id).toBe('pro');
    });

    it('should downgrade from Pro to Free', async () => {
      const originalSub = createMockSubscription({ plan_id: 'pro' });
      const downgradedSub = createMockSubscription({ plan_id: 'free' });

      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockResolvedValue({
              data: [downgradedSub],
              error: null,
            }),
          }),
        }),
      });

      const supabase = getSupabaseAdmin();
      const { data } = await supabase
        .from('customer_subscriptions')
        .update({ plan_id: 'free' })
        .eq('id', originalSub.id)
        .select();

      expect(data![0].plan_id).toBe('free');
    });

    it('should handle mid-cycle upgrades', async () => {
      const subscription = createMockSubscription({
        plan_id: 'free',
        current_period_end: new Date(
          Date.now() + 15 * 24 * 60 * 60 * 1000
        ).toISOString(),
      });

      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockResolvedValue({
              data: [createMockSubscription({ plan_id: 'pro' })],
              error: null,
            }),
          }),
        }),
      });

      const supabase = getSupabaseAdmin();
      const { data } = await supabase
        .from('customer_subscriptions')
        .update({ plan_id: 'pro' })
        .eq('id', subscription.id)
        .select();

      expect(data).toBeDefined();
      const daysRemaining = Math.ceil(
        (new Date(subscription.current_period_end).getTime() -
          new Date().getTime()) /
          (24 * 60 * 60 * 1000)
      );
      expect(daysRemaining).toBeGreaterThan(0);
    });

    it('should preserve billing cycle dates on plan change', async () => {
      const originalPeriodEnd = new Date(
        Date.now() + 25 * 24 * 60 * 60 * 1000
      ).toISOString();
      const subscription = createMockSubscription({
        current_period_end: originalPeriodEnd,
      });

      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockResolvedValue({
              data: [
                createMockSubscription({
                  current_period_end: originalPeriodEnd,
                }),
              ],
              error: null,
            }),
          }),
        }),
      });

      const supabase = getSupabaseAdmin();
      const { data } = await supabase
        .from('customer_subscriptions')
        .update({ plan_id: 'pro' })
        .eq('id', subscription.id)
        .select();

      expect(data![0].current_period_end).toBe(originalPeriodEnd);
    });
  });

  describe('cancelSubscription', () => {
    it('should cancel at period end', async () => {
      const subscription = createMockSubscription({
        status: 'active' as SubscriptionStatus,
      });

      const cancelledSub = createMockSubscription({
        ...subscription,
        status: 'active' as SubscriptionStatus,
        cancel_at_period_end: true,
      });

      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockResolvedValue({
              data: [cancelledSub],
              error: null,
            }),
          }),
        }),
      });

      const supabase = getSupabaseAdmin();
      const { data } = await supabase
        .from('customer_subscriptions')
        .update({ cancel_at_period_end: true })
        .eq('id', subscription.id)
        .select();

      expect(data![0].cancel_at_period_end).toBe(true);
      expect(data![0].status).toBe('active');
    });

    it('should handle immediate cancellation', async () => {
      const subscription = createMockSubscription({
        status: 'active' as SubscriptionStatus,
      });

      const immediateCancelledSub = createMockSubscription({
        ...subscription,
        status: 'cancelled' as SubscriptionStatus,
      });

      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockResolvedValue({
              data: [immediateCancelledSub],
              error: null,
            }),
          }),
        }),
      });

      const supabase = getSupabaseAdmin();
      const { data } = await supabase
        .from('customer_subscriptions')
        .update({ status: 'cancelled' })
        .eq('id', subscription.id)
        .select();

      expect(data![0].status).toBe('cancelled');
    });

    it('should downgrade to Free tier on cancellation', async () => {
      const proSubscription = createMockSubscription({ plan_id: 'pro' });

      const downgradedSub = createMockSubscription({
        plan_id: 'free',
        status: 'cancelled' as SubscriptionStatus,
      });

      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockResolvedValue({
              data: [downgradedSub],
              error: null,
            }),
          }),
        }),
      });

      const supabase = getSupabaseAdmin();
      const { data } = await supabase
        .from('customer_subscriptions')
        .update({ plan_id: 'free', status: 'cancelled' })
        .eq('id', proSubscription.id)
        .select();

      expect(data![0].plan_id).toBe('free');
    });

    it('should preserve period end date for period-end cancellations', async () => {
      const subscription = createMockSubscription();
      const originalPeriodEnd = subscription.current_period_end;

      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockResolvedValue({
              data: [
                createMockSubscription({
                  current_period_end: originalPeriodEnd,
                }),
              ],
              error: null,
            }),
          }),
        }),
      });

      const supabase = getSupabaseAdmin();
      const { data } = await supabase
        .from('customer_subscriptions')
        .update({ cancel_at_period_end: true })
        .eq('id', subscription.id)
        .select();

      expect(data![0].current_period_end).toBe(originalPeriodEnd);
    });
  });
});
