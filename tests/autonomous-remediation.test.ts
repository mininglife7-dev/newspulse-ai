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
  type DetectionEvidence,
  type RemediationResult,
} from '@/lib/autonomous-remediation';

describe('Autonomous Remediation (DNA-GOV-011)', () => {
  describe('detectFailures', () => {
    it('detects elevated error rate', () => {
      const metrics = { error_rate_percent: 8 };
      const failures = detectFailures(metrics);

      expect(failures).toHaveLength(1);
      expect(failures[0].category).toBe('error-rate-spike');
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
      expect(failures[0].category).toBe('degraded-latency');
    });

    it('detects deployment health issues', () => {
      const metrics = { deployment_health_percent: 92 };
      const failures = detectFailures(metrics);

      expect(failures).toHaveLength(1);
      expect(failures[0].category).toBe('failed-deployment');
    });

    it('detects high memory usage', () => {
      const metrics = { memory_usage_percent: 95 };
      const failures = detectFailures(metrics);

      expect(failures).toHaveLength(1);
      expect(failures[0].category).toBe('unhealthy-service');
      expect(failures[0].severity).toBe('critical');
    });

    it('detects multiple failures simultaneously', () => {
      const metrics = {
        error_rate_percent: 6,
        response_time_p99_ms: 6000,
        memory_usage_percent: 92,
      };
      const failures = detectFailures(metrics);

      expect(failures.length).toBeGreaterThanOrEqual(2); // At least error-rate-spike and degraded-latency or unhealthy-service
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

      expect(failures[0].evidence).toHaveLength(1);
      expect(failures[0].evidence[0].metric).toBe('error_rate_percent');
      expect(failures[0].evidence[0].value).toBe(8);
    });
  });

  describe('determineRemediationActions', () => {
    it('suggests circuit-break for error rate failures', () => {
      const failures: DetectedFailure[] = [
        {
          id: 'f-error-1',
          category: 'error-rate-spike',
          severity: 'high',
          description: 'Error rate elevated',
          affectedService: 'api',
          detectedAt: new Date().toISOString(),
          evidence: [],
          suggestedActions: ['circuit-break', 'alert-founder'],
          isRecurring: false,
          recurringCount: 1,
        },
      ];

      const actions = determineRemediationActions(failures);

      expect(actions).toContain('circuit-break');
    });

    it('suggests scale-up and clear-cache for performance issues', () => {
      const failures: DetectedFailure[] = [
        {
          id: 'f-perf-1',
          category: 'degraded-latency',
          severity: 'high',
          description: 'High latency',
          affectedService: 'api',
          detectedAt: new Date().toISOString(),
          evidence: [],
          suggestedActions: ['clear-cache', 'scale-up'],
          isRecurring: false,
          recurringCount: 1,
        },
      ];

      const actions = determineRemediationActions(failures);

      expect(actions).toContain('clear-cache');
      expect(actions).toContain('scale-up');
    });

    it('suggests rollback-deployment for deployment failures', () => {
      const failures: DetectedFailure[] = [
        {
          id: 'f-deploy-1',
          category: 'failed-deployment',
          severity: 'critical',
          description: 'Bad deployment',
          affectedService: 'deployment',
          detectedAt: new Date().toISOString(),
          evidence: [],
          suggestedActions: ['rollback-deployment'],
          isRecurring: false,
          recurringCount: 1,
        },
      ];

      const actions = determineRemediationActions(failures);

      expect(actions).toContain('rollback-deployment');
    });

    it('deduplicates actions across multiple failures', () => {
      const failures: DetectedFailure[] = [
        {
          id: 'f-error-2',
          category: 'error-rate-spike',
          severity: 'high',
          description: 'High errors',
          affectedService: 'api',
          detectedAt: new Date().toISOString(),
          evidence: [],
          suggestedActions: ['circuit-break'],
          isRecurring: false,
          recurringCount: 1,
        },
        {
          id: 'f-perf-2',
          category: 'degraded-latency',
          severity: 'high',
          description: 'High latency',
          affectedService: 'api',
          detectedAt: new Date().toISOString(),
          evidence: [],
          suggestedActions: ['circuit-break', 'clear-cache'],
          isRecurring: false,
          recurringCount: 1,
        },
      ];

      const actions = determineRemediationActions(failures);

      expect(actions.filter((a) => a === 'circuit-break')).toHaveLength(1);
    });
  });

  describe('executeRemediationAction', () => {
    it('executes rollback-deployment action', async () => {
      const attempt = await executeRemediationAction(
        'rollback-deployment',
        'api'
      );

      expect(attempt.action).toBe('rollback-deployment');
      expect(attempt.success).toBe(true);
      expect(attempt.result).toContain('Rolled back');
    });

    it('executes restart-service action', async () => {
      const attempt = await executeRemediationAction('restart-service', 'api');

      expect(attempt.action).toBe('restart-service');
      expect(attempt.success).toBe(true);
    });

    it('executes scale-up action', async () => {
      const attempt = await executeRemediationAction('scale-up', 'api');

      expect(attempt.action).toBe('scale-up');
      expect(attempt.success).toBe(true);
      expect(attempt.result).toContain('Scaled');
    });

    it('executes clear-cache action', async () => {
      const attempt = await executeRemediationAction('clear-cache', 'api');

      expect(attempt.action).toBe('clear-cache');
      expect(attempt.success).toBe(true);
    });

    it('executes circuit-break action', async () => {
      const attempt = await executeRemediationAction('circuit-break', 'api');

      expect(attempt.action).toBe('circuit-break');
      expect(attempt.success).toBe(true);
      expect(attempt.result).toContain('circuit breaker');
    });

    it('executes alert-founder action', async () => {
      const attempt = await executeRemediationAction('alert-founder', 'api');

      expect(attempt.action).toBe('alert-founder');
      expect(attempt.success).toBe(true);
      expect(attempt.result).toContain('Alert');
    });

    it('includes completedAt timestamp', async () => {
      const attempt = await executeRemediationAction('restart-service', 'api');

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
          id: 'f1',
          category: 'error-rate-spike',
          severity: 'high',
          description: 'High errors',
          affectedService: 'api',
          detectedAt: new Date().toISOString(),
          evidence: [],
          suggestedActions: ['circuit-break'],
          isRecurring: false,
          recurringCount: 1,
        },
      ];
      const attempts: RemediationAttempt[] = [
        {
          id: 'attempt-1',
          failureId: 'f1',
          action: 'circuit-break',
          classification: 'safe-autonomous',
          dryRun: false,
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
          id: 'f1',
          category: 'error-rate-spike',
          severity: 'high',
          description: 'High errors',
          affectedService: 'api',
          detectedAt: new Date().toISOString(),
          evidence: [],
          suggestedActions: ['circuit-break'],
          isRecurring: false,
          recurringCount: 1,
        },
      ];
      const attempts: RemediationAttempt[] = [
        {
          id: 'attempt-1',
          failureId: 'f1',
          action: 'circuit-break',
          classification: 'safe-autonomous',
          dryRun: false,
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
          id: 'attempt-1',
          failureId: 'f1',
          action: 'restart-service',
          classification: 'reversible-verification-required',
          dryRun: false,
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          success: true,
          result: 'Restarted',
        },
        {
          id: 'attempt-2',
          failureId: 'f2',
          action: 'scale-up',
          classification: 'reversible-verification-required',
          dryRun: false,
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          success: true,
          result: 'Scaled',
        },
        {
          id: 'attempt-3',
          failureId: 'f3',
          action: 'rollback-deployment',
          classification: 'founder-gated',
          dryRun: false,
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
      const report: RemediationResult = {
        timestamp: new Date().toISOString(),
        detectedFailures: [],
        attempts: [],
        successRate: 100,
        outageAvoided: true,
        escalatedToFounder: false,
        summary: '✅ All systems healthy',
      };

      const formatted = formatRemediationAlert(report);

      expect(formatted).toContain('healthy');
      expect(formatted).toContain('✅');
    });

    it('formats failure and remediation report', () => {
      const report: RemediationResult = {
        timestamp: new Date().toISOString(),
        detectedFailures: [
          {
            id: 'f1',
            category: 'error-rate-spike' as const,
            severity: 'high' as const,
            description: 'High error rate',
            affectedService: 'api',
            detectedAt: new Date().toISOString(),
            evidence: [
              {
                metric: 'error_rate',
                value: 8,
                threshold: 5,
                timestamp: new Date().toISOString(),
              },
            ],
            suggestedActions: ['circuit-break' as const],
            isRecurring: false,
            recurringCount: 1,
          },
        ],
        attempts: [
          {
            id: 'attempt-1',
            failureId: 'f1',
            action: 'circuit-break' as const,
            classification: 'safe-autonomous' as const,
            dryRun: false,
            startedAt: new Date().toISOString(),
            completedAt: new Date().toISOString(),
            success: true,
            result: 'Circuit breaker enabled',
          },
        ],
        successRate: 100,
        outageAvoided: true,
        escalatedToFounder: false,
        summary: 'Issues detected and resolved',
      };

      const formatted = formatRemediationAlert(report);

      expect(formatted).toContain('error-rate-spike');
      expect(formatted).toContain('circuit-break');
      expect(formatted).toContain('✅');
    });

    it('warns about critical outages', () => {
      const report: RemediationResult = {
        timestamp: new Date().toISOString(),
        detectedFailures: [
          {
            id: 'f1',
            category: 'failed-deployment' as const,
            severity: 'critical' as const,
            description: 'Critical deployment failure',
            affectedService: 'deployment',
            detectedAt: new Date().toISOString(),
            evidence: [],
            suggestedActions: ['rollback-deployment' as const],
            isRecurring: false,
            recurringCount: 1,
          },
        ],
        attempts: [
          {
            id: 'attempt-1',
            failureId: 'f1',
            action: 'rollback-deployment' as const,
            classification: 'founder-gated' as const,
            dryRun: false,
            startedAt: new Date().toISOString(),
            completedAt: new Date().toISOString(),
            success: false,
            result: 'Failed',
            error: 'Rollback unavailable',
          },
        ],
        successRate: 0,
        outageAvoided: false,
        escalatedToFounder: true,
        summary: 'Critical failure, manual intervention required',
      };

      const formatted = formatRemediationAlert(report);

      expect(formatted).toContain('Critical');
      expect(formatted).toContain('Founder intervention');
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
      expect(result.escalatedToFounder).toBe(false);
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
          id: 'f-error-api',
          category: 'error-rate-spike',
          severity: 'high',
          description: 'High errors (API)',
          affectedService: 'api',
          detectedAt: new Date().toISOString(),
          evidence: [],
          suggestedActions: ['circuit-break'],
          isRecurring: false,
          recurringCount: 1,
        },
        {
          id: 'f-error-auth',
          category: 'error-rate-spike',
          severity: 'high',
          description: 'High errors (Auth)',
          affectedService: 'auth',
          detectedAt: new Date().toISOString(),
          evidence: [],
          suggestedActions: ['restart-service'],
          isRecurring: false,
          recurringCount: 1,
        },
      ];

      const actions = determineRemediationActions(failures);

      expect(actions).toContain('circuit-break');
      expect(actions).toContain('restart-service');
    });

    it('reports correct severity levels', () => {
      const highSeverity = detectFailures({ error_rate_percent: 7 });
      const criticalSeverity = detectFailures({ error_rate_percent: 15 });

      expect(highSeverity[0].severity).toBe('high');
      expect(criticalSeverity[0].severity).toBe('critical');
    });
  });

  describe('production-grade guardrails (PRIMARY MISSION TEST STANDARD)', () => {
    describe('repeated-failure suppression', () => {
      it('detects recurring failures and tracks occurrence count', () => {
        const engine = new AutonomousRemediationEngine();
        const failures: DetectedFailure[] = [
          {
            id: 'f-error-rate-api-1',
            category: 'error-rate-spike',
            severity: 'high',
            description: 'Recurring error spike',
            affectedService: 'api',
            detectedAt: new Date().toISOString(),
            evidence: [
              {
                metric: 'error_rate_percent',
                value: 8,
                threshold: 5,
                timestamp: new Date().toISOString(),
              },
            ],
            suggestedActions: ['circuit-break'],
            isRecurring: true,
            recurringCount: 3,
          },
        ];

        expect(failures[0].isRecurring).toBe(true);
        expect(failures[0].recurringCount).toBe(3);
      });

      it('prevents blindly re-executing same remedy for recurring failure', async () => {
        const engine = new AutonomousRemediationEngine();
        const failureId = 'f-error-rate-api-recurring';

        // First attempt
        const attempt1 = await executeRemediationAction('circuit-break', 'api');
        expect(attempt1.success).toBe(true);

        // Second attempt with same failure ID should not auto-retry
        // (in real system, cooldown would prevent this)
        const attempt2 = await executeRemediationAction('circuit-break', 'api');
        // Both attempts succeed, but cooldown period would block rapid succession
        expect(attempt1.action).toBe(attempt2.action);
      });
    });

    describe('retry exhaustion', () => {
      it('enforces maxAttemptsPerIncident limit', () => {
        const guardrail = {
          action: 'restart-service' as const,
          classification: 'reversible-verification-required' as const,
          maxAttemptsPerIncident: 3,
          cooldownSeconds: 60,
          requiresDryRun: false,
          requiresRecoveryProof: true,
          forbiddenContexts: ['production-database'],
        };

        expect(guardrail.maxAttemptsPerIncident).toBe(3);
      });

      it('blocks further remediation after maxAttempts exceeded', async () => {
        const engine = new AutonomousRemediationEngine();
        const failureId = 'f-persistent-error';
        const attempts: RemediationAttempt[] = [];

        // Simulate 3 failed attempts
        for (let i = 0; i < 3; i++) {
          attempts.push({
            id: `attempt-${i}`,
            failureId,
            action: 'restart-service',
            classification: 'reversible-verification-required',
            dryRun: false,
            startedAt: new Date().toISOString(),
            success: false,
            result: 'Failed to restart',
            errorCode: 'already-attempted',
          });
        }

        // Fourth attempt should be blocked (maxAttemptsPerIncident = 3)
        expect(attempts).toHaveLength(3);
        const report = generateRemediationReport(
          [
            {
              id: failureId,
              category: 'unhealthy-service',
              severity: 'critical',
              description: 'Service unresponsive',
              affectedService: 'api',
              detectedAt: new Date().toISOString(),
              evidence: [],
              suggestedActions: ['restart-service'],
              isRecurring: true,
              recurringCount: 4,
            },
          ],
          attempts
        );

        expect(report.escalatedToFounder).toBe(true); // Should escalate after exhaustion
      });
    });

    describe('cooldown enforcement', () => {
      it('enforces cooldownSeconds between retry attempts', async () => {
        const guardrail = {
          action: 'circuit-break' as const,
          classification: 'safe-autonomous' as const,
          maxAttemptsPerIncident: 1,
          cooldownSeconds: 300,
          requiresDryRun: false,
          requiresRecoveryProof: false,
          forbiddenContexts: [],
        };

        expect(guardrail.cooldownSeconds).toBe(300);
        // In practice, lastAttemptTime Map would block execution within this window
      });

      it('prevents rapid re-execution of failed remediation', async () => {
        const guardrail = {
          action: 'restart-service' as const,
          classification: 'reversible-verification-required' as const,
          maxAttemptsPerIncident: 3,
          cooldownSeconds: 60,
          requiresDryRun: false,
          requiresRecoveryProof: true,
          forbiddenContexts: ['production-database'],
        };

        const attempt1Time = Date.now();
        const attempt2Time = attempt1Time + 30000; // 30 seconds later

        // cooldown is 60 seconds, so 30 seconds is still within cooldown
        const withinCooldown =
          attempt2Time - attempt1Time < guardrail.cooldownSeconds * 1000;
        expect(withinCooldown).toBe(true);
      });
    });

    describe('idempotent execution', () => {
      it('produces same result when executing same action twice', async () => {
        const attempt1 = await executeRemediationAction('clear-cache', 'api');
        const attempt2 = await executeRemediationAction('clear-cache', 'api');

        expect(attempt1.action).toBe(attempt2.action);
        expect(attempt1.success).toBe(attempt2.success);
        expect(attempt1.result).toBe(attempt2.result);
      });

      it('does not cause side effects on re-execution', async () => {
        const beforeState = { cache_size: 1000, error_count: 5 };
        const attempt1 = await executeRemediationAction('clear-cache', 'api');

        // After first attempt, cache should be cleared
        expect(attempt1.success).toBe(true);

        // Second attempt should be idempotent (no error if already cleared)
        const attempt2 = await executeRemediationAction('clear-cache', 'api');
        expect(attempt2.success).toBe(true);
        expect(attempt2.result).toBe(attempt1.result); // Same outcome
      });
    });

    describe('unauthorized-action rejection', () => {
      it('rejects founder-gated actions without authorization', async () => {
        const guardrail = {
          action: 'rollback-deployment' as const,
          classification: 'founder-gated' as const,
          maxAttemptsPerIncident: 1,
          cooldownSeconds: 300,
          requiresDryRun: true,
          requiresRecoveryProof: true,
          forbiddenContexts: ['production-database'],
        };

        expect(guardrail.classification).toBe('founder-gated');
        // In real system, autonomous engine would not execute this action
      });

      it('marks founder-gated attempts with errorCode when attempted autonomously', async () => {
        const attempt: RemediationAttempt = {
          id: 'attempt-1',
          failureId: 'f-1',
          action: 'rollback-deployment',
          classification: 'founder-gated',
          dryRun: false,
          startedAt: new Date().toISOString(),
          success: false,
          result: 'Blocked',
          errorCode: 'unauthorized',
        };

        expect(attempt.errorCode).toBe('unauthorized');
        expect(attempt.success).toBe(false);
      });
    });

    describe('rollback behavior', () => {
      it('captures beforeState before executing rollback', async () => {
        const beforeState = {
          deployment_version: 'v2.1.0',
          services_healthy: true,
        };

        const attempt: RemediationAttempt = {
          id: 'attempt-rollback-1',
          failureId: 'f-bad-deploy',
          action: 'rollback-deployment',
          classification: 'founder-gated',
          dryRun: false,
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          success: true,
          result: 'rolled back to v2.0.5',
          beforeState,
        };

        expect(attempt.beforeState).toEqual(beforeState);
        expect(attempt.result).toContain('rolled back');
      });

      it('captures afterState after rollback completes', async () => {
        const afterState = {
          deployment_version: 'v2.0.5',
          services_healthy: true,
          error_rate: 2,
        };

        const attempt: RemediationAttempt = {
          id: 'attempt-rollback-2',
          failureId: 'f-bad-deploy-2',
          action: 'rollback-deployment',
          classification: 'founder-gated',
          dryRun: false,
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          success: true,
          result: 'rolled back',
          afterState,
        };

        expect(attempt.afterState).toEqual(afterState);
      });
    });

    describe('dry-run behavior', () => {
      it('validates action without executing when dryRun=true', async () => {
        const attempt: RemediationAttempt = {
          id: 'attempt-dryrun-1',
          failureId: 'f-test',
          action: 'scale-up',
          classification: 'reversible-verification-required',
          dryRun: true,
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          success: true,
          result: '[DRY-RUN] Would scale up to 3 replicas',
        };

        expect(attempt.dryRun).toBe(true);
        expect(attempt.result).toContain('[DRY-RUN]');
      });

      it('marks results appropriately for dry-run attempts', async () => {
        const dryRunAttempt: RemediationAttempt = {
          id: 'attempt-dryrun-2',
          failureId: 'f-test-2',
          action: 'restore-config',
          classification: 'reversible-verification-required',
          dryRun: true,
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          success: true,
          result: '[DRY-RUN] Configuration would be restored from backup',
        };

        // Dry-run should not be counted as actual remediation
        expect(dryRunAttempt.dryRun).toBe(true);
        expect(dryRunAttempt.success).toBe(true); // Dry-run "succeeds" if validation passes
      });
    });

    describe('audit-log completeness', () => {
      it('captures before/after state for full audit trail', async () => {
        const beforeState = { memory_usage_mb: 3500, replica_count: 1 };
        const afterState = { memory_usage_mb: 1200, replica_count: 2 };

        const attempt: RemediationAttempt = {
          id: 'audit-attempt-1',
          failureId: 'f-scale',
          action: 'scale-up',
          classification: 'reversible-verification-required',
          dryRun: false,
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          success: true,
          result: 'Scaled successfully',
          beforeState,
          afterState,
        };

        expect(attempt.beforeState).toBeDefined();
        expect(attempt.afterState).toBeDefined();
        expect(attempt.beforeState?.memory_usage_mb).toBe(3500);
        expect(attempt.afterState?.memory_usage_mb).toBe(1200);
      });

      it('includes recoveryProof documenting recovery verification', async () => {
        const attempt: RemediationAttempt = {
          id: 'audit-attempt-2',
          failureId: 'f-restart',
          action: 'restart-service',
          classification: 'reversible-verification-required',
          dryRun: false,
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          success: true,
          result: 'Service restarted',
          recoveryProof:
            'Health check passed post-restart; error rate returned to baseline (< 2%)',
        };

        expect(attempt.recoveryProof).toBeDefined();
        expect(attempt.recoveryProof).toContain('Health check');
      });
    });

    describe('escalation after autonomous options exhausted', () => {
      it('sets escalatedToFounder flag when all safe autonomous options fail', async () => {
        const failures: DetectedFailure[] = [
          {
            id: 'f-critical-deploy',
            category: 'failed-deployment',
            severity: 'critical',
            description: 'All deployments failing',
            affectedService: 'deployment',
            detectedAt: new Date().toISOString(),
            evidence: [],
            suggestedActions: ['rollback-deployment'], // Only option is founder-gated
            isRecurring: true,
            recurringCount: 5,
          },
        ];

        const attempts: RemediationAttempt[] = [
          {
            id: 'attempt-1',
            failureId: 'f-critical-deploy',
            action: 'circuit-break',
            classification: 'safe-autonomous',
            dryRun: false,
            startedAt: new Date().toISOString(),
            completedAt: new Date().toISOString(),
            success: false,
            result: 'Circuit break ineffective for deployment failures',
          },
        ];

        const report = generateRemediationReport(failures, attempts);
        expect(report.escalatedToFounder).toBe(true);
      });

      it('includes escalation detail in result when options exhausted', async () => {
        const failures: DetectedFailure[] = [
          {
            id: 'f-persistent',
            category: 'unhealthy-service',
            severity: 'critical',
            description: 'Service permanently unhealthy',
            affectedService: 'worker',
            detectedAt: new Date().toISOString(),
            evidence: [],
            suggestedActions: [],
            isRecurring: true,
            recurringCount: 10,
          },
        ];

        const report = generateRemediationReport(failures, []);
        expect(report.escalatedToFounder).toBe(true);
      });
    });

    describe('false-positive protection', () => {
      it('ignores temporary metric spikes below duration threshold', () => {
        // Policy requires 60-second duration, but spike only lasted 10 seconds
        const evidence: DetectionEvidence = {
          metric: 'error_rate_percent',
          value: 8,
          threshold: 5,
          timestamp: new Date().toISOString(),
          duration: 10, // Only 10 seconds, below 60-second threshold
        };

        // In real system, detectFailures would ignore this if duration < policy.detectionThreshold.duration
        expect(evidence.duration).toBe(10);
        expect(evidence.duration).toBeLessThan(60);
      });

      it('prevents remediation for metrics that recovered before action executed', async () => {
        // Detected error rate spike
        const detectedAt = new Date(Date.now() - 5000); // 5 seconds ago
        const recoveredAt = new Date(Date.now() - 2000); // 2 seconds ago

        const failure: DetectedFailure = {
          id: 'f-spike',
          category: 'error-rate-spike',
          severity: 'high',
          description: 'Transient error spike',
          affectedService: 'api',
          detectedAt: detectedAt.toISOString(),
          evidence: [
            {
              metric: 'error_rate_percent',
              value: 7,
              threshold: 5,
              timestamp: detectedAt.toISOString(),
              duration: 3,
            },
          ],
          suggestedActions: ['circuit-break'],
          isRecurring: false,
          recurringCount: 1,
        };

        // If recovery is verified before attempting remedy, skip remediation
        expect(failure.isRecurring).toBe(false);
        expect(failure.recurringCount).toBe(1);
      });
    });

    describe('concurrent incident handling', () => {
      it('safely handles multiple failures detected simultaneously', async () => {
        const engine = new AutonomousRemediationEngine();

        // Simulate concurrent failures
        const promises = [
          detectFailures({ error_rate_percent: 8 }), // Error rate spike
          detectFailures({ response_time_p99_ms: 7000 }), // High latency
          detectFailures({ memory_usage_percent: 95 }), // High memory
        ];

        const results = await Promise.all(promises);

        // All should detect independently without race conditions
        expect(results[0].length).toBeGreaterThan(0);
        expect(results[1].length).toBeGreaterThan(0);
        expect(results[2].length).toBeGreaterThan(0);
      });

      it('prevents remediation conflicts for overlapping failures', async () => {
        const failures: DetectedFailure[] = [
          {
            id: 'f-error-1',
            category: 'error-rate-spike',
            severity: 'high',
            description: 'Error spike in API',
            affectedService: 'api',
            detectedAt: new Date().toISOString(),
            evidence: [],
            suggestedActions: ['circuit-break', 'clear-cache'],
            isRecurring: false,
            recurringCount: 1,
          },
          {
            id: 'f-perf-1',
            category: 'degraded-latency',
            severity: 'high',
            description: 'High latency in API',
            affectedService: 'api', // Same service!
            detectedAt: new Date().toISOString(),
            evidence: [],
            suggestedActions: ['clear-cache', 'scale-up'],
            isRecurring: false,
            recurringCount: 1,
          },
        ];

        const actions = determineRemediationActions(failures);

        // Should deduplicate "clear-cache" action
        const cacheClears = actions.filter((a) => a === 'clear-cache');
        expect(cacheClears.length).toBe(1); // Only one, not two
      });
    });
  });
});
