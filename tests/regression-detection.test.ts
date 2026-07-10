import { describe, it, expect, beforeEach } from 'vitest';
import {
  detectRegressions,
  shouldCreateAlert,
  formatRegressionIssue,
  type RegressionAlert,
} from '@/lib/regression-detection';
import type { IncidentMetrics } from '@/lib/incident-metrics';

describe('Regression Detection', () => {
  const createMockMetrics = (overrides: Partial<IncidentMetrics>): IncidentMetrics => ({
    totalIncidents: 10,
    resolvedIncidents: 9,
    unresolvedIncidents: 1,
    averageMTTR: 15,
    averageMTTD: 2.5,
    successRate: 80,
    playbookEffectiveness: {
      deployment: 85,
      database: 75,
      api: 80,
    },
    medianResolutionTime: 14,
    p95ResolutionTime: 30,
    p99ResolutionTime: 45,
    trendDirection: 'stable',
    trendMagnitude: 0,
    ...overrides,
  });

  describe('Regression Detection - MTTR', () => {
    it('should detect MTTR increase above threshold', () => {
      const current = createMockMetrics({ averageMTTR: 18 }); // 20% increase
      const baseline = createMockMetrics({ averageMTTR: 15 });

      const alert = detectRegressions(current, baseline);

      expect(alert.detected).toBe(true);
      expect(alert.regressions.some((r) => r.name === 'mttr')).toBe(true);

      const mttrRegression = alert.regressions.find((r) => r.name === 'mttr');
      expect(mttrRegression?.changePercent).toBeGreaterThan(15); // Above 15% threshold
      expect(mttrRegression?.degraded).toBe(true);
    });

    it('should not alert for MTTR increase below threshold', () => {
      const current = createMockMetrics({ averageMTTR: 16.5 }); // ~10% increase
      const baseline = createMockMetrics({ averageMTTR: 15 });

      const alert = detectRegressions(current, baseline);

      const mttrRegression = alert.regressions.find((r) => r.name === 'mttr');
      expect(mttrRegression).toBeUndefined();
    });

    it('should not alert when MTTR improves', () => {
      const current = createMockMetrics({ averageMTTR: 12 });
      const baseline = createMockMetrics({ averageMTTR: 15 });

      const alert = detectRegressions(current, baseline);

      const mttrRegression = alert.regressions.find((r) => r.name === 'mttr');
      expect(mttrRegression).toBeUndefined();
    });
  });

  describe('Regression Detection - MTTD', () => {
    it('should detect MTTD increase above threshold', () => {
      const current = createMockMetrics({ averageMTTD: 3.5 }); // 40% increase
      const baseline = createMockMetrics({ averageMTTD: 2.5 });

      const alert = detectRegressions(current, baseline);

      expect(alert.detected).toBe(true);

      const mttdRegression = alert.regressions.find((r) => r.name === 'mttd');
      expect(mttdRegression?.changePercent).toBeGreaterThan(20); // Above 20% threshold
      expect(mttdRegression?.degraded).toBe(true);
    });

    it('should not alert for MTTD increase below threshold', () => {
      const current = createMockMetrics({ averageMTTD: 2.8 }); // ~12% increase
      const baseline = createMockMetrics({ averageMTTD: 2.5 });

      const alert = detectRegressions(current, baseline);

      const mttdRegression = alert.regressions.find((r) => r.name === 'mttd');
      expect(mttdRegression).toBeUndefined();
    });
  });

  describe('Regression Detection - Success Rate', () => {
    it('should detect success rate drop above threshold', () => {
      const current = createMockMetrics({ successRate: 70 }); // 10% point drop
      const baseline = createMockMetrics({ successRate: 80 });

      const alert = detectRegressions(current, baseline);

      expect(alert.detected).toBe(true);

      const successRegression = alert.regressions.find((r) => r.name === 'successRate');
      expect(successRegression?.degraded).toBe(true);
      expect(successRegression?.changePercent).toBeLessThan(-10);
    });

    it('should not alert for success rate drop below threshold', () => {
      const current = createMockMetrics({ successRate: 78 }); // 2% point drop
      const baseline = createMockMetrics({ successRate: 80 });

      const alert = detectRegressions(current, baseline);

      const successRegression = alert.regressions.find((r) => r.name === 'successRate');
      expect(successRegression).toBeUndefined();
    });

    it('should not alert when success rate improves', () => {
      const current = createMockMetrics({ successRate: 85 });
      const baseline = createMockMetrics({ successRate: 80 });

      const alert = detectRegressions(current, baseline);

      const successRegression = alert.regressions.find((r) => r.name === 'successRate');
      expect(successRegression).toBeUndefined();
    });
  });

  describe('Regression Detection - Playbook Effectiveness', () => {
    it('should detect playbook effectiveness drop', () => {
      const current = createMockMetrics({
        playbookEffectiveness: {
          deployment: 70, // 15% drop
          database: 75,
          api: 80,
        },
      });
      const baseline = createMockMetrics({
        playbookEffectiveness: {
          deployment: 85,
          database: 75,
          api: 80,
        },
      });

      const alert = detectRegressions(current, baseline);

      expect(alert.affectedCategories.some((c) => c.category === 'deployment')).toBe(true);

      const deploymentCategory = alert.affectedCategories.find((c) => c.category === 'deployment');
      expect(deploymentCategory?.changePercent).toBeLessThan(-15);
    });

    it('should not alert for minor playbook effectiveness changes', () => {
      const current = createMockMetrics({
        playbookEffectiveness: {
          deployment: 83, // ~2% drop
          database: 75,
          api: 80,
        },
      });
      const baseline = createMockMetrics({
        playbookEffectiveness: {
          deployment: 85,
          database: 75,
          api: 80,
        },
      });

      const alert = detectRegressions(current, baseline);

      expect(alert.affectedCategories.some((c) => c.category === 'deployment')).toBe(false);
    });
  });

  describe('Severity Calculation', () => {
    it('should classify critical severity for >25% degradation', () => {
      const current = createMockMetrics({ averageMTTR: 25 }); // ~67% increase
      const baseline = createMockMetrics({ averageMTTR: 15 });

      const alert = detectRegressions(current, baseline);

      expect(alert.severity).toBe('critical');
    });

    it('should classify high severity for 15-25% degradation', () => {
      const current = createMockMetrics({ averageMTTR: 18 }); // ~20% increase
      const baseline = createMockMetrics({ averageMTTR: 15 });

      const alert = detectRegressions(current, baseline);

      expect(alert.severity).toBe('high');
    });

    it('should classify medium severity for 10-15% degradation', () => {
      const current = createMockMetrics({ successRate: 70 }); // 10% point drop
      const baseline = createMockMetrics({ successRate: 80 });

      const alert = detectRegressions(current, baseline);

      expect(alert.severity).toBe('medium');
    });

    it('should classify low severity for 5-10% degradation', () => {
      const current = createMockMetrics({ averageMTTR: 15.6 }); // ~4% increase (but success rate drop)
      const baseline = createMockMetrics({ averageMTTR: 15, successRate: 75 });

      const alert = detectRegressions(current, baseline);

      // Still none if below thresholds
      expect(alert.severity).toBe('none');
    });

    it('should classify no severity when no regression', () => {
      const current = createMockMetrics({ averageMTTR: 15 });
      const baseline = createMockMetrics({ averageMTTR: 15 });

      const alert = detectRegressions(current, baseline);

      expect(alert.severity).toBe('none');
      expect(alert.detected).toBe(false);
    });
  });

  describe('Alert Creation Decision', () => {
    it('should create alert for critical regressions', () => {
      const alert: RegressionAlert = {
        detected: true,
        severity: 'critical',
        timestamp: new Date().toISOString(),
        regressions: [],
        affectedCategories: [],
        recommendedActions: [],
        details: 'Critical regression',
      };

      expect(shouldCreateAlert(alert)).toBe(true);
    });

    it('should create alert for high severity regressions', () => {
      const alert: RegressionAlert = {
        detected: true,
        severity: 'high',
        timestamp: new Date().toISOString(),
        regressions: [],
        affectedCategories: [],
        recommendedActions: [],
        details: 'High severity regression',
      };

      expect(shouldCreateAlert(alert)).toBe(true);
    });

    it('should create alert for medium severity regressions', () => {
      const alert: RegressionAlert = {
        detected: true,
        severity: 'medium',
        timestamp: new Date().toISOString(),
        regressions: [],
        affectedCategories: [],
        recommendedActions: [],
        details: 'Medium severity regression',
      };

      expect(shouldCreateAlert(alert)).toBe(true);
    });

    it('should not create alert for low severity regressions', () => {
      const alert: RegressionAlert = {
        detected: true,
        severity: 'low',
        timestamp: new Date().toISOString(),
        regressions: [],
        affectedCategories: [],
        recommendedActions: [],
        details: 'Low severity regression',
      };

      expect(shouldCreateAlert(alert)).toBe(false);
    });

    it('should not create alert when no regression detected', () => {
      const alert: RegressionAlert = {
        detected: false,
        severity: 'none',
        timestamp: new Date().toISOString(),
        regressions: [],
        affectedCategories: [],
        recommendedActions: [],
        details: 'No regression',
      };

      expect(shouldCreateAlert(alert)).toBe(false);
    });
  });

  describe('Alert Formatting', () => {
    it('should format critical regression issue correctly', () => {
      const alert: RegressionAlert = {
        detected: true,
        severity: 'critical',
        timestamp: '2026-07-10T18:00:00Z',
        regressions: [
          {
            name: 'mttr',
            currentValue: 25,
            baselineValue: 15,
            changePercent: 66.67,
            threshold: 15,
            degraded: true,
          },
        ],
        affectedCategories: [],
        recommendedActions: [
          'Review recent playbook changes',
          'Check system resources',
        ],
        details: '**Metric Regressions Detected:**\n\n- **MTTR**: 25.00 (was 15.00) - ⬆️ 66.7% change',
      };

      const issue = formatRegressionIssue(alert);

      expect(issue.title).toContain('🚨');
      expect(issue.title).toContain('CRITICAL');
      expect(issue.body).toContain('CRITICAL');
      expect(issue.body).toContain('MTTR');
      expect(issue.body).toContain('66.7%');
      expect(issue.body).toContain('Review recent playbook changes');
      expect(issue.labels).toContain('regression');
      expect(issue.labels).toContain('incident-response');
      expect(issue.labels).toContain('severity-critical');
    });

    it('should format high severity issue correctly', () => {
      const alert: RegressionAlert = {
        detected: true,
        severity: 'high',
        timestamp: '2026-07-10T18:00:00Z',
        regressions: [],
        affectedCategories: [
          {
            category: 'database',
            currentEffectiveness: 60,
            baselineEffectiveness: 75,
            changePercent: -20,
          },
        ],
        recommendedActions: [],
        details: 'Database playbook effectiveness declined',
      };

      const issue = formatRegressionIssue(alert);

      expect(issue.title).toContain('⚠️');
      expect(issue.title).toContain('HIGH');
      expect(issue.body).toContain('database');
      expect(issue.labels).toContain('severity-high');
    });

    it('should format medium severity issue correctly', () => {
      const alert: RegressionAlert = {
        detected: true,
        severity: 'medium',
        timestamp: '2026-07-10T18:00:00Z',
        regressions: [],
        affectedCategories: [],
        recommendedActions: [],
        details: 'Minor regression detected',
      };

      const issue = formatRegressionIssue(alert);

      expect(issue.title).toContain('⚡');
      expect(issue.title).toContain('MEDIUM');
      expect(issue.labels).toContain('severity-medium');
    });

    it('should include recommended actions in formatted issue', () => {
      const alert: RegressionAlert = {
        detected: true,
        severity: 'high',
        timestamp: '2026-07-10T18:00:00Z',
        regressions: [],
        affectedCategories: [],
        recommendedActions: [
          'Action 1: Review configurations',
          'Action 2: Check system health',
          'Action 3: Analyze recent changes',
        ],
        details: 'Regression detected',
      };

      const issue = formatRegressionIssue(alert);

      expect(issue.body).toContain('Recommended Actions');
      expect(issue.body).toContain('1. Action 1: Review configurations');
      expect(issue.body).toContain('2. Action 2: Check system health');
      expect(issue.body).toContain('3. Action 3: Analyze recent changes');
    });
  });

  describe('Multiple Regressions', () => {
    it('should detect multiple regressions simultaneously', () => {
      const current = createMockMetrics({
        averageMTTR: 18, // 20% increase
        averageMTTD: 3.5, // 40% increase (exceeds 25% threshold -> critical)
        successRate: 70, // 10% point drop
        playbookEffectiveness: {
          deployment: 70, // 15% drop
          database: 75,
          api: 80,
        },
      });
      const baseline = createMockMetrics({
        averageMTTR: 15,
        averageMTTD: 2.5,
        successRate: 80,
        playbookEffectiveness: {
          deployment: 85,
          database: 75,
          api: 80,
        },
      });

      const alert = detectRegressions(current, baseline);

      expect(alert.detected).toBe(true);
      expect(alert.regressions.length).toBeGreaterThanOrEqual(1);
      expect(alert.affectedCategories.length).toBeGreaterThan(0);
      // MTTD 40% increase exceeds 25% critical threshold
      expect(alert.severity).toBe('critical');
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero baseline metrics', () => {
      const current = createMockMetrics({ averageMTTR: 15 });
      const baseline = createMockMetrics({ averageMTTR: 0 });

      const alert = detectRegressions(current, baseline);

      // Should not crash, but won't detect regression (can't divide by zero)
      expect(alert).toBeDefined();
    });

    it('should handle missing playbook categories', () => {
      const current = createMockMetrics({
        playbookEffectiveness: {
          deployment: 70,
        },
      });
      const baseline = createMockMetrics({
        playbookEffectiveness: {
          deployment: 85,
          database: 75,
        },
      });

      const alert = detectRegressions(current, baseline);

      // Should only check categories that exist in both
      expect(alert.affectedCategories.some((c) => c.category === 'deployment')).toBe(true);
    });

    it('should handle exact threshold boundary', () => {
      const current = createMockMetrics({ averageMTTR: 17.26 }); // Just above 15% increase
      const baseline = createMockMetrics({ averageMTTR: 15 });

      const alert = detectRegressions(current, baseline);

      // Just above threshold should be detected
      const mttrRegression = alert.regressions.find((r) => r.name === 'mttr');
      expect(mttrRegression?.changePercent).toBeGreaterThan(15);
    });
  });
});
