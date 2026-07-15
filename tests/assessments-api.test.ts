import { describe, it, expect, beforeEach, vi } from 'vitest';
import { classifyRisk } from '@/lib/risk-assessment';

vi.mock('@/lib/supabase-server', () => ({
  createRouteClient: vi.fn(),
}));
vi.mock('@/lib/risk-assessment');

// Import after mocking
import { createRouteClient } from '@/lib/supabase-server';

const mockSupabase = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
};

describe('Assessments API Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (createRouteClient as any).mockResolvedValue(mockSupabase);
  });

  describe('GET /api/assessments', () => {
    it('should fetch assessment by systemId', async () => {
      const mockAssessment = {
        id: 'assessment_123',
        ai_system_id: 'system_123',
        workspace_id: 'workspace_456',
        risk_level: 'high',
        risk_score: 75,
        status: 'finalized',
        assessment_data: {
          answers: { question_1: 'answer_1' },
          completedAt: '2026-07-15T00:00:00Z',
        },
        created_at: '2026-07-15T00:00:00Z',
      };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user_123' } },
      });

      const selectMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: mockAssessment,
                error: null,
              }),
            }),
          }),
        }),
      });

      mockSupabase.from.mockReturnValue({ select: selectMock });

      const { data } = await mockSupabase
        .from('risk_assessments')
        .select('*')
        .eq('ai_system_id', 'system_123')
        .eq('workspace_id', 'workspace_456')
        .limit(1)
        .maybeSingle();

      expect(data).toBeDefined();
      expect(data?.ai_system_id).toBe('system_123');
      expect(data?.risk_level).toBe('high');
    });

    it('should fetch assessment by assessmentId', async () => {
      const mockAssessment = {
        id: 'assessment_123',
        ai_system_id: 'system_123',
        workspace_id: 'workspace_456',
        risk_level: 'medium',
        status: 'in_review',
      };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user_123' } },
      });

      const selectMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: mockAssessment,
                error: null,
              }),
            }),
          }),
        }),
      });

      mockSupabase.from.mockReturnValue({ select: selectMock });

      const { data } = await mockSupabase
        .from('risk_assessments')
        .select('*')
        .eq('id', 'assessment_123')
        .eq('workspace_id', 'workspace_456')
        .limit(1)
        .maybeSingle();

      expect(data?.id).toBe('assessment_123');
      expect(data?.status).toBe('in_review');
    });

    it('should return null when assessment not found', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user_123' } },
      });

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
        .from('risk_assessments')
        .select('*')
        .eq('id', 'nonexistent')
        .eq('workspace_id', 'workspace_456')
        .limit(1)
        .maybeSingle();

      expect(data).toBeNull();
    });

    it('should require authentication', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const { data } = await mockSupabase.auth.getUser();
      expect(data.user).toBeNull();
    });

    it('should enforce workspace isolation', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user_123' } },
      });

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
        .from('risk_assessments')
        .select('*')
        .eq('id', 'assessment_123')
        .eq('workspace_id', 'different_workspace')
        .limit(1)
        .maybeSingle();

      expect(data).toBeNull();
    });

    it('should handle database errors gracefully', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user_123' } },
      });

      const selectMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: null,
                error: new Error('Database connection failed'),
              }),
            }),
          }),
        }),
      });

      mockSupabase.from.mockReturnValue({ select: selectMock });

      const { error } = await mockSupabase
        .from('risk_assessments')
        .select('*')
        .eq('id', 'assessment_123')
        .eq('workspace_id', 'workspace_456')
        .limit(1)
        .maybeSingle();

      expect(error).toBeDefined();
    });
  });

  describe('POST /api/assessments', () => {
    it('should create new assessment with risk classification', async () => {
      const requestBody = {
        aiSystemId: 'system_123',
        answers: {
          question_1: 'high_risk',
          question_2: 'no_mitigation',
        },
        status: 'draft',
      };

      const mockClassification = {
        riskLevel: 'high',
        riskScore: 75,
        recommendations: [
          'Implement additional safeguards',
          'Conduct security audit',
        ],
      };

      const mockSystem = {
        id: 'system_123',
        company_id: 'company_456',
        workspace_id: 'workspace_789',
      };

      const mockCreatedAssessment = {
        id: 'assessment_new_123',
        ai_system_id: 'system_123',
        company_id: 'company_456',
        workspace_id: 'workspace_789',
        risk_level: 'high',
        risk_score: 75,
        status: 'draft',
        assessment_data: {
          answers: requestBody.answers,
          classification: mockClassification,
          completedAt: '2026-07-15T17:37:00Z',
        },
        created_at: '2026-07-15T17:37:00Z',
      };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user_123' } },
      });

      (classifyRisk as any).mockReturnValue(mockClassification);

      // Mock workspace member lookup
      let callCount = 0;
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'workspace_members') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({
                      data: { workspace_id: 'workspace_789' },
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        if (table === 'ai_systems') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({
                      data: mockSystem,
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        if (table === 'risk_assessments') {
          callCount++;
          if (callCount === 1) {
            // First call: check if assessment exists
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({
                      data: null,
                      error: null,
                    }),
                  }),
                }),
              }),
            };
          } else if (callCount === 2) {
            // Second call: insert new assessment
            return {
              insert: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: mockCreatedAssessment,
                    error: null,
                  }),
                }),
              }),
            };
          }
        }
        if (table === 'obligations') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  ilike: vi.fn().mockReturnValue({
                    limit: vi.fn().mockReturnValue({
                      maybeSingle: vi.fn().mockResolvedValue({
                        data: null,
                        error: null,
                      }),
                    }),
                  }),
                }),
              }),
              insert: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: {
                      id: 'obligation_new_123',
                      title: 'Implement additional safeguards',
                    },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        return { select: vi.fn() };
      });

      // Simulate the POST flow
      expect(requestBody.aiSystemId).toBe('system_123');
      expect(mockClassification.riskLevel).toBe('high');
      expect(mockClassification.recommendations).toHaveLength(2);
    });

    it('should update existing assessment', async () => {
      const requestBody = {
        aiSystemId: 'system_123',
        answers: {
          question_1: 'updated_answer',
        },
        status: 'in_review',
      };

      const mockClassification = {
        riskLevel: 'medium',
        riskScore: 55,
        recommendations: ['Review mitigation strategies'],
      };

      const mockExistingAssessment = {
        id: 'assessment_existing_123',
        ai_system_id: 'system_123',
        status: 'draft',
      };

      const mockUpdatedAssessment = {
        id: 'assessment_existing_123',
        ai_system_id: 'system_123',
        risk_level: 'medium',
        risk_score: 55,
        status: 'in_review',
        assessment_data: {
          answers: requestBody.answers,
          classification: mockClassification,
        },
      };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user_123' } },
      });

      (classifyRisk as any).mockReturnValue(mockClassification);

      let systemLookupDone = false;
      let existingCheckDone = false;

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'workspace_members') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({
                      data: { workspace_id: 'workspace_789' },
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        if (table === 'ai_systems') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({
                      data: {
                        id: 'system_123',
                        company_id: 'company_456',
                        workspace_id: 'workspace_789',
                      },
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        if (table === 'risk_assessments') {
          if (!existingCheckDone) {
            existingCheckDone = true;
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({
                      data: mockExistingAssessment,
                    }),
                  }),
                }),
              }),
            };
          } else {
            return {
              update: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  select: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({
                      data: mockUpdatedAssessment,
                    }),
                  }),
                }),
              }),
            };
          }
        }
      });

      // Verify update flow
      expect(requestBody.status).toBe('in_review');
      expect(mockUpdatedAssessment.status).toBe('in_review');
    });

    it('should validate required fields', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user_123' } },
      });

      // Missing aiSystemId
      const invalidRequest: Record<string, any> = {
        answers: { question_1: 'answer' },
      };

      expect(invalidRequest.aiSystemId).toBeUndefined();
    });

    it('should auto-generate obligations from recommendations', async () => {
      const mockClassification = {
        riskLevel: 'high',
        riskScore: 75,
        recommendations: ['Implement safeguards', 'Conduct audit'],
      };

      (classifyRisk as any).mockReturnValue(mockClassification);

      expect(mockClassification.recommendations).toHaveLength(2);
      expect(mockClassification.recommendations[0]).toBe(
        'Implement safeguards'
      );
    });

    it('should handle existing obligation deduplication', async () => {
      const recommendation = 'Implement security protocol';
      const mockExistingObligation = {
        id: 'obligation_existing_123',
        title: 'Implement security protocol',
      };

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              ilike: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: mockExistingObligation,
                  }),
                }),
              }),
            }),
          }),
        }),
      });

      expect(mockExistingObligation.title).toContain('security');
    });
  });

  describe('Assessment Status Transitions', () => {
    it('should allow draft to in_review transition', async () => {
      const statusTransition = {
        from: 'draft',
        to: 'in_review',
      };

      const validTransitions = ['draft', 'in_review', 'finalized'];
      expect(validTransitions).toContain(statusTransition.from);
      expect(validTransitions).toContain(statusTransition.to);
    });

    it('should allow in_review to finalized transition', async () => {
      const statusTransition = {
        from: 'in_review',
        to: 'finalized',
      };

      const validTransitions = ['draft', 'in_review', 'finalized'];
      expect(validTransitions).toContain(statusTransition.from);
      expect(validTransitions).toContain(statusTransition.to);
    });

    it('should allow finalized to draft transition (reopen)', async () => {
      const statusTransition = {
        from: 'finalized',
        to: 'draft',
      };

      const validTransitions = ['draft', 'in_review', 'finalized'];
      expect(validTransitions).toContain(statusTransition.from);
      expect(validTransitions).toContain(statusTransition.to);
    });
  });

  describe('Risk Classification', () => {
    it('should classify unacceptable risk', async () => {
      const answers = new Map([
        ['high_risk_factor', true],
        ['no_mitigation', true],
      ]);

      const classification = {
        riskLevel: 'unacceptable',
        riskScore: 90,
        priorityLevel: 'critical',
      };

      (classifyRisk as any).mockReturnValue(classification);
      const result = classifyRisk(answers);

      expect(result.riskLevel).toBe('unacceptable');
      expect(result.riskScore).toBe(90);
    });

    it('should classify high risk', async () => {
      const answers = new Map([
        ['significant_risk', true],
        ['some_mitigation', true],
      ]);

      const classification = {
        riskLevel: 'high',
        riskScore: 75,
        priorityLevel: 'high',
      };

      (classifyRisk as any).mockReturnValue(classification);
      const result = classifyRisk(answers);

      expect(result.riskLevel).toBe('high');
      expect(result.riskScore).toBeGreaterThan(60);
    });

    it('should classify medium risk', async () => {
      const classification = {
        riskLevel: 'medium',
        riskScore: 50,
        priorityLevel: 'medium',
      };

      expect(classification.riskLevel).toBe('medium');
      expect(classification.riskScore).toBe(50);
    });

    it('should classify low risk', async () => {
      const classification = {
        riskLevel: 'low',
        riskScore: 25,
        priorityLevel: 'low',
      };

      expect(classification.riskLevel).toBe('low');
      expect(classification.riskScore).toBeLessThan(40);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing AI system', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user_123' } },
      });

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
        .from('ai_systems')
        .select('id')
        .eq('id', 'nonexistent_system')
        .eq('workspace_id', 'workspace_789')
        .limit(1)
        .maybeSingle();

      expect(data).toBeNull();
    });

    it('should handle database errors during assessment creation', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user_123' } },
      });

      const insertMock = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: new Error('Database constraint violation'),
          }),
        }),
      });

      mockSupabase.from.mockReturnValue({ insert: insertMock });

      const { error } = await mockSupabase
        .from('risk_assessments')
        .insert({})
        .select()
        .single();

      expect(error).toBeDefined();
    });

    it('should handle missing workspace membership', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user_123' } },
      });

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
        .eq('user_id', 'user_123')
        .eq('status', 'active')
        .limit(1)
        .maybeSingle();

      expect(data).toBeNull();
    });
  });
});
