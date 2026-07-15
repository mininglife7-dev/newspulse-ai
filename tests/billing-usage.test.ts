import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  trackApiCall,
  trackWorkspaceCreation,
  trackTeamMemberInvite,
  getUsageStats,
  isRateLimited,
  getPlanLimits,
} from '@/lib/billing/usage';
import { getSupabaseAdmin } from '@/lib/supabase';

vi.mock('@/lib/supabase');

const mockSupabase = {
  from: vi.fn(),
};

describe('Usage Tracking', () => {
  const testCustomerId = 'test-customer-123';
  const testSubscriptionId = 'test-subscription-456';
  const currentPeriodMonth =
    new Date().toISOString().split('-').slice(0, 2).join('-') + '-01';

  beforeEach(() => {
    vi.clearAllMocks();
    (getSupabaseAdmin as any).mockReturnValue(mockSupabase);
  });

  describe('trackApiCall', () => {
    it('should increment API call counter', async () => {
      const upsertMock = vi.fn().mockReturnValue({
        select: vi
          .fn()
          .mockResolvedValue({ data: [{ api_calls: 1 }], error: null }),
      });

      mockSupabase.from.mockReturnValue({
        upsert: upsertMock,
      });

      await trackApiCall(testCustomerId);

      expect(mockSupabase.from).toHaveBeenCalledWith('usage_tracking');
      expect(upsertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          customer_id: testCustomerId,
          period_month: currentPeriodMonth,
          api_calls: 1,
        }),
        expect.objectContaining({ onConflict: 'customer_id,period_month' })
      );
    });

    it('should use correct period month format', async () => {
      const upsertMock = vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: [], error: null }),
      });

      mockSupabase.from.mockReturnValue({
        upsert: upsertMock,
      });

      await trackApiCall(testCustomerId);

      const call = upsertMock.mock.calls[0][0];
      expect(call.period_month).toMatch(/^\d{4}-\d{2}-01$/);
    });

    it('should handle database errors gracefully', async () => {
      const dbError = new Error('Database connection failed');
      const upsertMock = vi.fn().mockReturnValue({
        select: vi.fn().mockRejectedValue(dbError),
      });

      mockSupabase.from.mockReturnValue({
        upsert: upsertMock,
      });

      await expect(trackApiCall(testCustomerId)).rejects.toThrow(
        'Database connection failed'
      );
    });
  });

  describe('trackWorkspaceCreation', () => {
    it('should increment workspace counter', async () => {
      const upsertMock = vi.fn().mockReturnValue({
        select: vi
          .fn()
          .mockResolvedValue({
            data: [{ workspaces_created: 1 }],
            error: null,
          }),
      });

      mockSupabase.from.mockReturnValue({
        upsert: upsertMock,
      });

      await trackWorkspaceCreation(testCustomerId);

      expect(upsertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          customer_id: testCustomerId,
          workspaces_created: 1,
        }),
        expect.any(Object)
      );
    });

    it('should track per customer per month', async () => {
      const upsertMock = vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: [], error: null }),
      });

      mockSupabase.from.mockReturnValue({
        upsert: upsertMock,
      });

      await trackWorkspaceCreation('customer-abc');

      const call = upsertMock.mock.calls[0][0];
      expect(call.customer_id).toBe('customer-abc');
      expect(call.period_month).toBeDefined();
    });
  });

  describe('trackTeamMemberInvite', () => {
    it('should increment team member counter', async () => {
      const upsertMock = vi.fn().mockReturnValue({
        select: vi
          .fn()
          .mockResolvedValue({
            data: [{ team_members_invited: 1 }],
            error: null,
          }),
      });

      mockSupabase.from.mockReturnValue({
        upsert: upsertMock,
      });

      await trackTeamMemberInvite(testCustomerId);

      expect(upsertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          customer_id: testCustomerId,
          team_members_invited: 1,
        }),
        expect.any(Object)
      );
    });

    it('should use upsert with conflict resolution', async () => {
      const upsertMock = vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: [], error: null }),
      });

      mockSupabase.from.mockReturnValue({
        upsert: upsertMock,
      });

      await trackTeamMemberInvite(testCustomerId);

      expect(upsertMock).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ onConflict: 'customer_id,period_month' })
      );
    });
  });

  describe('getUsageStats', () => {
    it('should return current usage for Free tier', async () => {
      const mockUsage = {
        api_calls: 5000,
        workspaces_created: 1,
        team_members_invited: 2,
      };
      const mockSubscription = {
        plan_id: 'free',
        current_period_end: new Date(
          Date.now() + 15 * 24 * 60 * 60 * 1000
        ).toISOString(),
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'usage_tracking') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi
                    .fn()
                    .mockResolvedValue({ data: mockUsage, error: null }),
                }),
              }),
            }),
          };
        }
        if (table === 'customer_subscriptions') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi
                  .fn()
                  .mockResolvedValue({ data: mockSubscription, error: null }),
              }),
            }),
          };
        }
      });

      const stats = await getUsageStats(testCustomerId, testSubscriptionId);

      expect(stats.currentPeriodApiCalls).toBe(5000);
      expect(stats.percentageUsed).toBeLessThan(100);
      expect(stats.daysRemaining).toBeGreaterThan(0);
    });

    it('should calculate percentage used correctly for Pro tier', async () => {
      const mockUsage = {
        api_calls: 50000,
        workspaces_created: 2,
        team_members_invited: 5,
      };
      const mockSubscription = {
        plan_id: 'pro',
        current_period_end: new Date(
          Date.now() + 10 * 24 * 60 * 60 * 1000
        ).toISOString(),
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'usage_tracking') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi
                    .fn()
                    .mockResolvedValue({ data: mockUsage, error: null }),
                }),
              }),
            }),
          };
        }
        if (table === 'customer_subscriptions') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi
                  .fn()
                  .mockResolvedValue({ data: mockSubscription, error: null }),
              }),
            }),
          };
        }
      });

      const stats = await getUsageStats(testCustomerId, testSubscriptionId);

      expect(stats.percentageUsed).toBe(50); // 50000 / 100000
      expect(stats.currentPeriodWorkspaces).toBe(2);
      expect(stats.currentPeriodTeamMembers).toBe(5);
    });

    it('should calculate days remaining in period', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 20);

      const mockUsage = {
        api_calls: 1000,
        workspaces_created: 0,
        team_members_invited: 0,
      };
      const mockSubscription = {
        plan_id: 'free',
        current_period_end: futureDate.toISOString(),
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'usage_tracking') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi
                    .fn()
                    .mockResolvedValue({ data: mockUsage, error: null }),
                }),
              }),
            }),
          };
        }
        if (table === 'customer_subscriptions') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi
                  .fn()
                  .mockResolvedValue({ data: mockSubscription, error: null }),
              }),
            }),
          };
        }
      });

      const stats = await getUsageStats(testCustomerId, testSubscriptionId);

      expect(stats.daysRemaining).toBeGreaterThanOrEqual(19);
      expect(stats.daysRemaining).toBeLessThanOrEqual(21);
    });

    it('should default to Free tier when subscription not found', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'usage_tracking') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi
                    .fn()
                    .mockResolvedValue({ data: null, error: null }),
                }),
              }),
            }),
          };
        }
        if (table === 'customer_subscriptions') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: null, error: null }),
              }),
            }),
          };
        }
      });

      const stats = await getUsageStats(testCustomerId, testSubscriptionId);

      expect(stats.currentPeriodApiCalls).toBe(0);
      expect(stats.percentageUsed).toBe(0);
    });
  });

  describe('isRateLimited', () => {
    it('should allow requests under limit for Free tier', async () => {
      const freePlan = getPlanLimits('free');
      const mockUsage = { api_calls: 5000 };

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi
                .fn()
                .mockResolvedValue({ data: mockUsage, error: null }),
            }),
          }),
        }),
      });

      const limited = await isRateLimited(testCustomerId, freePlan);

      expect(limited).toBe(false);
    });

    it('should block requests over limit for Free tier', async () => {
      const freePlan = getPlanLimits('free');
      const mockUsage = { api_calls: 10001 };

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi
                .fn()
                .mockResolvedValue({ data: mockUsage, error: null }),
            }),
          }),
        }),
      });

      const limited = await isRateLimited(testCustomerId, freePlan);

      expect(limited).toBe(true);
    });

    it('should allow requests at exactly the limit', async () => {
      const proPlan = getPlanLimits('pro');
      const mockUsage = { api_calls: 100000 };

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi
                .fn()
                .mockResolvedValue({ data: mockUsage, error: null }),
            }),
          }),
        }),
      });

      const limited = await isRateLimited(testCustomerId, proPlan);

      expect(limited).toBe(true);
    });

    it('should return false for Enterprise tier', async () => {
      const enterprisePlan = getPlanLimits('enterprise');
      const mockUsage = { api_calls: 1000000 };

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi
                .fn()
                .mockResolvedValue({ data: mockUsage, error: null }),
            }),
          }),
        }),
      });

      const limited = await isRateLimited(testCustomerId, enterprisePlan);

      expect(limited).toBe(false);
    });

    it('should handle no usage data', async () => {
      const freePlan = getPlanLimits('free');

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        }),
      });

      const limited = await isRateLimited(testCustomerId, freePlan);

      expect(limited).toBe(false);
    });
  });
});
