import { describe, it, expect } from 'vitest';
import {
  detectFailures,
  determineRemediationActions,
  executeRemediationAction,
  generateRemediationReport,
  formatRemediationAlert,
  AutonomousRemediationEngine,
  type DetectedFailure,
  type RemediationAttempt,
} from '@/lib/autonomous-remediation';

describe('Autonomous Remediation (DNA-GOV-011)', () => {
  describe('detectFailures', () => {
    it('detects elevated error rate', () => {
      const metrics = { error_rate_percent: 8 };
      const failures = detectFailures(metrics);

      expect(failures).toHaveLength(1);
      expect(failures[0].category).toBe('error-rate');
      expect(failures[0].severity).toBe('high');
    });

    it('marks error rate as critical when > 10%', () => {
      const metrics = { error_rate_percent: 15 };
      const failures = detectFailures(metrics);

      expect(failures[0].severity).toBe('critical');
    });

    it('detects performance degradation (P99 latency)', () => {
      const metrics = { response_time_p99_ms: 7000 };
      const failures = detectFailures(metrics);

      expect(failures).toHaveLength(1);
      expect(failures[0].category).toBe('performance');
    });

    it('detects deployment health issues', () => {
      const metrics = { deployment_health_percent: 92 };
      const failures = detectFailures(metrics);

      expect(failures).toHaveLength(1);
      expect(failures[0].category).toBe('deployment');
    });

    it('detects high memory usage', () => {
      const metrics = { memory_usage_percent: 95 };
      const failures = detectFailures(metrics);

      expect(failures).toHaveLength(1);
      expect(failures[0].category).toBe('memory');
      expect(failures[0].severity).toBe('critical');
    });

    it('detects multiple failures simultaneously', () => {
      const metrics = {
        error_rate_percent: 6,
        response_time_p99_ms: 6000,
        memory_usage_percent: 92,
      };
      const failures = detectFailures(metrics);

      expect(failures.length).toBeGreaterThanOrEqual(3);
    });

    it('returns empty array when metrics are healthy', () => {
      const metrics = {
        error_rate_percent: 1,
        response_time_p99_ms: 500,
        deployment_health_percent: 100,
        memory_usage_percent: 50,
      };
      const failures = detectFailures(metrics);

      expect(failures).toHaveLength(0);
    });

    it('includes evidence in detected failures', () => {
      const metrics = { error_rate_percent: 8 };
      const failures = detectFailures(metrics);

      expect(failures[0].evidence).toContain('error_rate_percent: 8%');
    });
  });

  describe('determineRemediationActions', () => {
    it('suggests circuit break for error rate failures', () => {
      const failures: DetectedFailure[] = [
        {
          category: 'error-rate',
          severity: 'high',
          description: 'Error rate elevated',
          affectedService: 'api',
          detectedAt: new Date().toISOString(),
          evidence: [],
          suggestedActions: ['circuit-break', 'alert-only'],
        },
      ];

      const actions = determineRemediationActions(failures);

      expect(actions).toContain('circuit-break');
    });

    it('suggests scale and cache-clear for performance issues', () => {
      const failures: DetectedFailure[] = [
        {
          category: 'performance',
          severity: 'high',
          description: 'High latency',
          affectedService: 'api',
          detectedAt: new Date().toISOString(),
          evidence: [],
          suggestedActions: ['cache-clear', 'scale'],
        },
      ];

      const actions = determineRemediationActions(failures);

      expect(actions).toContain('cache-clear');
      expect(actions).toContain('scale');
    });

    it('suggests rollback for deployment failures', () => {
      const failures: DetectedFailure[] = [
        {
          category: 'deployment',
          severity: 'critical',
          description: 'Bad deployment',
          affectedService: 'deployment',
          detectedAt: new Date().toISOString(),
          evidence: [],
          suggestedActions: ['rollback'],
        },
      ];

      const actions = determineRemediationActions(failures);

      expect(actions).toContain('rollback');
    });

    it('deduplicates actions across multiple failures', () => {
      const failures: DetectedFailure[] = [
        {
          category: 'error-rate',
          severity: 'high',
          description: 'High errors',
          affectedService: 'api',
          detectedAt: new Date().toISOString(),
          evidence: [],
          suggestedActions: ['circuit-break'],
        },
        {
          category: 'performance',
          severity: 'high',
          description: 'High latency',
          affectedService: 'api',
          detectedAt: new Date().toISOString(),
          evidence: [],
          suggestedActions: ['circuit-break', 'cache-clear'],
        },
      ];

      const actions = determineRemediationActions(failures);

      expect(actions.filter(a => a === 'circuit-break')).toHaveLength(1);
    });
  });

  describe('executeRemediationAction', () => {
    it('executes rollback action', async () => {
      const attempt = await executeRemediationAction('rollback', 'api');

      expect(attempt.action).toBe('rollback');
      expect(attempt.success).toBe(true);
      expect(attempt.result).toContain('rolled back');
    });

    it('executes restart action', async () => {
      const attempt = await executeRemediationAction('restart', 'api');

      expect(attempt.action).toBe('restart');
      expect(attempt.success).toBe(true);
    });

    it('executes scale action', async () => {
      const attempt = await executeRemediationAction('scale', 'api');

      expect(attempt.action).toBe('scale');
      expect(attempt.success).toBe(true);
      expect(attempt.result).toContain('Scaled');
    });

    it('executes cache-clear action', async () => {
      const attempt = await executeRemediationAction('cache-clear', 'api');

      expect(attempt.action).toBe('cache-clear');
      expect(attempt.success).toBe(true);
    });

    it('executes circuit-break action', async () => {
      const attempt = await executeRemediationAction('circuit-break', 'api');

      expect(attempt.action).toBe('circuit-break');
      expect(attempt.success).toBe(true);
      expect(attempt.result).toContain('circuit breaker');
    });

    it('executes alert-only action', async () => {
      const attempt = await executeRemediationAction('alert-only', 'api');

      expect(attempt.action).toBe('alert-only');
      expect(attempt.success).toBe(true);
      expect(attempt.result).toContain('Alert');
    });

    it('includes completedAt timestamp', async () => {
      const attempt = await executeRemediationAction('restart', 'api');

      expect(attempt.completedAt).toBeDefined();
      expect(new Date(attempt.completedAt!).getTime()).toBeGreaterThan(0);
    });
  });

  describe('generateRemediationReport', () => {
    it('generates report with no failures', () => {
      const failures: DetectedFailure[] = [];
      const attempts: RemediationAttempt[] = [];

      const report = generateRemediationReport(failures, attempts);

      expect(report.summary).toContain('healthy');
      expect(report.successRate).toBe(100);
      expect(report.outageAvoided).toBe(true);
    });

    it('generates report with successful remediation', () => {
      const failures: DetectedFailure[] = [
        {
          category: 'error-rate',
          severity: 'high',
          description: 'High errors',
          affectedService: 'api',
          detectedAt: new Date().toISOString(),
          evidence: [],
          suggestedActions: ['circuit-break'],
        },
      ];
      const attempts: RemediationAttempt[] = [
        {
          failureId: 'f1',
          action: 'circuit-break',
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          success: true,
          result: 'Circuit breaker enabled',
        },
      ];

      const report = generateRemediationReport(failures, attempts);

      expect(report.successRate).toBe(100);
      expect(report.summary).toContain('resolved');
    });

    it('generates report with partial remediation success', () => {
      const failures: DetectedFailure[] = [
        {
          category: 'error-rate',
          severity: 'high',
          description: 'High errors',
          affectedService: 'api',
          detectedAt: new Date().toISOString(),
          evidence: [],
          suggestedActions: ['circuit-break'],
        },
      ];
      const attempts: RemediationAttempt[] = [
        {
          failureId: 'f1',
          action: 'circuit-break',
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          success: false,
          result: 'Failed',
          error: 'Service unavailable',
        },
      ];

      const report = generateRemediationReport(failures, attempts);

      expect(report.successRate).toBe(0);
      expect(report.summary).toContain('failed');
    });

    it('calculates success rate correctly', () => {
      const failures: DetectedFailure[] = [];
      const attempts: RemediationAttempt[] = [
        {
          failureId: 'f1',
          action: 'restart',
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          success: true,
          result: 'Restarted',
        },
        {
          failureId: 'f2',
          action: 'scale',
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          success: true,
          result: 'Scaled',
        },
        {
          failureId: 'f3',
          action: 'rollback',
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          success: false,
          result: 'Failed',
          error: 'No previous version',
        },
      ];

      const report = generateRemediationReport(failures, attempts);

      expect(report.successRate).toBe(66.66666666666666);
    });
  });

  describe('formatRemediationAlert', () => {
    it('formats healthy state report', () => {
      const report = {
        timestamp: new Date().toISOString(),
        detectedFailures: [],
        attempts: [],
        successRate: 100,
        outageAvoided: true,
        summary: '✅ All systems healthy',
      };

      const formatted = formatRemediationAlert(report);

      expect(formatted).toContain('healthy');
      expect(formatted).toContain('✅');
    });

    it('formats failure and remediation report', () => {
      const report = {
        timestamp: new Date().toISOString(),
        detectedFailures: [
          {
            category: 'error-rate' as const,
            severity: 'high' as const,
            description: 'High error rate',
            affectedService: 'api',
            detectedAt: new Date().toISOString(),
            evidence: ['error_rate: 8%'],
            suggestedActions: ['circuit-break'],
          },
        ],
        attempts: [
          {
            failureId: 'f1',
            action: 'circuit-break' as const,
            startedAt: new Date().toISOString(),
            completedAt: new Date().toISOString(),
            success: true,
            result: 'Circuit breaker enabled',
          },
        ],
        successRate: 100,
        outageAvoided: true,
        summary: 'Issues detected and resolved',
      };

      const formatted = formatRemediationAlert(report);

      expect(formatted).toContain('error-rate');
      expect(formatted).toContain('circuit-break');
      expect(formatted).toContain('✅');
    });

    it('warns about critical outages', () => {
      const report = {
        timestamp: new Date().toISOString(),
        detectedFailures: [
          {
            category: 'deployment' as const,
            severity: 'critical' as const,
            description: 'Critical deployment failure',
            affectedService: 'deployment',
            detectedAt: new Date().toISOString(),
            evidence: [],
            suggestedActions: ['rollback'],
          },
        ],
        attempts: [
          {
            failureId: 'f1',
            action: 'rollback' as const,
            startedAt: new Date().toISOString(),
            completedAt: new Date().toISOString(),
            success: false,
            result: 'Failed',
            error: 'Rollback unavailable',
          },
        ],
        successRate: 0,
        outageAvoided: false,
        summary: 'Critical failure, manual intervention required',
      };

      const formatted = formatRemediationAlert(report);

      expect(formatted).toContain('CRITICAL');
      expect(formatted).toContain('Manual intervention');
    });
  });

  describe('AutonomousRemediationEngine', () => {
    it('runs complete remediation cycle', async () => {
      const engine = new AutonomousRemediationEngine();
      const metrics = { error_rate_percent: 8, response_time_p99_ms: 2000 };

      const result = await engine.runRemediationCycle(metrics);

      expect(result.detectedFailures.length).toBeGreaterThan(0);
      expect(result.attempts.length).toBeGreaterThan(0);
      expect(result.summary).toBeDefined();
    });

    it('maintains attempt history', async () => {
      const engine = new AutonomousRemediationEngine();

      await engine.runRemediationCycle({ error_rate_percent: 8 });
      await engine.runRemediationCycle({ response_time_p99_ms: 6000 });

      const history = engine.getAttemptHistory();
      expect(history.length).toBeGreaterThanOrEqual(2);
    });

    it('can reset history', async () => {
      const engine = new AutonomousRemediationEngine();

      await engine.runRemediationCycle({ error_rate_percent: 8 });
      expect(engine.getAttemptHistory().length).toBeGreaterThan(0);

      engine.resetHistory();
      expect(engine.getAttemptHistory()).toHaveLength(0);
    });

    it('handles healthy metrics gracefully', async () => {
      const engine = new AutonomousRemediationEngine();
      const metrics = {
        error_rate_percent: 0.5,
        response_time_p99_ms: 300,
        deployment_health_percent: 100,
        memory_usage_percent: 40,
      };

      const result = await engine.runRemediationCycle(metrics);

      expect(result.detectedFailures).toHaveLength(0);
      expect(result.summary).toContain('healthy');
    });
  });

  describe('edge cases', () => {
    it('handles missing metrics gracefully', () => {
      const metrics = {};
      const failures = detectFailures(metrics);

      // Should not crash; treats missing metrics as healthy
      expect(Array.isArray(failures)).toBe(true);
    });

    it('handles multiple failures of same category', () => {
      const failures: DetectedFailure[] = [
        {
          category: 'error-rate',
          severity: 'high',
          description: 'High errors (API)',
          affectedService: 'api',
          detectedAt: new Date().toISOString(),
          evidence: [],
          suggestedActions: ['circuit-break'],
        },
        {
          category: 'error-rate',
          severity: 'high',
          description: 'High errors (Auth)',
          affectedService: 'auth',
          detectedAt: new Date().toISOString(),
          evidence: [],
          suggestedActions: ['restart'],
        },
      ];

      const actions = determineRemediationActions(failures);

      expect(actions).toContain('circuit-break');
      expect(actions).toContain('restart');
    });

    it('reports correct severity levels', () => {
      const highSeverity = detectFailures({ error_rate_percent: 7 });
      const criticalSeverity = detectFailures({ error_rate_percent: 15 });

      expect(highSeverity[0].severity).toBe('high');
      expect(criticalSeverity[0].severity).toBe('critical');
    });
  });
});
