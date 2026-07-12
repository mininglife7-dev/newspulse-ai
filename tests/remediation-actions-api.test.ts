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

describe('Remediation Actions API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabaseClient.auth.getUser.mockReset();
    mockSupabaseClient.from.mockReset();
  });

  describe('GET - List Actions', () => {
    it('returns 400 when remediation_plan_id is missing', async () => {
      const { GET } = await import('@/app/api/remediation-actions/route');
      const req = new Request('http://localhost/api/remediation-actions');
      const response = await GET(req);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('remediation_plan_id is required');
    });

    it('returns 401 when not authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
      });

      const { GET } = await import('@/app/api/remediation-actions/route');
      const req = new Request('http://localhost/api/remediation-actions?remediation_plan_id=plan-1');
      const response = await GET(req);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.ok).toBe(false);
    });

    it('returns 404 when plan not found', async () => {
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

      const { GET } = await import('@/app/api/remediation-actions/route');
      const req = new Request('http://localhost/api/remediation-actions?remediation_plan_id=invalid-plan');
      const response = await GET(req);

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toContain('Remediation plan not found');
    });

    it('lists remediation actions for a plan', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: 'user-123' } },
      });

      mockSupabaseClient.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValueOnce({
          data: { id: 'plan-1', company_id: 'co-1' },
          error: null,
        }),
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
              id: 'action-1',
              remediation_plan_id: 'plan-1',
              title: 'Document data handling process',
              status: 'completed',
              due_date: '2026-08-15',
              completed_at: '2026-08-10T00:00:00Z',
              created_at: '2026-07-01T00:00:00Z',
              updated_at: '2026-08-10T00:00:00Z',
            },
            {
              id: 'action-2',
              remediation_plan_id: 'plan-1',
              title: 'Implement audit logging',
              status: 'pending',
              due_date: '2026-09-30',
              completed_at: null,
              created_at: '2026-07-01T00:00:00Z',
              updated_at: '2026-07-01T00:00:00Z',
            },
          ],
          error: null,
        }),
      });

      const { GET } = await import('@/app/api/remediation-actions/route');
      const req = new Request('http://localhost/api/remediation-actions?remediation_plan_id=plan-1');
      const response = await GET(req);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.ok).toBe(true);
      expect(data.count).toBe(2);
      expect(data.actions[0].status).toBe('completed');
      expect(data.actions[1].status).toBe('pending');
    });

    it('returns 403 when user not in workspace', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: 'user-123' } },
      });

      mockSupabaseClient.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValueOnce({
          data: { id: 'plan-1', company_id: 'co-1' },
          error: null,
        }),
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

      const { GET } = await import('@/app/api/remediation-actions/route');
      const req = new Request('http://localhost/api/remediation-actions?remediation_plan_id=plan-1');
      const response = await GET(req);

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toContain('Access denied');
    });
  });

  describe('POST - Create Action', () => {
    it('returns 400 for invalid JSON', async () => {
      const { POST } = await import('@/app/api/remediation-actions/route');
      const req = new Request('http://localhost/api/remediation-actions', {
        method: 'POST',
        body: 'invalid json',
      });
      const response = await POST(req);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Invalid JSON');
    });

    it('returns 400 when remediation_plan_id is missing', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: 'user-123' } },
      });

      const { POST } = await import('@/app/api/remediation-actions/route');
      const req = new Request('http://localhost/api/remediation-actions', {
        method: 'POST',
        body: JSON.stringify({ title: 'Action' }),
      });
      const response = await POST(req);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('remediation_plan_id is required');
    });

    it('returns 400 when title is missing', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: 'user-123' } },
      });

      const { POST } = await import('@/app/api/remediation-actions/route');
      const req = new Request('http://localhost/api/remediation-actions', {
        method: 'POST',
        body: JSON.stringify({ remediation_plan_id: 'plan-1' }),
      });
      const response = await POST(req);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('title is required');
    });

    it('creates a remediation action', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: 'user-123' } },
      });

      mockSupabaseClient.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValueOnce({
          data: { id: 'plan-1', company_id: 'co-1' },
          error: null,
        }),
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
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValueOnce({
          data: {
            id: 'action-1',
            remediation_plan_id: 'plan-1',
            title: 'Document data handling process',
            status: 'pending',
            due_date: '2026-08-15',
            completed_at: null,
          },
          error: null,
        }),
      });

      const { POST } = await import('@/app/api/remediation-actions/route');
      const req = new Request('http://localhost/api/remediation-actions', {
        method: 'POST',
        body: JSON.stringify({
          remediation_plan_id: 'plan-1',
          title: 'Document data handling process',
          due_date: '2026-08-15',
        }),
      });
      const response = await POST(req);

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.ok).toBe(true);
      expect(data.action.id).toBe('action-1');
      expect(data.action.status).toBe('pending');
      expect(data.action.title).toBe('Document data handling process');
    });

    it('returns 404 when plan not found', async () => {
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

      const { POST } = await import('@/app/api/remediation-actions/route');
      const req = new Request('http://localhost/api/remediation-actions', {
        method: 'POST',
        body: JSON.stringify({
          remediation_plan_id: 'invalid-plan',
          title: 'Action',
        }),
      });
      const response = await POST(req);

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toContain('Remediation plan not found');
    });
  });

  describe('PATCH - Update Action', () => {
    it('updates action status to completed with timestamp', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: 'user-123' } },
      });

      mockSupabaseClient.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValueOnce({
          data: { id: 'action-1', remediation_plan_id: 'plan-1' },
          error: null,
        }),
      });

      mockSupabaseClient.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValueOnce({
          data: { id: 'plan-1', company_id: 'co-1' },
          error: null,
        }),
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
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValueOnce({
          data: {
            id: 'action-1',
            remediation_plan_id: 'plan-1',
            status: 'completed',
            completed_at: '2026-07-12T12:00:00Z',
          },
          error: null,
        }),
      });

      const { PATCH } = await import('@/app/api/remediation-actions/[id]/route');
      const req = new Request('http://localhost/api/remediation-actions/action-1', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'completed' }),
      });
      const response = await PATCH(req, { params: Promise.resolve({ id: 'action-1' }) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.ok).toBe(true);
      expect(data.action.status).toBe('completed');
      expect(data.action.completed_at).toBeDefined();
    });
  });

  describe('DELETE - Remove Action', () => {
    it('deletes a remediation action', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: 'user-123' } },
      });

      mockSupabaseClient.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValueOnce({
          data: { id: 'action-1', remediation_plan_id: 'plan-1' },
          error: null,
        }),
      });

      mockSupabaseClient.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValueOnce({
          data: { id: 'plan-1', company_id: 'co-1' },
          error: null,
        }),
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
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValueOnce({
          error: null,
        }),
      });

      const { DELETE } = await import('@/app/api/remediation-actions/[id]/route');
      const req = new Request('http://localhost/api/remediation-actions/action-1', {
        method: 'DELETE',
      });
      const response = await DELETE(req, { params: Promise.resolve({ id: 'action-1' }) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.ok).toBe(true);
      expect(data.message).toContain('deleted successfully');
    });
  });
});
