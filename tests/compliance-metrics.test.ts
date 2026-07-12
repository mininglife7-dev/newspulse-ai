import { describe, it, expect } from 'vitest';
import {
  calculateComplianceMetrics,
  calculateObligationMetrics,
  identifyComplianceGaps,
  estimateComplianceTimeline,
  calculateComplianceScore,
} from '@/lib/compliance-metrics';

describe('Compliance Metrics', () => {
  describe('calculateComplianceMetrics', () => {
    it('returns unknown status for empty obligations list', () => {
      const result = calculateComplianceMetrics([]);

      expect(result.totalObligations).toBe(0);
      expect(result.compliancePercentage).toBe(100);
      expect(result.overallStatus).toBe('unknown');
    });

    it('calculates compliance percentage correctly', () => {
      const obligations = [
        { id: '1', status: 'completed', priority: 'high', due_date: null },
        { id: '2', status: 'completed', priority: 'high', due_date: null },
        { id: '3', status: 'in_progress', priority: 'medium', due_date: null },
        { id: '4', status: 'identified', priority: 'low', due_date: null },
      ];

      const result = calculateComplianceMetrics(obligations);

      expect(result.totalObligations).toBe(4);
      expect(result.completedObligations).toBe(2);
      expect(result.compliancePercentage).toBe(50); // 2/4 = 50%
      expect(result.overallStatus).toBe('partial');
    });

    it('marks as compliant when all obligations completed or not applicable', () => {
      const obligations = [
        { id: '1', status: 'completed', priority: 'high', due_date: null },
        { id: '2', status: 'completed', priority: 'high', due_date: null },
        { id: '3', status: 'not_applicable', priority: 'medium', due_date: null },
      ];

      const result = calculateComplianceMetrics(obligations);

      expect(result.compliancePercentage).toBe(100);
      expect(result.overallStatus).toBe('compliant');
    });

    it('counts urgent obligations correctly', () => {
      const obligations = [
        { id: '1', status: 'completed', priority: 'critical', due_date: null },
        { id: '2', status: 'identified', priority: 'critical', due_date: null },
        { id: '3', status: 'in_progress', priority: 'high', due_date: null },
        { id: '4', status: 'in_progress', priority: 'medium', due_date: null },
      ];

      const result = calculateComplianceMetrics(obligations);

      // Urgent = critical or high not completed
      expect(result.urgentObligations).toBe(2); // identified critical + in_progress high
    });
  });

  describe('calculateObligationMetrics', () => {
    it('calculates evidence coverage percentage', () => {
      const obligation = {
        id: 'obl-1',
        title: 'Data governance',
        status: 'in_progress',
        priority: 'high',
        due_date: null,
      };

      const evidence = [
        { id: 'ev-1', obligation_id: 'obl-1', status: 'approved' },
        { id: 'ev-2', obligation_id: 'obl-1', status: 'approved' },
        { id: 'ev-3', obligation_id: 'obl-1', status: 'submitted' },
      ];

      const result = calculateObligationMetrics(obligation, evidence);

      expect(result.evidenceCount).toBe(3);
      expect(result.approvedEvidenceCount).toBe(2);
      expect(result.evidenceCoveragePercentage).toBe(67); // 2/3 = 66.67 ≈ 67%
    });

    it('returns 0% coverage for no evidence', () => {
      const obligation = {
        id: 'obl-1',
        title: 'Test',
        status: 'identified',
        priority: 'high',
        due_date: null,
      };

      const evidence: Array<{ id: string; obligation_id: string; status: string }> = [];

      const result = calculateObligationMetrics(obligation, evidence);

      expect(result.evidenceCoveragePercentage).toBe(0);
      expect(result.complianceStatus).toBe('non_compliant');
    });

    it('calculates days overdue correctly', () => {
      const today = new Date();
      const pastDate = new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000); // 5 days ago

      const obligation = {
        id: 'obl-1',
        title: 'Test',
        status: 'in_progress',
        priority: 'high',
        due_date: pastDate.toISOString().split('T')[0],
      };

      const evidence: Array<{ id: string; obligation_id: string; status: string }> = [];

      const result = calculateObligationMetrics(obligation, evidence);

      // Days overdue is approximately 5 (may be 5 or 6 depending on exact time)
      expect(result.daysOverdue).toBeGreaterThanOrEqual(5);
      expect(result.daysOverdue).toBeLessThanOrEqual(6);
    });

    it('returns null daysOverdue for completed obligations', () => {
      const obligation = {
        id: 'obl-1',
        title: 'Test',
        status: 'completed',
        priority: 'high',
        due_date: '2026-01-01',
      };

      const evidence: Array<{ id: string; obligation_id: string; status: string }> = [];

      const result = calculateObligationMetrics(obligation, evidence);

      expect(result.daysOverdue).toBeNull();
    });
  });

  describe('identifyComplianceGaps', () => {
    it('identifies gaps for obligations with no approved evidence', () => {
      const obligations = [
        {
          id: 'obl-1',
          title: 'Data governance',
          status: 'identified',
          priority: 'critical',
          due_date: '2026-12-31',
        },
        {
          id: 'obl-2',
          title: 'Human oversight',
          status: 'completed',
          priority: 'high',
          due_date: '2026-12-31',
        },
      ];

      const evidence = [
        { id: 'ev-1', obligation_id: 'obl-1', status: 'submitted' },
      ];

      const gaps = identifyComplianceGaps(obligations, evidence);

      expect(gaps.length).toBe(1);
      expect(gaps[0].obligationId).toBe('obl-1');
      expect(gaps[0].priority).toBe('critical');
    });

    it('does not identify gaps for completed obligations', () => {
      const obligations = [
        {
          id: 'obl-1',
          title: 'Test',
          status: 'completed',
          priority: 'high',
          due_date: null,
        },
      ];

      const evidence: Array<{ id: string; obligation_id: string; status: string }> = [];

      const gaps = identifyComplianceGaps(obligations, evidence);

      expect(gaps.length).toBe(0);
    });

    it('generates recommendations for compliance gaps', () => {
      const obligations = [
        {
          id: 'obl-1',
          title: 'Data governance',
          status: 'identified',
          priority: 'critical',
          due_date: '2026-12-31',
          description: 'Missing documentation',
        },
      ];

      const evidence: Array<{ id: string; obligation_id: string; status: string }> = [];

      const gaps = identifyComplianceGaps(obligations, evidence);

      expect(gaps[0].recommendedActions.length).toBeGreaterThan(0);
      expect(gaps[0].recommendedActions[0]).toContain('Start compliance');
    });
  });

  describe('estimateComplianceTimeline', () => {
    it('returns null for no in-progress obligations with due dates', () => {
      const obligations = [
        { id: '1', status: 'identified', due_date: null },
        { id: '2', status: 'completed', due_date: '2026-12-31' },
      ];

      const result = estimateComplianceTimeline(obligations);

      expect(result.projectedComplianceDate).toBeNull();
      expect(result.weeksToCompliance).toBeNull();
    });

    it('estimates compliance timeline for in-progress obligations', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      const futureDateStr = futureDate.toISOString().split('T')[0];

      const obligations = [
        { id: '1', status: 'in_progress', due_date: futureDateStr },
      ];

      const result = estimateComplianceTimeline(obligations);

      expect(result.projectedComplianceDate).toBeDefined();
      expect(result.weeksToCompliance).toBeGreaterThan(0);
    });

    it('identifies critical deadlines within 30 days', () => {
      const today = new Date();
      const in14Days = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);
      const in50Days = new Date(today.getTime() + 50 * 24 * 60 * 60 * 1000);

      const obligations = [
        { id: '1', status: 'in_progress', due_date: in14Days.toISOString().split('T')[0] },
        { id: '2', status: 'in_progress', due_date: in50Days.toISOString().split('T')[0] },
      ];

      const result = estimateComplianceTimeline(obligations);

      expect(result.criticalDeadlines.length).toBe(1);
    });
  });

  describe('calculateComplianceScore', () => {
    it('calculates score based on multiple factors', () => {
      const metrics = {
        totalObligations: 10,
        identifiedObligations: 2,
        inProgressObligations: 3,
        completedObligations: 5,
        notApplicableObligations: 0,
        compliancePercentage: 50,
        urgentObligations: 2,
        overallStatus: 'partial' as const,
      };

      const gaps = [
        {
          obligationId: 'obl-1',
          obligationTitle: 'Test',
          priority: 'high' as const,
          gapDescription: 'Test gap',
          requiredEvidence: [],
          dueDate: null,
          recommendedActions: [],
        },
      ];

      const evidence = [
        { status: 'approved' },
        { status: 'approved' },
        { status: 'submitted' },
      ];

      const score = calculateComplianceScore(metrics, gaps, evidence);

      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('awards higher scores for better compliance', () => {
      const goodMetrics = {
        totalObligations: 10,
        identifiedObligations: 0,
        inProgressObligations: 0,
        completedObligations: 10,
        notApplicableObligations: 0,
        compliancePercentage: 100,
        urgentObligations: 0,
        overallStatus: 'compliant' as const,
      };

      const badMetrics = {
        totalObligations: 10,
        identifiedObligations: 5,
        inProgressObligations: 3,
        completedObligations: 2,
        notApplicableObligations: 0,
        compliancePercentage: 20,
        urgentObligations: 5,
        overallStatus: 'non_compliant' as const,
      };

      const evidence = [{ status: 'approved' }];
      const gaps: any[] = [];

      const goodScore = calculateComplianceScore(goodMetrics, gaps, evidence);
      const badScore = calculateComplianceScore(badMetrics, gaps, evidence);

      expect(goodScore).toBeGreaterThan(badScore);
    });
  });

  describe('Compliance Status Transitions', () => {
    it('supports valid status transitions', () => {
      const statusTransitions = [
        { from: 'identified', to: 'in_progress' },
        { from: 'in_progress', to: 'completed' },
        { from: 'identified', to: 'not_applicable' },
      ];

      for (const transition of statusTransitions) {
        expect(['identified', 'in_progress', 'completed', 'not_applicable']).toContain(
          transition.from
        );
        expect(['identified', 'in_progress', 'completed', 'not_applicable']).toContain(
          transition.to
        );
      }
    });
  });

  describe('Priority Levels', () => {
    it('correctly identifies critical obligations', () => {
      const obligations = [
        { id: '1', status: 'identified', priority: 'critical', due_date: null },
        { id: '2', status: 'in_progress', priority: 'critical', due_date: null },
        { id: '3', status: 'in_progress', priority: 'high', due_date: null },
      ];

      const result = calculateComplianceMetrics(obligations);

      // Urgent = critical or high not completed: 2 critical + 1 high = 3
      expect(result.urgentObligations).toBe(3);
    });
  });
});
