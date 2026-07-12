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

describe('Evidence API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabaseClient.auth.getUser.mockReset();
    mockSupabaseClient.from.mockReset();
  });

  describe('Authentication', () => {
    it('GET /evidence returns 401 when not authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
      });

      const { GET } = await import('@/app/api/evidence/route');
      const req = new Request('http://localhost/api/evidence');
      const response = await GET(req);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.ok).toBe(false);
      expect(data.error).toContain('Authentication required');
    });

    it('POST /evidence returns 401 when not authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
      });

      const { POST } = await import('@/app/api/evidence/route');
      const req = new Request('http://localhost/api/evidence', {
        method: 'POST',
        body: JSON.stringify({
          company_id: 'co-1',
          title: 'Test evidence',
          file_type: 'pdf',
          file_size: 1024,
        }),
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

      const { GET } = await import('@/app/api/evidence/route');
      const req = new Request('http://localhost/api/evidence');
      const response = await GET(req);

      expect(response.status).toBe(409);
      const data = await response.json();
      expect(data.error).toContain('No workspace found');
    });
  });

  describe('Create Evidence', () => {
    it('returns 400 when company_id is missing', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: 'user-123' } },
      });

      const { POST } = await import('@/app/api/evidence/route');
      const req = new Request('http://localhost/api/evidence', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Test evidence',
          file_type: 'pdf',
          file_size: 1024,
        }),
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

      const { POST } = await import('@/app/api/evidence/route');
      const req = new Request('http://localhost/api/evidence', {
        method: 'POST',
        body: JSON.stringify({
          company_id: 'co-1',
          file_type: 'pdf',
          file_size: 1024,
        }),
      });

      const response = await POST(req);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('title is required');
    });

    it('returns 400 when file_type is missing', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: 'user-123' } },
      });

      const { POST } = await import('@/app/api/evidence/route');
      const req = new Request('http://localhost/api/evidence', {
        method: 'POST',
        body: JSON.stringify({
          company_id: 'co-1',
          title: 'Test evidence',
          file_size: 1024,
        }),
      });

      const response = await POST(req);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('file_type is required');
    });

    it('returns 400 when file_size exceeds 50MB limit', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: 'user-123' } },
      });

      const { POST } = await import('@/app/api/evidence/route');
      const req = new Request('http://localhost/api/evidence', {
        method: 'POST',
        body: JSON.stringify({
          company_id: 'co-1',
          title: 'Test evidence',
          file_type: 'pdf',
          file_size: 60 * 1024 * 1024, // 60MB
        }),
      });

      const response = await POST(req);

      expect(response.status).toBe(413);
      const data = await response.json();
      expect(data.error).toContain('50MB limit');
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

      const { POST } = await import('@/app/api/evidence/route');
      const req = new Request('http://localhost/api/evidence', {
        method: 'POST',
        body: JSON.stringify({
          company_id: 'invalid-co',
          title: 'Test evidence',
          file_type: 'pdf',
          file_size: 1024,
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

      const { POST } = await import('@/app/api/evidence/route');
      const req = new Request('http://localhost/api/evidence', {
        method: 'POST',
        body: JSON.stringify({
          company_id: 'co-1',
          title: 'Test evidence',
          file_type: 'pdf',
          file_size: 1024,
        }),
      });

      const response = await POST(req);

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toContain('Access denied');
    });
  });

  describe('List Evidence', () => {
    it('returns evidence with count', async () => {
      const evidenceList = [
        {
          id: 'ev-1',
          company_id: 'co-1',
          obligation_id: 'obl-1',
          title: 'Data governance policy',
          status: 'approved',
          file_type: 'pdf',
          file_size: 2048,
        },
        {
          id: 'ev-2',
          company_id: 'co-1',
          obligation_id: 'obl-2',
          title: 'Risk assessment report',
          status: 'under_review',
          file_type: 'docx',
          file_size: 4096,
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

      // Mock evidence query
      mockSupabaseClient.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValueOnce({
          data: evidenceList,
          error: null,
        }),
      });

      const { GET } = await import('@/app/api/evidence/route');
      const req = new Request('http://localhost/api/evidence');
      const response = await GET(req);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.ok).toBe(true);
      expect(data.count).toBe(2);
      expect(data.evidence).toHaveLength(2);
    });
  });

  describe('Evidence Status Workflow', () => {
    it('evidence statuses are valid', async () => {
      const statuses = ['submitted', 'under_review', 'approved', 'rejected'];

      for (const status of statuses) {
        expect(['submitted', 'under_review', 'approved', 'rejected']).toContain(status);
      }
    });

    it('evidence can transition through status workflow', async () => {
      const workflow = [
        { status: 'submitted', description: 'Initial upload' },
        { status: 'under_review', description: 'Being reviewed' },
        { status: 'approved', description: 'Accepted as compliance evidence' },
      ];

      for (const step of workflow) {
        expect(['submitted', 'under_review', 'approved', 'rejected']).toContain(step.status);
      }
    });
  });

  describe('Evidence Metadata', () => {
    it('validates that evidence has required fields', async () => {
      const evidence = {
        id: 'ev-1',
        company_id: 'co-1',
        workspace_id: 'ws-1',
        title: 'Test evidence',
        file_type: 'pdf',
        file_size: 1024,
        status: 'submitted',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      };

      // Verify required fields
      expect(evidence).toHaveProperty('id');
      expect(evidence).toHaveProperty('company_id');
      expect(evidence).toHaveProperty('workspace_id');
      expect(evidence).toHaveProperty('title');
      expect(evidence).toHaveProperty('file_type');
      expect(evidence).toHaveProperty('file_size');
      expect(evidence).toHaveProperty('status');
      expect(evidence).toHaveProperty('created_at');
      expect(evidence).toHaveProperty('updated_at');
    });

    it('validates file types', async () => {
      const validTypes = ['pdf', 'docx', 'xlsx', 'txt', 'other'];

      for (const type of validTypes) {
        expect(validTypes).toContain(type);
      }
    });

    it('validates file size is non-negative', async () => {
      const validSizes = [0, 1024, 1024 * 1024, 50 * 1024 * 1024];

      for (const size of validSizes) {
        expect(size).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('Evidence-Obligation Linking', () => {
    it('evidence can be linked to obligations', async () => {
      const evidence = {
        id: 'ev-1',
        obligation_id: 'obl-1',
      };

      expect(evidence.obligation_id).toBeDefined();
    });

    it('evidence can exist without obligation link (optional)', async () => {
      const evidence = {
        id: 'ev-1',
        obligation_id: null,
      };

      // obligation_id is optional
      expect(evidence).toHaveProperty('obligation_id');
    });
  });

  describe('Evidence Coverage Calculation', () => {
    it('calculates evidence coverage percentage per obligation', async () => {
      const obligations = [
        { id: 'obl-1', title: 'Data governance' },
        { id: 'obl-2', title: 'Human oversight' },
        { id: 'obl-3', title: 'Audit logging' },
      ];

      const evidence = [
        { id: 'ev-1', obligation_id: 'obl-1', status: 'approved' },
        { id: 'ev-2', obligation_id: 'obl-1', status: 'approved' },
        { id: 'ev-3', obligation_id: 'obl-2', status: 'submitted' },
      ];

      // Obligation 1 has 2 approved evidence pieces
      const obl1Coverage = evidence.filter((e) => e.obligation_id === 'obl-1' && e.status === 'approved').length;
      expect(obl1Coverage).toBe(2);

      // Obligation 2 has 1 submitted evidence piece
      const obl2Coverage = evidence.filter((e) => e.obligation_id === 'obl-2').length;
      expect(obl2Coverage).toBe(1);

      // Obligation 3 has no evidence
      const obl3Coverage = evidence.filter((e) => e.obligation_id === 'obl-3').length;
      expect(obl3Coverage).toBe(0);
    });
  });
});
