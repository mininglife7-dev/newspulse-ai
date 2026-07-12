import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockSupabaseClient = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
};

vi.mock('@/lib/supabase-server', () => ({
  createRouteClient: vi.fn(() => mockSupabaseClient),
}));

describe('Remediation Plans API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabaseClient.auth.getUser.mockReset();
    mockSupabaseClient.from.mockReset();
  });

  describe('GET - List Plans', () => {
    it('returns 400 when company_id is missing', async () => {
      const { GET } = await import('@/app/api/remediation-plans/route');
      const req = new Request('http://localhost/api/remediation-plans');
      const response = await GET(req);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('company_id is required');
    });

    it('returns 401 when not authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
      });

      const { GET } = await import('@/app/api/remediation-plans/route');
      const req = new Request('http://localhost/api/remediation-plans?company_id=co-1');
      const response = await GET(req);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.ok).toBe(false);
    });

    it('returns 404 when company not found', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: 'user-123' } },
      });

      mockSupabaseClient.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValueOnce({
          data: null,
          error: null,
        }),
      });

      const { GET } = await import('@/app/api/remediation-plans/route');
      const req = new Request('http://localhost/api/remediation-plans?company_id=invalid-co');
      const response = await GET(req);

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toContain('Company not found');
    });

    it('returns 403 when user not in workspace', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: 'user-123' } },
      });

      mockSupabaseClient.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValueOnce({
          data: { id: 'co-1', workspace_id: 'ws-1' },
          error: null,
        }),
      });

      mockSupabaseClient.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValueOnce({
          data: null,
          error: null,
        }),
      });

      const { GET } = await import('@/app/api/remediation-plans/route');
      const req = new Request('http://localhost/api/remediation-plans?company_id=co-1');
      const response = await GET(req);

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toContain('Access denied');
    });

    it('lists remediation plans with action progress', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: 'user-123' } },
      });

      mockSupabaseClient.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValueOnce({
          data: { id: 'co-1', workspace_id: 'ws-1' },
          error: null,
        }),
      });

      mockSupabaseClient.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValueOnce({
          data: { id: 'member-1' },
          error: null,
        }),
      });

      mockSupabaseClient.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValueOnce({
          data: [
            {
              id: 'plan-1',
              company_id: 'co-1',
              obligation_id: 'obl-1',
              title: 'Address Data Governance Gap',
              status: 'active',
              priority: 'high',
              target_completion_date: '2026-12-31',
              created_at: '2026-07-01T00:00:00Z',
              updated_at: '2026-07-01T00:00:00Z',
            },
          ],
          error: null,
        }),
      });

      mockSupabaseClient.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValueOnce({
          data: [
            { id: 'action-1', remediation_plan_id: 'plan-1', status: 'completed' },
            { id: 'action-2', remediation_plan_id: 'plan-1', status: 'pending' },
          ],
          error: null,
        }),
      });

      const { GET } = await import('@/app/api/remediation-plans/route');
      const req = new Request('http://localhost/api/remediation-plans?company_id=co-1');
      const response = await GET(req);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.ok).toBe(true);
      expect(data.plans).toHaveLength(1);
      expect(data.plans[0].actionProgress.completed).toBe(1);
      expect(data.plans[0].actionProgress.total).toBe(2);
      expect(data.plans[0].actionProgress.percentage).toBe(50);
    });

    it('filters plans by status', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: 'user-123' } },
      });

      mockSupabaseClient.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValueOnce({
          data: { id: 'co-1', workspace_id: 'ws-1' },
          error: null,
        }),
      });

      mockSupabaseClient.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValueOnce({
          data: { id: 'member-1' },
          error: null,
        }),
      });

      mockSupabaseClient.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValueOnce({
          data: [],
          error: null,
        }),
      });

      const { GET } = await import('@/app/api/remediation-plans/route');
      const req = new Request('http://localhost/api/remediation-plans?company_id=co-1&status=completed');
      const response = await GET(req);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.ok).toBe(true);
      expect(data.count).toBe(0);
    });
  });

  describe('POST - Create Plan', () => {
    it('returns 400 for invalid JSON', async () => {
      const { POST } = await import('@/app/api/remediation-plans/route');
      const req = new Request('http://localhost/api/remediation-plans', {
        method: 'POST',
        body: 'invalid json',
      });
      const response = await POST(req);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Invalid JSON');
    });

    it('returns 400 when company_id is missing', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: 'user-123' } },
      });

      const { POST } = await import('@/app/api/remediation-plans/route');
      const req = new Request('http://localhost/api/remediation-plans', {
        method: 'POST',
        body: JSON.stringify({ title: 'Plan' }),
      });
      const response = await POST(req);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('company_id is required');
    });

    it('returns 400 when obligation_id is missing', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: 'user-123' } },
      });

      const { POST } = await import('@/app/api/remediation-plans/route');
      const req = new Request('http://localhost/api/remediation-plans', {
        method: 'POST',
        body: JSON.stringify({ company_id: 'co-1', title: 'Plan' }),
      });
      const response = await POST(req);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('obligation_id is required');
    });

    it('returns 400 when title is missing', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: 'user-123' } },
      });

      const { POST } = await import('@/app/api/remediation-plans/route');
      const req = new Request('http://localhost/api/remediation-plans', {
        method: 'POST',
        body: JSON.stringify({ company_id: 'co-1', obligation_id: 'obl-1' }),
      });
      const response = await POST(req);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('title is required');
    });

    it('creates a remediation plan', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: 'user-123' } },
      });

      mockSupabaseClient.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValueOnce({
          data: { id: 'co-1', workspace_id: 'ws-1' },
          error: null,
        }),
      });

      mockSupabaseClient.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValueOnce({
          data: { id: 'member-1' },
          error: null,
        }),
      });

      mockSupabaseClient.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValueOnce({
          data: { id: 'obl-1' },
          error: null,
        }),
      });

      mockSupabaseClient.from.mockReturnValueOnce({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValueOnce({
          data: {
            id: 'plan-1',
            company_id: 'co-1',
            obligation_id: 'obl-1',
            title: 'Address Data Governance Gap',
            status: 'active',
            priority: 'high',
            target_completion_date: '2026-12-31',
          },
          error: null,
        }),
      });

      const { POST } = await import('@/app/api/remediation-plans/route');
      const req = new Request('http://localhost/api/remediation-plans', {
        method: 'POST',
        body: JSON.stringify({
          company_id: 'co-1',
          obligation_id: 'obl-1',
          title: 'Address Data Governance Gap',
          priority: 'high',
          target_completion_date: '2026-12-31',
        }),
      });
      const response = await POST(req);

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.ok).toBe(true);
      expect(data.plan.id).toBe('plan-1');
      expect(data.plan.status).toBe('active');
      expect(data.plan.actionProgress.completed).toBe(0);
      expect(data.plan.actionProgress.total).toBe(0);
    });

    it('returns 404 when obligation not found', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: 'user-123' } },
      });

      mockSupabaseClient.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValueOnce({
          data: { id: 'co-1', workspace_id: 'ws-1' },
          error: null,
        }),
      });

      mockSupabaseClient.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValueOnce({
          data: { id: 'member-1' },
          error: null,
        }),
      });

      mockSupabaseClient.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValueOnce({
          data: null,
          error: null,
        }),
      });

      const { POST } = await import('@/app/api/remediation-plans/route');
      const req = new Request('http://localhost/api/remediation-plans', {
        method: 'POST',
        body: JSON.stringify({
          company_id: 'co-1',
          obligation_id: 'invalid-obl',
          title: 'Plan',
        }),
      });
      const response = await POST(req);

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toContain('Obligation not found');
    });
  });
});
