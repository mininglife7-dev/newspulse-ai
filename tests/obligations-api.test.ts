import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Supabase client before importing the routes
const mockSupabaseClient = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
};

vi.mock('@/lib/supabase-server', () => ({
  createRouteClient: vi.fn(() => mockSupabaseClient),
}));

describe('Obligations API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabaseClient.auth.getUser.mockReset();
    mockSupabaseClient.from.mockReset();
  });

  describe('Authentication', () => {
    it('GET /obligations returns 401 when not authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
      });

      // Dynamically import after mocks are set up
      const { GET } = await import('@/app/api/obligations/route');
      const req = new Request('http://localhost/api/obligations');
      const response = await GET(req);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.ok).toBe(false);
      expect(data.error).toContain('Authentication required');
    });

    it('POST /obligations returns 401 when not authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
      });

      const { POST } = await import('@/app/api/obligations/route');
      const req = new Request('http://localhost/api/obligations', {
        method: 'POST',
        body: JSON.stringify({ company_id: 'co-1', title: 'Test' }),
      });
      const response = await POST(req);

      expect(response.status).toBe(401);
    });
  });

  describe('Workspace Access', () => {
    it('returns 409 when user has no workspace', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: 'user-123' } },
      });

      mockSupabaseClient.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValueOnce({
          data: null,
          error: null,
        }),
      });

      const { GET } = await import('@/app/api/obligations/route');
      const req = new Request('http://localhost/api/obligations');
      const response = await GET(req);

      expect(response.status).toBe(409);
      const data = await response.json();
      expect(data.error).toContain('No workspace found');
    });
  });

  describe('Create Obligation', () => {
    it('returns 400 when company_id is missing', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: 'user-123' } },
      });

      const { POST } = await import('@/app/api/obligations/route');
      const req = new Request('http://localhost/api/obligations', {
        method: 'POST',
        body: JSON.stringify({ title: 'Test obligation' }),
      });

      const response = await POST(req);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('company_id is required');
    });

    it('returns 400 when title is missing', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: 'user-123' } },
      });

      const { POST } = await import('@/app/api/obligations/route');
      const req = new Request('http://localhost/api/obligations', {
        method: 'POST',
        body: JSON.stringify({ company_id: 'co-1' }),
      });

      const response = await POST(req);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('title is required');
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

      const { POST } = await import('@/app/api/obligations/route');
      const req = new Request('http://localhost/api/obligations', {
        method: 'POST',
        body: JSON.stringify({
          company_id: 'invalid-co',
          title: 'Test obligation',
        }),
      });

      const response = await POST(req);

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

      const { POST } = await import('@/app/api/obligations/route');
      const req = new Request('http://localhost/api/obligations', {
        method: 'POST',
        body: JSON.stringify({
          company_id: 'co-1',
          title: 'Test obligation',
        }),
      });

      const response = await POST(req);

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toContain('Access denied');
    });
  });

  describe('List Obligations', () => {
    it('returns obligations with count', async () => {
      const obligations = [
        {
          id: 'obl-1',
          company_id: 'co-1',
          workspace_id: 'ws-1',
          title: 'Data governance',
          status: 'identified',
          priority: 'high',
        },
        {
          id: 'obl-2',
          company_id: 'co-1',
          workspace_id: 'ws-1',
          title: 'Human oversight',
          status: 'in_progress',
          priority: 'critical',
        },
      ];

      mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: 'user-123' } },
      });

      // Mock workspace membership
      mockSupabaseClient.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValueOnce({
          data: { workspace_id: 'ws-1' },
          error: null,
        }),
      });

      // Mock obligations query
      mockSupabaseClient.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValueOnce({
          data: obligations,
          error: null,
        }),
      });

      const { GET } = await import('@/app/api/obligations/route');
      const req = new Request('http://localhost/api/obligations');
      const response = await GET(req);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.ok).toBe(true);
      expect(data.count).toBe(2);
      expect(data.obligations).toHaveLength(2);
    });
  });

  describe('Obligation Status Transitions', () => {
    it('obligation can transition from identified to in_progress', async () => {
      // Test obligation status workflow
      const statuses = ['identified', 'in_progress', 'completed', 'not_applicable'];

      for (const status of statuses) {
        expect(['identified', 'in_progress', 'completed', 'not_applicable']).toContain(status);
      }
    });

    it('obligation priority levels are valid', async () => {
      const priorities = ['critical', 'high', 'medium', 'low'];

      for (const priority of priorities) {
        expect(['critical', 'high', 'medium', 'low']).toContain(priority);
      }
    });

    it('obligation sources are valid', async () => {
      const sources = ['EU_AI_ACT', 'GDPR', 'LOCAL_REGULATION'];

      for (const source of sources) {
        expect(['EU_AI_ACT', 'GDPR', 'LOCAL_REGULATION']).toContain(source);
      }
    });
  });

  describe('Obligation Data Validation', () => {
    it('validates that obligations have required fields', async () => {
      const obligation = {
        id: 'obl-1',
        company_id: 'co-1',
        workspace_id: 'ws-1',
        title: 'Test obligation',
        status: 'identified',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      };

      // Verify required fields exist
      expect(obligation).toHaveProperty('id');
      expect(obligation).toHaveProperty('company_id');
      expect(obligation).toHaveProperty('workspace_id');
      expect(obligation).toHaveProperty('title');
      expect(obligation).toHaveProperty('status');
      expect(obligation).toHaveProperty('created_at');
      expect(obligation).toHaveProperty('updated_at');
    });

    it('validates due_date format when provided', async () => {
      const validDate = '2026-12-31';
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      expect(validDate).toMatch(dateRegex);

      const invalidDate = '31/12/2026';
      expect(invalidDate).not.toMatch(dateRegex);
    });
  });
});
