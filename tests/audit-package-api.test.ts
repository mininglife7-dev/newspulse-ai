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

describe('Audit Package API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabaseClient.auth.getUser.mockReset();
    mockSupabaseClient.from.mockReset();
  });

  describe('POST - Generate Audit Package', () => {
    describe('Authentication', () => {
      it('returns 401 when not authenticated', async () => {
        mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
          data: { user: null },
        });

        const { POST } = await import('@/app/api/audit-package/route');
        const req = new Request('http://localhost/api/audit-package', {
          method: 'POST',
          body: JSON.stringify({ company_id: 'co-1' }),
        });
        const response = await POST(req);

        expect(response.status).toBe(401);
        const data = await response.json();
        expect(data.ok).toBe(false);
        expect(data.error).toContain('Authentication required');
      });
    });

    describe('Input Validation', () => {
      it('returns 400 for invalid JSON', async () => {
        const { POST } = await import('@/app/api/audit-package/route');
        const req = new Request('http://localhost/api/audit-package', {
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

        const { POST } = await import('@/app/api/audit-package/route');
        const req = new Request('http://localhost/api/audit-package', {
          method: 'POST',
          body: JSON.stringify({}),
        });
        const response = await POST(req);

        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.error).toContain('company_id is required');
      });

      it('returns 400 for invalid format', async () => {
        mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
          data: { user: { id: 'user-123' } },
        });

        const { POST } = await import('@/app/api/audit-package/route');
        const req = new Request('http://localhost/api/audit-package', {
          method: 'POST',
          body: JSON.stringify({ company_id: 'co-1', format: 'xml' }),
        });
        const response = await POST(req);

        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.error).toContain('json" or "pdf');
      });
    });

    describe('Company Access', () => {
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

        const { POST } = await import('@/app/api/audit-package/route');
        const req = new Request('http://localhost/api/audit-package', {
          method: 'POST',
          body: JSON.stringify({ company_id: 'invalid-co' }),
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
            data: { id: 'co-1', workspace_id: 'ws-1', name: 'Test Company' },
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

        const { POST } = await import('@/app/api/audit-package/route');
        const req = new Request('http://localhost/api/audit-package', {
          method: 'POST',
          body: JSON.stringify({ company_id: 'co-1' }),
        });
        const response = await POST(req);

        expect(response.status).toBe(403);
        const data = await response.json();
        expect(data.error).toContain('Access denied');
      });
    });

    describe('Audit Package Generation', () => {
      it('generates JSON format audit package with all data', async () => {
        mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
          data: { user: { id: 'user-123' } },
        });

        // Mock company lookup
        mockSupabaseClient.from.mockReturnValueOnce({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValueOnce({
            data: { id: 'co-1', workspace_id: 'ws-1', name: 'Test Company' },
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
              {
                id: 'obl-1',
                title: 'Data Governance',
                status: 'completed',
                priority: 'high',
                due_date: '2026-12-31',
                description: 'Test obligation',
                source: 'EU AI Act',
              },
            ],
            error: null,
          }),
        });

        // Mock evidence
        mockSupabaseClient.from.mockReturnValueOnce({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValueOnce({
            data: [
              {
                id: 'ev-1',
                obligation_id: 'obl-1',
                title: 'Data Policy',
                file_type: 'pdf',
                status: 'approved',
                created_at: '2026-07-01T00:00:00Z',
              },
            ],
            error: null,
          }),
        });

        // Mock risk assessments
        mockSupabaseClient.from.mockReturnValueOnce({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValueOnce({
            data: [
              {
                id: 'ra-1',
                ai_system_id: 'sys-1',
                risk_level: 'high',
                risk_score: 72,
                created_at: '2026-07-01T00:00:00Z',
              },
            ],
            error: null,
          }),
        });

        // Mock ai_systems
        mockSupabaseClient.from.mockReturnValueOnce({
          select: vi.fn().mockResolvedValueOnce({
            data: [{ id: 'sys-1', name: 'Recommendation Engine' }],
            error: null,
          }),
        });

        const { POST } = await import('@/app/api/audit-package/route');
        const req = new Request('http://localhost/api/audit-package', {
          method: 'POST',
          body: JSON.stringify({ company_id: 'co-1', format: 'json' }),
        });
        const response = await POST(req);

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.ok).toBe(true);
        expect(data.format).toBe('json');
        expect(data.companyId).toBe('co-1');
        expect(data.companyName).toBe('Test Company');
        expect(data.generatedAt).toBeDefined();
        expect(data.content).toBeDefined();
        expect(data.content.summary).toBeDefined();
        expect(data.content.obligations).toHaveLength(1);
        expect(data.metadata).toBeDefined();
        expect(data.metadata.pageCount).toBeGreaterThan(0);
      });

      it('returns 400 when no obligations exist', async () => {
        mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
          data: { user: { id: 'user-123' } },
        });

        // Mock company lookup
        mockSupabaseClient.from.mockReturnValueOnce({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValueOnce({
            data: { id: 'co-1', workspace_id: 'ws-1', name: 'Test Company' },
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

        // Mock empty obligations
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

        // Mock risk assessments
        mockSupabaseClient.from.mockReturnValueOnce({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValueOnce({
            data: [],
            error: null,
          }),
        });

        const { POST } = await import('@/app/api/audit-package/route');
        const req = new Request('http://localhost/api/audit-package', {
          method: 'POST',
          body: JSON.stringify({ company_id: 'co-1' }),
        });
        const response = await POST(req);

        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.error).toContain('No obligations found');
      });

      it('generates PDF format response', async () => {
        mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
          data: { user: { id: 'user-123' } },
        });

        // Mock company lookup
        mockSupabaseClient.from.mockReturnValueOnce({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValueOnce({
            data: { id: 'co-1', workspace_id: 'ws-1', name: 'Test Company' },
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
              {
                id: 'obl-1',
                title: 'Data Governance',
                status: 'completed',
                priority: 'high',
                due_date: '2026-12-31',
                description: 'Test',
                source: 'EU AI Act',
              },
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

        // Mock risk assessments
        mockSupabaseClient.from.mockReturnValueOnce({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValueOnce({
            data: [],
            error: null,
          }),
        });

        // Mock ai_systems
        mockSupabaseClient.from.mockReturnValueOnce({
          select: vi.fn().mockResolvedValueOnce({
            data: [],
            error: null,
          }),
        });

        const { POST } = await import('@/app/api/audit-package/route');
        const req = new Request('http://localhost/api/audit-package', {
          method: 'POST',
          body: JSON.stringify({ company_id: 'co-1', format: 'pdf' }),
        });
        const response = await POST(req);

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.ok).toBe(true);
        expect(data.format).toBe('pdf');
        expect(data.message).toContain('PDF generation requires integration');
        expect(data.jsonContent).toBeDefined();
        expect(data.pdfExportUrl).toBeNull();
      });

      it('handles database errors gracefully', async () => {
        mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
          data: { user: { id: 'user-123' } },
        });

        // Mock company lookup
        mockSupabaseClient.from.mockReturnValueOnce({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValueOnce({
            data: { id: 'co-1', workspace_id: 'ws-1', name: 'Test Company' },
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

        // Mock obligations with error
        mockSupabaseClient.from.mockReturnValueOnce({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValueOnce({
            data: null,
            error: null,
          }),
        });

        const { POST } = await import('@/app/api/audit-package/route');
        const req = new Request('http://localhost/api/audit-package', {
          method: 'POST',
          body: JSON.stringify({ company_id: 'co-1' }),
        });
        const response = await POST(req);

        expect(response.status).toBe(500);
        const data = await response.json();
        expect(data.ok).toBe(false);
        expect(data.error).toContain('generation failed');
      });
    });

    describe('Include Flags', () => {
      it('respects includeEvidence flag', async () => {
        mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
          data: { user: { id: 'user-123' } },
        });

        // Mock company lookup
        mockSupabaseClient.from.mockReturnValueOnce({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValueOnce({
            data: { id: 'co-1', workspace_id: 'ws-1', name: 'Test Company' },
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
              {
                id: 'obl-1',
                title: 'Test',
                status: 'completed',
                priority: 'high',
                due_date: null,
                description: 'Test',
                source: 'EU AI Act',
              },
            ],
            error: null,
          }),
        });

        // Mock evidence
        mockSupabaseClient.from.mockReturnValueOnce({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValueOnce({
            data: [{ id: 'ev-1', obligation_id: 'obl-1', title: 'Doc', file_type: 'pdf', status: 'approved', created_at: '2026-07-01T00:00:00Z' }],
            error: null,
          }),
        });

        // Mock risk assessments
        mockSupabaseClient.from.mockReturnValueOnce({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValueOnce({
            data: [],
            error: null,
          }),
        });

        // Mock ai_systems
        mockSupabaseClient.from.mockReturnValueOnce({
          select: vi.fn().mockResolvedValueOnce({
            data: [],
            error: null,
          }),
        });

        const { POST } = await import('@/app/api/audit-package/route');
        const req = new Request('http://localhost/api/audit-package', {
          method: 'POST',
          body: JSON.stringify({ company_id: 'co-1', includeEvidence: true }),
        });
        const response = await POST(req);

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.ok).toBe(true);
        expect(data.content.obligations[0].evidence).toBeDefined();
      });
    });
  });

  describe('GET - List Audit Packages', () => {
    it('returns 401 when not authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
      });

      const { GET } = await import('@/app/api/audit-package/route');
      const req = new Request('http://localhost/api/audit-package?company_id=co-1');
      const response = await GET(req);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.ok).toBe(false);
    });

    it('returns 400 when company_id is missing', async () => {
      const { GET } = await import('@/app/api/audit-package/route');
      const req = new Request('http://localhost/api/audit-package');
      const response = await GET(req);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('company_id is required');
    });

    it('returns placeholder response for on-demand generation', async () => {
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

      const { GET } = await import('@/app/api/audit-package/route');
      const req = new Request('http://localhost/api/audit-package?company_id=co-1');
      const response = await GET(req);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.ok).toBe(true);
      expect(data.message).toContain('on-demand');
      expect(data.packages).toEqual([]);
    });
  });
});
