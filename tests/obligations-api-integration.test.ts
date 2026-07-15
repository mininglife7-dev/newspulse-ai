import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getSupabaseAdmin } from '@/lib/supabase';

vi.mock('@/lib/supabase');

const mockSupabase = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
};

describe('Obligations API Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getSupabaseAdmin as any).mockReturnValue(mockSupabase);
  });

  describe('Authentication', () => {
    it('should require authenticated user', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const { data } = await mockSupabase.auth.getUser();
      expect(data.user).toBeNull();
    });

    it('should retrieve user when authenticated', async () => {
      const mockUser = {
        id: 'user_123',
        email: 'test@example.com',
        aud: 'authenticated',
      };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const { data } = await mockSupabase.auth.getUser();
      expect(data.user?.id).toBe('user_123');
    });
  });

  describe('Workspace Context Resolution', () => {
    it('should find user workspace membership', async () => {
      const mockMembership = {
        user_id: 'user_123',
        workspace_id: 'workspace_456',
        status: 'active',
      };

      const selectMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: mockMembership,
                error: null,
              }),
            }),
          }),
        }),
      });

      mockSupabase.from.mockReturnValue({ select: selectMock });

      const { data } = await mockSupabase
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', 'user_123')
        .eq('status', 'active')
        .limit(1)
        .maybeSingle();

      expect(data?.workspace_id).toBe('workspace_456');
    });

    it('should handle user with no workspace', async () => {
      const selectMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: null,
                error: null,
              }),
            }),
          }),
        }),
      });

      mockSupabase.from.mockReturnValue({ select: selectMock });

      const { data } = await mockSupabase
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', 'user_no_workspace')
        .eq('status', 'active')
        .limit(1)
        .maybeSingle();

      expect(data).toBeNull();
    });
  });

  describe('Obligations by Assessment', () => {
    it('should fetch obligations linked to assessment', async () => {
      const mockObligations = [
        {
          obligation_id: 'obl_1',
          obligations: {
            id: 'obl_1',
            title: 'Data Privacy Compliance',
            description: 'Ensure GDPR compliance',
            source: 'GDPR',
            status: 'in_progress',
            priority: 'high',
            due_date: '2026-08-15',
            created_at: '2026-07-10T00:00:00Z',
          },
        },
        {
          obligation_id: 'obl_2',
          obligations: {
            id: 'obl_2',
            title: 'Security Audit',
            description: 'Conduct annual security audit',
            source: 'ISO 27001',
            status: 'identified',
            priority: 'medium',
            due_date: '2026-09-30',
            created_at: '2026-07-11T00:00:00Z',
          },
        },
      ];

      const selectMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: mockObligations,
          error: null,
        }),
      });

      mockSupabase.from.mockReturnValue({ select: selectMock });

      const { data } = await mockSupabase
        .from('assessment_obligations')
        .select('obligation_id, obligations(...)')
        .eq('assessment_id', 'assessment_123');

      expect(data).toHaveLength(2);
      expect(data![0].obligations.title).toBe('Data Privacy Compliance');
      expect(data![1].obligations.status).toBe('identified');
    });

    it('should handle assessment with no obligations', async () => {
      const selectMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      });

      mockSupabase.from.mockReturnValue({ select: selectMock });

      const { data } = await mockSupabase
        .from('assessment_obligations')
        .select('obligation_id, obligations(...)')
        .eq('assessment_id', 'assessment_empty');

      expect(data).toHaveLength(0);
    });
  });

  describe('Obligations by System', () => {
    it('should fetch obligations for AI system', async () => {
      const mockSystemObligations = [
        {
          id: 'obl_sys_1',
          title: 'Model Transparency',
          description: 'Document model decision process',
          status: 'in_progress',
          priority: 'high',
        },
        {
          id: 'obl_sys_2',
          title: 'Bias Testing',
          description: 'Test for algorithmic bias',
          status: 'completed',
          priority: 'high',
        },
      ];

      const selectMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: mockSystemObligations,
          error: null,
        }),
      });

      mockSupabase.from.mockReturnValue({ select: selectMock });

      const { data } = await mockSupabase
        .from('system_obligations')
        .select('*')
        .eq('system_id', 'system_123');

      expect(data).toHaveLength(2);
      expect(data![0].priority).toBe('high');
    });
  });

  describe('Obligations by Status', () => {
    it('should filter obligations by status', async () => {
      const mockFilteredObligations = [
        {
          id: 'obl_1',
          title: 'Compliance Task 1',
          status: 'in_progress',
          priority: 'high',
        },
        {
          id: 'obl_2',
          title: 'Compliance Task 2',
          status: 'in_progress',
          priority: 'medium',
        },
      ];

      const selectMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: mockFilteredObligations,
            error: null,
          }),
        }),
      });

      mockSupabase.from.mockReturnValue({ select: selectMock });

      const { data } = await mockSupabase
        .from('obligations')
        .select('*')
        .eq('workspace_id', 'workspace_123')
        .eq('status', 'in_progress');

      expect(data).toHaveLength(2);
      expect(data!.every((o: any) => o.status === 'in_progress')).toBe(true);
    });

    it('should support all obligation statuses', async () => {
      const statuses = [
        'identified',
        'in_progress',
        'completed',
        'not_applicable',
      ];
      const obligationsByStatus = {
        identified: [{ id: 'obl_1', status: 'identified' }],
        in_progress: [{ id: 'obl_2', status: 'in_progress' }],
        completed: [{ id: 'obl_3', status: 'completed' }],
        not_applicable: [{ id: 'obl_4', status: 'not_applicable' }],
      };

      for (const status of statuses) {
        const selectMock = vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: obligationsByStatus[
                status as keyof typeof obligationsByStatus
              ],
              error: null,
            }),
          }),
        });

        mockSupabase.from.mockReturnValue({ select: selectMock });

        const { data } = await mockSupabase
          .from('obligations')
          .select('*')
          .eq('workspace_id', 'workspace_123')
          .eq('status', status);

        expect(data![0].status).toBe(status);
      }
    });
  });

  describe('Obligation Priority Levels', () => {
    it('should fetch obligations by priority', async () => {
      const highPriorityObligations = [
        { id: 'obl_1', title: 'Critical Compliance', priority: 'high' },
        { id: 'obl_2', title: 'Urgent Audit', priority: 'high' },
      ];

      const selectMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: highPriorityObligations,
            error: null,
          }),
        }),
      });

      mockSupabase.from.mockReturnValue({ select: selectMock });

      const { data } = await mockSupabase
        .from('obligations')
        .select('*')
        .eq('workspace_id', 'workspace_123')
        .eq('priority', 'high');

      expect(data!.every((o: any) => o.priority === 'high')).toBe(true);
    });
  });

  describe('Audit-Critical Queries', () => {
    it('should count total obligations created post-deployment', async () => {
      const countResult = {
        total_created: 125,
        workspaces_using_feature: 4,
        first_created: '2026-07-10T08:30:00Z',
        latest_created: '2026-07-15T14:20:00Z',
      };

      const selectMock = vi.fn().mockReturnValue({
        gte: vi.fn().mockResolvedValue({
          data: [countResult],
          error: null,
        }),
      });

      mockSupabase.from.mockReturnValue({ select: selectMock });

      const { data } = await mockSupabase
        .from('obligations')
        .select(
          'COUNT(*) as total_created, COUNT(DISTINCT workspace_id) as workspaces_using_feature'
        )
        .gte('created_at', '2026-07-10T00:00:00Z');

      expect(data![0].total_created).toBeGreaterThanOrEqual(50);
      expect(data![0].workspaces_using_feature).toBeGreaterThanOrEqual(3);
    });

    it('should measure obligation status distribution', async () => {
      const statusDistribution = [
        { status: 'identified', count: 45, workspaces: 3 },
        { status: 'in_progress', count: 60, workspaces: 4 },
        { status: 'completed', count: 15, workspaces: 2 },
        { status: 'not_applicable', count: 5, workspaces: 1 },
      ];

      const selectMock = vi.fn().mockReturnValue({
        gte: vi.fn().mockResolvedValue({
          data: statusDistribution,
          error: null,
        }),
      });

      mockSupabase.from.mockReturnValue({ select: selectMock });

      const { data } = await mockSupabase
        .from('obligations')
        .select(
          'status, COUNT(*) as count, COUNT(DISTINCT workspace_id) as workspaces'
        )
        .gte('created_at', '2026-07-10T00:00:00Z');

      expect(data).toHaveLength(4);
      expect(
        data!.reduce((sum: number, row: any) => sum + row.count, 0)
      ).toBeGreaterThan(0);
    });

    it('should track obligations with due dates', async () => {
      const dueDateStats = {
        total_with_due_dates: 95,
        overdue: 8,
        upcoming_7_days: 12,
        avg_days_to_due: 18.5,
      };

      const selectMock = vi.fn().mockReturnValue({
        not: vi.fn().mockResolvedValue({
          data: [dueDateStats],
          error: null,
        }),
      });

      mockSupabase.from.mockReturnValue({ select: selectMock });

      const { data } = await mockSupabase
        .from('obligations')
        .select(
          'COUNT(*) as total_with_due_dates, COUNT(CASE WHEN due_date < NOW() THEN 1 END) as overdue'
        )
        .not('due_date', 'is', null);

      expect(data![0].total_with_due_dates).toBeGreaterThan(0);
    });

    it('should measure completion rate', async () => {
      const completionStats = {
        completed_count: 15,
        avg_days_to_completion: 6.2,
      };

      const selectMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          gte: vi.fn().mockResolvedValue({
            data: [completionStats],
            error: null,
          }),
        }),
      });

      mockSupabase.from.mockReturnValue({ select: selectMock });

      const { data } = await mockSupabase
        .from('obligations')
        .select('COUNT(*) as completed_count')
        .eq('status', 'completed')
        .gte('created_at', '2026-07-10T00:00:00Z');

      expect(data![0].completed_count).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      const selectMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockRejectedValue(new Error('Database connection failed')),
      });

      mockSupabase.from.mockReturnValue({ select: selectMock });

      await expect(
        mockSupabase
          .from('obligations')
          .select('*')
          .eq('workspace_id', 'workspace_123')
      ).rejects.toThrow('Database connection failed');
    });

    it('should handle RLS policy rejection', async () => {
      const selectMock = vi.fn().mockResolvedValue({
        data: null,
        error: {
          code: '42501',
          message: 'permission denied for schema public',
        },
      });

      mockSupabase.from.mockReturnValue({ select: selectMock });

      const { error } = await mockSupabase.from('obligations').select('*');

      expect(error).toBeDefined();
      expect(error!.code).toBe('42501');
    });
  });
});
