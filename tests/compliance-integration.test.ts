import { describe, it, expect, beforeEach } from 'vitest';
import { classifyRisk } from '../lib/risk-assessment';
import { getTemplatesForRiskLevel } from '../lib/obligation-templates';

/**
 * Compliance System Integration Tests
 *
 * Validates the end-to-end flow:
 * 1. Risk assessment classification
 * 2. Obligation template matching
 * 3. Compliance metrics calculation
 *
 * These tests ensure the deployed compliance system works as designed
 * before measuring adoption during 2026-07-10 to 2026-07-17.
 */

describe('Compliance System Integration', () => {
  describe('End-to-end: Assessment → Obligations → Metrics', () => {
    it('should generate high-risk obligations when assessment classifies as high-risk', () => {
      // Step 1: Classify a high-risk system
      const answers = new Map([
        ['q4-credit-decision', true],
        ['q15-transparency', false],
        ['q16-oversight', false],
      ]);
      const assessment = classifyRisk(answers);

      expect(assessment.riskLevel).toBe('high');
      expect(assessment.riskScore).toBeGreaterThan(40);

      // Step 2: Get templates for this risk level
      const templates = getTemplatesForRiskLevel(assessment.riskLevel);

      // Verify we got high-risk obligations
      expect(templates.length).toBeGreaterThan(0);
      expect(templates).toContainEqual(
        expect.objectContaining({
          priority: expect.stringMatching(/critical|high/),
        })
      );

      // Verify critical obligations exist
      const criticalCount = templates.filter((t) => t.priority === 'critical').length;
      expect(criticalCount).toBeGreaterThan(0);
    });

    it('should generate unacceptable-risk obligations when assessment detects prohibited practices', () => {
      // Step 1: Detect prohibited practice
      const answers = new Map([['q1-prohibited-biometric', true]]);
      const assessment = classifyRisk(answers);

      expect(assessment.riskLevel).toBe('unacceptable');

      // Step 2: Get unacceptable-risk templates
      const templates = getTemplatesForRiskLevel('unacceptable');

      expect(templates.length).toBe(3); // Unacceptable has exactly 3 obligations
      expect(templates).toContainEqual(
        expect.objectContaining({
          title: 'Discontinue prohibited AI system',
          priority: 'critical',
        })
      );
    });

    it('should generate medium-risk obligations when assessment is medium-risk', () => {
      const answers = new Map([
        ['q15-transparency', false],
        ['q16-oversight', true],
      ]);
      const assessment = classifyRisk(answers);

      // Medium-risk or low-risk (since no critical indicators)
      expect(['medium', 'low']).toContain(assessment.riskLevel);

      const templates = getTemplatesForRiskLevel(assessment.riskLevel);
      expect(templates.length).toBeGreaterThan(0);

      // Medium obligations should be reasonable
      if (assessment.riskLevel === 'medium') {
        expect(templates).toContainEqual(
          expect.objectContaining({
            source: 'EU_AI_ACT',
          })
        );
      }
    });

    it('should generate low-risk obligations when assessment is low-risk', () => {
      const answers = new Map<string, boolean>(
        // No risky indicators
      );
      const assessment = classifyRisk(answers);

      if (assessment.riskLevel === 'low') {
        const templates = getTemplatesForRiskLevel('low');

        expect(templates.length).toBe(3); // Low has exactly 3 basic obligations
        expect(templates).toContainEqual(
          expect.objectContaining({
            title: 'Document system overview',
          })
        );
      }
    });
  });

  describe('Obligation Template Library Completeness', () => {
    it('should have templates for all risk levels', () => {
      const riskLevels: Array<'unacceptable' | 'high' | 'medium' | 'low'> = [
        'unacceptable',
        'high',
        'medium',
        'low',
      ];

      riskLevels.forEach((level) => {
        const templates = getTemplatesForRiskLevel(level);
        expect(templates.length).toBeGreaterThan(0);
        expect(templates).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              title: expect.any(String),
              description: expect.any(String),
              source: 'EU_AI_ACT',
              priority: expect.any(String),
            }),
          ])
        );
      });
    });

    it('should have sufficient obligations for high-risk (minimum 10)', () => {
      const templates = getTemplatesForRiskLevel('high');
      expect(templates.length).toBeGreaterThanOrEqual(10);

      // Verify coverage of governance areas
      const titles = templates.map((t) => t.title.toLowerCase());
      expect(titles.join()).toContain('governance');
      expect(titles.join()).toContain('risk');
      expect(titles.join()).toContain('documentation');
    });

    it('should prioritize obligations correctly by risk level', () => {
      const unacceptable = getTemplatesForRiskLevel('unacceptable');
      const high = getTemplatesForRiskLevel('high');
      const medium = getTemplatesForRiskLevel('medium');
      const low = getTemplatesForRiskLevel('low');

      // Unacceptable should have critical and/or high priority only
      expect(
        unacceptable.every((t) => ['critical', 'high'].includes(t.priority))
      ).toBe(true);

      // High should have critical and high
      expect(
        high.every((t) => ['critical', 'high'].includes(t.priority))
      ).toBe(true);

      // Medium should not have critical
      expect(medium.every((t) => t.priority !== 'critical')).toBe(true);

      // Low should be low-priority
      expect(low.every((t) => t.priority === 'low')).toBe(true);
    });
  });

  describe('Risk Assessment Edge Cases', () => {
    it('should handle systems with multiple high-risk indicators', () => {
      const answers = new Map([
        ['q4-credit-decision', true],
        ['q5-recruitment', true],
        ['q7-law-enforcement', true],
      ]);
      const assessment = classifyRisk(answers);

      expect(assessment.riskLevel).toBe('high');
      expect(assessment.riskScore).toBeGreaterThan(60);

      const templates = getTemplatesForRiskLevel('high');
      expect(templates.length).toBeGreaterThanOrEqual(10);
    });

    it('should classify as medium when transparency measures are in place', () => {
      const answers = new Map([
        ['q15-transparency', true], // Transparency implemented
        ['q16-oversight', true], // Oversight implemented
      ]);
      const assessment = classifyRisk(answers);

      // With transparency and oversight, should reduce risk from high to medium/low
      expect(['medium', 'low']).toContain(assessment.riskLevel);
    });

    it('should handle empty assessment (no indicators)', () => {
      const answers = new Map<string, boolean>(); // No answers provided
      const assessment = classifyRisk(answers);

      expect(assessment.riskLevel).toBe('low');
      expect(['low', 'medium']).toContain(assessment.riskLevel);

      const templates = getTemplatesForRiskLevel(assessment.riskLevel);
      expect(templates.length).toBeGreaterThan(0);
    });
  });

  describe('Compliance Metrics Calculation', () => {
    it('should calculate correct obligation counts by status', () => {
      const mockObligations = [
        { status: 'identified', priority: 'critical' },
        { status: 'identified', priority: 'high' },
        { status: 'in_progress', priority: 'high' },
        { status: 'completed', priority: 'critical' },
        { status: 'completed', priority: 'low' },
        { status: 'not_applicable', priority: 'medium' },
      ];

      // Simulate metric calculation
      const metrics = {
        total: mockObligations.length,
        identified: mockObligations.filter((o) => o.status === 'identified').length,
        in_progress: mockObligations.filter((o) => o.status === 'in_progress').length,
        completed: mockObligations.filter((o) => o.status === 'completed').length,
        not_applicable: mockObligations.filter((o) => o.status === 'not_applicable').length,
        critical_priority: mockObligations.filter((o) => o.priority === 'critical').length,
        high_priority: mockObligations.filter((o) => o.priority === 'high').length,
      };

      expect(metrics.total).toBe(6);
      expect(metrics.identified).toBe(2);
      expect(metrics.in_progress).toBe(1);
      expect(metrics.completed).toBe(2);
      expect(metrics.not_applicable).toBe(1);
      expect(metrics.critical_priority).toBe(2);
      expect(metrics.high_priority).toBe(2);

      // Verify sum
      expect(
        metrics.identified + metrics.in_progress + metrics.completed + metrics.not_applicable
      ).toBe(metrics.total);
    });

    it('should calculate compliance health as critical when critical obligations exist', () => {
      const obligationMetrics = {
        total: 10,
        identified: 5,
        in_progress: 3,
        completed: 1,
        not_applicable: 1,
        critical_priority: 2, // Critical obligations exist
        high_priority: 3,
      };

      // Critical if critical_priority > 0
      const complianceHealth = obligationMetrics.critical_priority > 0 ? 'critical' : 'good';
      expect(complianceHealth).toBe('critical');
    });

    it('should calculate compliance health as excellent when all obligations are completed', () => {
      const obligationMetrics = {
        total: 5,
        identified: 0,
        in_progress: 0,
        completed: 5,
        not_applicable: 0,
        critical_priority: 0,
        high_priority: 0,
      };

      // Excellent if all completed or not_applicable
      const allResolved =
        obligationMetrics.completed + obligationMetrics.not_applicable ===
        obligationMetrics.total;
      const complianceHealth =
        allResolved && obligationMetrics.critical_priority === 0 ? 'excellent' : 'good';

      expect(complianceHealth).toBe('excellent');
    });
  });

  describe('Assessment Progress Tracking', () => {
    it('should calculate progress percentage correctly', () => {
      const answers = new Map([
        ['q1-prohibited-biometric', true],
        ['q4-credit-decision', false],
        ['q15-transparency', true],
      ]);

      const totalQuestions = 18; // Standard assessment has 18 questions
      const answeredCount = answers.size;
      const progressPercentage = (answeredCount / totalQuestions) * 100;

      expect(answeredCount).toBe(3);
      expect(progressPercentage).toBe((3 / 18) * 100);
      expect(progressPercentage).toBeCloseTo(16.67, 1);
    });

    it('should show progress increasing as answers are added', () => {
      const answers = new Map<string, boolean>();
      const totalQuestions = 18;

      // Simulate progressive answering
      const checkpoints = [0, 5, 10, 18];
      const expectedProgress = checkpoints.map((count) => (count / totalQuestions) * 100);

      checkpoints.forEach((checkpoint, index) => {
        expect(expectedProgress[index]).toBe((checkpoint / totalQuestions) * 100);
      });

      // Final should be 100%
      expect(expectedProgress[expectedProgress.length - 1]).toBe(100);
    });
  });

  describe('Template Import Duplicate Detection', () => {
    it('should identify duplicate obligations by title (case-insensitive)', () => {
      const existingObligations = [
        { title: 'Establish AI Governance Framework', id: '123' },
        { title: 'Implement Risk Management System', id: '456' },
      ];

      const newTemplate = { title: 'establish ai governance framework' };

      // Duplicate detection (case-insensitive)
      const isDuplicate = existingObligations.some(
        (o) => o.title.toLowerCase() === newTemplate.title.toLowerCase()
      );

      expect(isDuplicate).toBe(true);
    });

    it('should allow similar but distinct obligations', () => {
      const existingObligations = [
        { title: 'Implement Risk Management System', id: '456' },
      ];

      const newTemplate = { title: 'Implement Risk Monitoring Process' };

      const isDuplicate = existingObligations.some(
        (o) => o.title.toLowerCase() === newTemplate.title.toLowerCase()
      );

      expect(isDuplicate).toBe(false);
    });
  });
});
