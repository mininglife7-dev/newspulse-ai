import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Supabase client before importing
const mockSupabaseClient = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
};

vi.mock('@/lib/supabase-server', () => ({
  createRouteClient: vi.fn(() => mockSupabaseClient),
}));

describe('Gap Analysis API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabaseClient.auth.getUser.mockReset();
    mockSupabaseClient.from.mockReset();
  });

  describe('Authentication', () => {
    it('GET /gap-analysis returns 401 when not authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
      });

      const { GET } = await import('@/app/api/gap-analysis/route');
      const req = new Request('http://localhost/api/gap-analysis?company_id=co-1');
      const response = await GET(req);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.ok).toBe(false);
    });
  });

  describe('Input Validation', () => {
    it('returns 400 when company_id is missing', async () => {
      const { GET } = await import('@/app/api/gap-analysis/route');
      const req = new Request('http://localhost/api/gap-analysis');
      const response = await GET(req);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('company_id is required');
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

      const { GET } = await import('@/app/api/gap-analysis/route');
      const req = new Request('http://localhost/api/gap-analysis?company_id=invalid-co');
      const response = await GET(req);

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toContain('Company not found');
    });

    it('returns 403 when user not in company workspace', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: 'user-123' } },
      });

      // Mock company lookup
      mockSupabaseClient.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValueOnce({
          data: { id: 'co-1', workspace_id: 'ws-1' },
          error: null,
        }),
      });

      // Mock membership lookup (no membership)
      mockSupabaseClient.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValueOnce({
          data: null,
          error: null,
        }),
      });

      const { GET } = await import('@/app/api/gap-analysis/route');
      const req = new Request('http://localhost/api/gap-analysis?company_id=co-1');
      const response = await GET(req);

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toContain('Access denied');
    });
  });

  describe('Gap Analysis Results', () => {
    it('returns empty analysis when no obligations exist', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: 'user-123' } },
      });

      // Mock company lookup
      mockSupabaseClient.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValueOnce({
          data: { id: 'co-1', workspace_id: 'ws-1' },
          error: null,
        }),
      });

      // Mock membership lookup
      mockSupabaseClient.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValueOnce({
          data: { id: 'member-1' },
          error: null,
        }),
      });

      // Mock obligations (empty)
      mockSupabaseClient.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValueOnce({
          data: [],
          error: null,
        }),
      });

      // Mock evidence
      mockSupabaseClient.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValueOnce({
          data: [],
          error: null,
        }),
      });

      const { GET } = await import('@/app/api/gap-analysis/route');
      const req = new Request('http://localhost/api/gap-analysis?company_id=co-1');
      const response = await GET(req);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.ok).toBe(true);
      expect(data.metrics.totalObligations).toBe(0);
      // Score is 0 when no obligations (0% completion + 0% evidence + bonus for no gaps + bonus for no urgent)
      expect(data.complianceScore).toBeGreaterThanOrEqual(0);
      expect(data.complianceScore).toBeLessThanOrEqual(100);
    });

    it('calculates compliance metrics correctly', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: 'user-123' } },
      });

      // Mock company lookup
      mockSupabaseClient.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValueOnce({
          data: { id: 'co-1', workspace_id: 'ws-1' },
          error: null,
        }),
      });

      // Mock membership lookup
      mockSupabaseClient.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValueOnce({
          data: { id: 'member-1' },
          error: null,
        }),
      });

      // Mock obligations
      mockSupabaseClient.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValueOnce({
          data: [
            { id: 'obl-1', title: 'Test', status: 'completed', priority: 'high', due_date: null },
            { id: 'obl-2', title: 'Test 2', status: 'identified', priority: 'medium', due_date: null },
          ],
          error: null,
        }),
      });

      // Mock evidence
      mockSupabaseClient.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValueOnce({
          data: [
            { id: 'ev-1', obligation_id: 'obl-1', status: 'approved' },
          ],
          error: null,
        }),
      });

      const { GET } = await import('@/app/api/gap-analysis/route');
      const req = new Request('http://localhost/api/gap-analysis?company_id=co-1');
      const response = await GET(req);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.ok).toBe(true);
      expect(data.metrics.totalObligations).toBe(2);
      expect(data.metrics.completedObligations).toBe(1);
      expect(data.metrics.compliancePercentage).toBe(50); // 1/2 completed
      expect(data.gaps.length).toBe(1); // obl-2 has no evidence
    });

    it('identifies critical gaps correctly', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: 'user-123' } },
      });

      // Mock company lookup
      mockSupabaseClient.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValueOnce({
          data: { id: 'co-1', workspace_id: 'ws-1' },
          error: null,
        }),
      });

      // Mock membership lookup
      mockSupabaseClient.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValueOnce({
          data: { id: 'member-1' },
          error: null,
        }),
      });

      // Mock obligations with critical gap
      mockSupabaseClient.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValueOnce({
          data: [
            { id: 'obl-1', title: 'Critical obligation', status: 'identified', priority: 'critical', due_date: null },
          ],
          error: null,
        }),
      });

      // Mock evidence (none)
      mockSupabaseClient.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValueOnce({
          data: [],
          error: null,
        }),
      });

      const { GET } = await import('@/app/api/gap-analysis/route');
      const req = new Request('http://localhost/api/gap-analysis?company_id=co-1');
      const response = await GET(req);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.ok).toBe(true);
      expect(data.summary.criticalGaps).toBe(1);
      expect(data.gaps[0].priority).toBe('critical');
    });
  });

  describe('Recommendations', () => {
    it('generates recommendations based on compliance state', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: 'user-123' } },
      });

      // Mock company lookup
      mockSupabaseClient.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValueOnce({
          data: { id: 'co-1', workspace_id: 'ws-1' },
          error: null,
        }),
      });

      // Mock membership lookup
      mockSupabaseClient.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValueOnce({
          data: { id: 'member-1' },
          error: null,
        }),
      });

      // Mock obligations
      mockSupabaseClient.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValueOnce({
          data: [
            { id: 'obl-1', title: 'Test', status: 'in_progress', priority: 'critical', due_date: null },
          ],
          error: null,
        }),
      });

      // Mock evidence
      mockSupabaseClient.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValueOnce({
          data: [],
          error: null,
        }),
      });

      const { GET } = await import('@/app/api/gap-analysis/route');
      const req = new Request('http://localhost/api/gap-analysis?company_id=co-1');
      const response = await GET(req);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.recommendations.length).toBeGreaterThan(0);
      expect(data.recommendations.some((r: string) => r.includes('critical'))).toBe(true);
    });
  });

  describe('Compliance Score', () => {
    it('calculates compliance score between 0-100', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: 'user-123' } },
      });

      // Mock company lookup
      mockSupabaseClient.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValueOnce({
          data: { id: 'co-1', workspace_id: 'ws-1' },
          error: null,
        }),
      });

      // Mock membership lookup
      mockSupabaseClient.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValueOnce({
          data: { id: 'member-1' },
          error: null,
        }),
      });

      // Mock obligations
      mockSupabaseClient.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValueOnce({
          data: [
            { id: 'obl-1', title: 'Test', status: 'completed', priority: 'high', due_date: null },
          ],
          error: null,
        }),
      });

      // Mock evidence
      mockSupabaseClient.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValueOnce({
          data: [
            { id: 'ev-1', obligation_id: 'obl-1', status: 'approved' },
          ],
          error: null,
        }),
      });

      const { GET } = await import('@/app/api/gap-analysis/route');
      const req = new Request('http://localhost/api/gap-analysis?company_id=co-1');
      const response = await GET(req);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.complianceScore).toBeGreaterThanOrEqual(0);
      expect(data.complianceScore).toBeLessThanOrEqual(100);
    });
  });
});
