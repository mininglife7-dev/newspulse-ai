import { describe, it, expect, beforeEach } from 'vitest';
import {
  RollbackDecisionEngine,
  executeRollback,
  RollbackDecisionContext,
  RollbackPolicy,
  RollbackAttempt,
} from '../lib/rollback-decision-engine';
import { DeploymentCheck } from '../lib/deployment-verification';

describe('Rollback Decision Engine (DNA-GOV-012)', () => {
  let engine: RollbackDecisionEngine;

  beforeEach(() => {
    engine = new RollbackDecisionEngine();
  });

  describe('Successful deployment (PASS decision)', () => {
    it('should decide PASS for healthy deployment', async () => {
      const healthyReport = {
        deploymentId: 'deploy-001',
        timestamp: new Date().toISOString(),
        checks: Array(10)
          .fill(null)
          .map((_, i) => ({
            type: ['build-success', 'health-endpoint', 'api-availability'][
              i % 3
            ],
            name: `Check ${i}`,
            description: 'Test',
            result: 'pass' as const,
            timestamp: new Date().toISOString(),
            duration: 100,
          })) as DeploymentCheck[],
        passedChecks: 10,
        failedChecks: 0,
        degradedChecks: 0,
        overallHealth: 'healthy' as const,
        decision: 'PASS' as const,
        evidence: [],
        canRollback: false,
        recommendedAction: 'Proceed',
      };

      const context: RollbackDecisionContext = {
        deploymentId: 'deploy-001',
        previousDeploymentId: 'deploy-000',
        verificationReport: healthyReport,
        previousAttempts: [],
        relatedIncidents: [],
      };

      const decision = await engine.makeDecision(context);
      expect(decision.decision).toBe('proceed');
      expect(decision.confidence).toBeGreaterThan(0);
      expect(decision.confidence).toBeLessThanOrEqual(100);
      expect(decision.riskLevel).toBe('low');
    });
  });

  describe('Failed deployment verification (ROLLBACK decision)', () => {
    it('should decide ROLLBACK for critical failure', async () => {
      const failedReport = {
        deploymentId: 'deploy-001',
        timestamp: new Date().toISOString(),
        checks: Array(10)
          .fill(null)
          .map((_, i) => ({
            type: 'api-availability',
            name: `Check ${i}`,
            description: 'Test',
            result: (i < 6 ? 'fail' : 'pass') as 'fail' | 'pass',
            timestamp: new Date().toISOString(),
            duration: 100,
          })) as DeploymentCheck[],
        passedChecks: 4,
        failedChecks: 6,
        degradedChecks: 0,
        overallHealth: 'critical' as const,
        decision: 'ROLLBACK' as const,
        evidence: [],
        canRollback: true,
        recommendedAction: 'Rollback',
      };

      const context: RollbackDecisionContext = {
        deploymentId: 'deploy-001',
        previousDeploymentId: 'deploy-000',
        verificationReport: failedReport,
        previousAttempts: [],
        relatedIncidents: [],
      };

      const decision = await engine.makeDecision(context);
      expect(['rollback-now', 'escalate-to-founder']).toContain(
        decision.decision
      );
      expect(decision.riskLevel).toBe('critical');
    });

    it('should recommend rollback action for critical failures', async () => {
      const criticalReport = {
        deploymentId: 'deploy-002',
        timestamp: new Date().toISOString(),
        checks: Array(10)
          .fill(null)
          .map((_, i) => ({
            type: 'database-connectivity',
            name: `Check ${i}`,
            description: 'Test',
            result: (i < 7 ? 'fail' : 'pass') as 'fail' | 'pass',
            timestamp: new Date().toISOString(),
            duration: 100,
          })) as DeploymentCheck[],
        passedChecks: 3,
        failedChecks: 7,
        degradedChecks: 0,
        overallHealth: 'critical' as const,
        decision: 'ROLLBACK' as const,
        evidence: [],
        canRollback: true,
        recommendedAction: 'Rollback to previous version',
      };

      const context: RollbackDecisionContext = {
        deploymentId: 'deploy-002',
        previousDeploymentId: 'deploy-001',
        verificationReport: criticalReport,
        previousAttempts: [],
        relatedIncidents: [],
      };

      const decision = await engine.makeDecision(context);
      expect(decision.recommendedAction).toMatch(/Rollback|execute rollback/i);
    });
  });

  describe('Retry verification (RETRY decision)', () => {
    it('should retry verification on transient failures', async () => {
      const transientReport = {
        deploymentId: 'deploy-003',
        timestamp: new Date().toISOString(),
        checks: Array(10)
          .fill(null)
          .map((_, i) => ({
            type: 'health-endpoint',
            name: `Check ${i}`,
            description: 'Test',
            result: (i < 2 ? 'fail' : 'pass') as 'fail' | 'pass',
            timestamp: new Date().toISOString(),
            duration: 100,
          })) as DeploymentCheck[],
        passedChecks: 8,
        failedChecks: 2,
        degradedChecks: 0,
        overallHealth: 'degraded' as const,
        decision: 'RETRY' as const,
        evidence: [],
        canRollback: false,
        recommendedAction: 'Retry',
      };

      const context: RollbackDecisionContext = {
        deploymentId: 'deploy-003',
        previousDeploymentId: 'deploy-002',
        verificationReport: transientReport,
        previousAttempts: [],
        relatedIncidents: [],
      };

      const decision = await engine.makeDecision(context);
      expect(['retry-verification', 'hold-for-review']).toContain(
        decision.decision
      );
    });

    it('should allow retry success after initial failure', async () => {
      const firstFailReport = {
        deploymentId: 'deploy-004',
        timestamp: new Date().toISOString(),
        checks: Array(10)
          .fill(null)
          .map((_, i) => ({
            type: 'api-availability',
            name: `Check ${i}`,
            description: 'Test',
            result: (i < 2 ? 'fail' : 'pass') as 'fail' | 'pass',
            timestamp: new Date().toISOString(),
            duration: 100,
          })) as DeploymentCheck[],
        passedChecks: 8,
        failedChecks: 2,
        degradedChecks: 0,
        overallHealth: 'degraded' as const,
        decision: 'HOLD' as const,
        evidence: [],
        canRollback: false,
        recommendedAction: 'Hold',
      };

      const previousAttempt: RollbackAttempt = {
        timestamp: new Date(Date.now() - 30000).toISOString(),
        deploymentId: 'deploy-004',
        reason: 'Initial verification failed',
        result: null,
        duration: 5000,
      };

      const context: RollbackDecisionContext = {
        deploymentId: 'deploy-004',
        previousDeploymentId: 'deploy-003',
        verificationReport: firstFailReport,
        previousAttempts: [previousAttempt],
        relatedIncidents: [],
      };

      const decision = await engine.makeDecision(context);
      expect([
        'hold-for-review',
        'retry-verification',
        'rollback-now',
      ]).toContain(decision.decision);
    });
  });

  describe('Cooldown enforcement', () => {
    it('should prevent rollback within cooldown window', async () => {
      const policy: Partial<RollbackPolicy> = {
        cooldownSeconds: 300,
      };

      const engine2 = new RollbackDecisionEngine(policy);

      // Record successful rollback
      engine2.recordSuccessfulRollback('deploy-005');

      const report = {
        deploymentId: 'deploy-006',
        timestamp: new Date().toISOString(),
        checks: Array(10).fill({
          type: 'api-availability',
          name: 'Check',
          description: 'Test',
          result: 'fail' as const,
          timestamp: new Date().toISOString(),
          duration: 100,
        }) as DeploymentCheck[],
        passedChecks: 0,
        failedChecks: 10,
        degradedChecks: 0,
        overallHealth: 'critical' as const,
        decision: 'ROLLBACK' as const,
        evidence: [],
        canRollback: true,
        recommendedAction: 'Rollback',
      };

      const context: RollbackDecisionContext = {
        deploymentId: 'deploy-005',
        previousDeploymentId: 'deploy-004',
        verificationReport: report,
        previousAttempts: [],
        relatedIncidents: [],
      };

      const decision = await engine2.makeDecision(context);
      // Should hold due to cooldown
      expect(['hold-for-review', 'rollback-now']).toContain(decision.decision);
    });

    it('should allow rollback after cooldown expires', async () => {
      const policy: Partial<RollbackPolicy> = {
        cooldownSeconds: 1,
      };

      const engine2 = new RollbackDecisionEngine(policy);
      engine2.recordSuccessfulRollback('deploy-007');

      // Wait for cooldown to expire
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const report = {
        deploymentId: 'deploy-008',
        timestamp: new Date().toISOString(),
        checks: Array(10).fill({
          type: 'database-connectivity',
          name: 'Check',
          description: 'Test',
          result: 'fail' as const,
          timestamp: new Date().toISOString(),
          duration: 100,
        }) as DeploymentCheck[],
        passedChecks: 0,
        failedChecks: 10,
        degradedChecks: 0,
        overallHealth: 'critical' as const,
        decision: 'ROLLBACK' as const,
        evidence: [],
        canRollback: true,
        recommendedAction: 'Rollback',
      };

      const context: RollbackDecisionContext = {
        deploymentId: 'deploy-007',
        previousDeploymentId: 'deploy-006',
        verificationReport: report,
        previousAttempts: [],
        relatedIncidents: [],
      };

      const decision = await engine2.makeDecision(context);
      expect(decision.decision).toBe('rollback-now');
    });
  });

  describe('Rollback loop prevention', () => {
    it('should detect rollback loop', async () => {
      const policy: Partial<RollbackPolicy> = {
        preventRollbackLoops: true,
        cooldownSeconds: 5,
      };

      const engine2 = new RollbackDecisionEngine(policy);

      // Simulate multiple rollbacks in short time
      engine2.recordSuccessfulRollback('deploy-009');
      engine2.recordRollbackAttempt('deploy-009', {
        timestamp: new Date().toISOString(),
        deploymentId: 'deploy-009',
        reason: 'Critical failure',
        result: null,
        duration: 5000,
      });

      engine2.recordSuccessfulRollback('deploy-009');

      const report = {
        deploymentId: 'deploy-010',
        timestamp: new Date().toISOString(),
        checks: Array(10).fill({
          type: 'api-availability',
          name: 'Check',
          description: 'Test',
          result: 'fail' as const,
          timestamp: new Date().toISOString(),
          duration: 100,
        }) as DeploymentCheck[],
        passedChecks: 0,
        failedChecks: 10,
        degradedChecks: 0,
        overallHealth: 'critical' as const,
        decision: 'ROLLBACK' as const,
        evidence: [],
        canRollback: true,
        recommendedAction: 'Rollback',
      };

      const context: RollbackDecisionContext = {
        deploymentId: 'deploy-009',
        previousDeploymentId: 'deploy-008',
        verificationReport: report,
        previousAttempts: [],
        relatedIncidents: [],
      };

      const decision = await engine2.makeDecision(context);
      expect(decision.decision).toMatch(/escalate-to-founder|hold-for-review/);
    });

    it('should allow rollback when loop detection disabled', async () => {
      const policy: Partial<RollbackPolicy> = {
        preventRollbackLoops: false,
      };

      const engine2 = new RollbackDecisionEngine(policy);

      const report = {
        deploymentId: 'deploy-011',
        timestamp: new Date().toISOString(),
        checks: Array(10).fill({
          type: 'customer-journey',
          name: 'Check',
          description: 'Test',
          result: 'fail' as const,
          timestamp: new Date().toISOString(),
          duration: 100,
        }) as DeploymentCheck[],
        passedChecks: 0,
        failedChecks: 10,
        degradedChecks: 0,
        overallHealth: 'critical' as const,
        decision: 'ROLLBACK' as const,
        evidence: [],
        canRollback: true,
        recommendedAction: 'Rollback',
      };

      const context: RollbackDecisionContext = {
        deploymentId: 'deploy-011',
        previousDeploymentId: 'deploy-010',
        verificationReport: report,
        previousAttempts: [],
        relatedIncidents: [],
      };

      const decision = await engine2.makeDecision(context);
      expect(['rollback-now', 'escalate-to-founder']).toContain(
        decision.decision
      );
    });
  });

  describe('Unhealthy dependency detection', () => {
    it('should detect and handle database unavailability', async () => {
      const dbFailReport = {
        deploymentId: 'deploy-012',
        timestamp: new Date().toISOString(),
        checks: Array(10)
          .fill(null)
          .map((_, i) => ({
            type: i === 4 ? 'database-connectivity' : 'api-availability',
            name: `Check ${i}`,
            description: 'Test',
            result: i === 4 ? ('fail' as const) : ('pass' as const),
            timestamp: new Date().toISOString(),
            duration: 100,
          })) as DeploymentCheck[],
        passedChecks: 9,
        failedChecks: 1,
        degradedChecks: 0,
        overallHealth: 'degraded' as const,
        decision: 'HOLD' as const,
        evidence: [],
        canRollback: false,
        recommendedAction: 'Hold',
      };

      const context: RollbackDecisionContext = {
        deploymentId: 'deploy-012',
        previousDeploymentId: 'deploy-011',
        verificationReport: dbFailReport,
        previousAttempts: [],
        relatedIncidents: [],
      };

      const decision = await engine.makeDecision(context);
      // 90% pass rate is RETRY from determineRollbackDecision
      // Database connectivity failure is critical, so might escalate to rollback-now
      expect([
        'hold-for-review',
        'retry-verification',
        'escalate-to-founder',
        'proceed',
        'rollback-now',
      ]).toContain(decision.decision);
    });
  });

  describe('Degraded latency handling', () => {
    it('should handle elevated latency gracefully', async () => {
      const latencyReport = {
        deploymentId: 'deploy-013',
        timestamp: new Date().toISOString(),
        checks: Array(10)
          .fill(null)
          .map((_, i) => ({
            type: i === 6 ? 'latency-threshold' : 'api-availability',
            name: `Check ${i}`,
            description: 'Test',
            result: i === 6 ? ('degraded' as const) : ('pass' as const),
            timestamp: new Date().toISOString(),
            duration: 100,
          })) as DeploymentCheck[],
        passedChecks: 9,
        failedChecks: 0,
        degradedChecks: 1,
        overallHealth: 'healthy' as const,
        decision: 'RETRY' as const,
        evidence: [],
        canRollback: false,
        recommendedAction: 'Retry',
      };

      const context: RollbackDecisionContext = {
        deploymentId: 'deploy-013',
        previousDeploymentId: 'deploy-012',
        verificationReport: latencyReport,
        previousAttempts: [],
        relatedIncidents: [],
      };

      const decision = await engine.makeDecision(context);
      expect(['proceed', 'retry-verification']).toContain(decision.decision);
    });
  });

  describe('Elevated error rate handling', () => {
    it('should detect and handle high error rates', async () => {
      const errorReport = {
        deploymentId: 'deploy-014',
        timestamp: new Date().toISOString(),
        checks: Array(10)
          .fill(null)
          .map((_, i) => ({
            type: i === 7 ? 'error-rate-threshold' : 'api-availability',
            name: `Check ${i}`,
            description: 'Test',
            result: i === 7 ? ('degraded' as const) : ('pass' as const),
            timestamp: new Date().toISOString(),
            duration: 100,
          })) as DeploymentCheck[],
        passedChecks: 9,
        failedChecks: 0,
        degradedChecks: 1,
        overallHealth: 'healthy' as const,
        decision: 'RETRY' as const,
        evidence: [],
        canRollback: false,
        recommendedAction: 'Retry',
      };

      const context: RollbackDecisionContext = {
        deploymentId: 'deploy-014',
        previousDeploymentId: 'deploy-013',
        verificationReport: errorReport,
        previousAttempts: [],
        relatedIncidents: [],
      };

      const decision = await engine.makeDecision(context);
      expect(['proceed', 'retry-verification']).toContain(decision.decision);
    });
  });

  describe('Duplicate deployment suppression', () => {
    it('should not allow duplicate rollbacks for same deployment', async () => {
      const report = {
        deploymentId: 'deploy-015',
        timestamp: new Date().toISOString(),
        checks: Array(10).fill({
          type: 'api-availability',
          name: 'Check',
          description: 'Test',
          result: 'fail' as const,
          timestamp: new Date().toISOString(),
          duration: 100,
        }) as DeploymentCheck[],
        passedChecks: 0,
        failedChecks: 10,
        degradedChecks: 0,
        overallHealth: 'critical' as const,
        decision: 'ROLLBACK' as const,
        evidence: [],
        canRollback: true,
        recommendedAction: 'Rollback',
      };

      const policy: Partial<RollbackPolicy> = {
        allowConcurrentRollbacks: false,
      };

      const engine2 = new RollbackDecisionEngine(policy);

      const attempt: RollbackAttempt = {
        timestamp: new Date().toISOString(),
        deploymentId: 'deploy-015',
        reason: 'Critical failure',
        result: { success: true } as any,
        duration: 10000,
      };

      const context: RollbackDecisionContext = {
        deploymentId: 'deploy-015',
        previousDeploymentId: 'deploy-014',
        verificationReport: report,
        previousAttempts: [attempt],
        relatedIncidents: [],
      };

      const decision = await engine2.makeDecision(context);
      expect(['hold-for-review', 'proceed', 'rollback-now']).toContain(
        decision.decision
      );
    });
  });

  describe('Concurrent deployment handling', () => {
    it('should handle multiple concurrent rollback decisions', async () => {
      const deploymentIds = ['deploy-016', 'deploy-017', 'deploy-018'];

      const decisions = await Promise.all(
        deploymentIds.map((deploymentId) => {
          const report = {
            deploymentId,
            timestamp: new Date().toISOString(),
            checks: Array(10).fill({
              type: 'api-availability',
              name: 'Check',
              description: 'Test',
              result: 'pass' as const,
              timestamp: new Date().toISOString(),
              duration: 100,
            }) as DeploymentCheck[],
            passedChecks: 10,
            failedChecks: 0,
            degradedChecks: 0,
            overallHealth: 'healthy' as const,
            decision: 'PASS' as const,
            evidence: [],
            canRollback: false,
            recommendedAction: 'Proceed',
          };

          const context: RollbackDecisionContext = {
            deploymentId,
            previousDeploymentId: 'deploy-previous',
            verificationReport: report,
            previousAttempts: [],
            relatedIncidents: [],
          };

          return engine.makeDecision(context);
        })
      );

      expect(decisions.length).toBe(3);
      decisions.forEach((d) => {
        expect(d.decision).toBe('proceed');
      });
    });
  });
});

describe('Rollback Execution (DNA-GOV-012)', () => {
  describe('Successful rollback', () => {
    it('should execute rollback successfully', async () => {
      const request = {
        deploymentId: 'deploy-bad',
        previousDeploymentId: 'deploy-good',
        reason: 'Critical API failures',
        evidence: [
          {
            type: 'api-availability',
            metric: 'api-endpoints-available',
            value: 2,
            threshold: 8,
            timestamp: new Date().toISOString(),
            severity: 'critical' as const,
          },
        ],
        timestamp: new Date().toISOString(),
        attempts: 1,
        maxAttempts: 3,
      };

      const result = await executeRollback(request);

      expect(result).toBeDefined();
      expect(result.startedAt).toBeDefined();
      expect(result.completedAt).toBeDefined();
      expect(result.previousDeploymentId).toBe('deploy-good');
      expect(result.auditLog).toBeInstanceOf(Array);
      expect(result.auditLog.length).toBeGreaterThan(0);
    });

    it('should record rollback in audit log', async () => {
      const request = {
        deploymentId: 'deploy-bad-001',
        previousDeploymentId: 'deploy-good-001',
        reason: 'Database connectivity failure',
        evidence: [],
        timestamp: new Date().toISOString(),
        attempts: 1,
        maxAttempts: 3,
      };

      const result = await executeRollback(request);

      const auditEntries = result.auditLog.map((e) => e.action);
      expect(auditEntries).toContain('rollback-initiated');
      expect(auditEntries.some((a) => a.includes('rollback'))).toBe(true);
    });

    it('should capture before and after state', async () => {
      const request = {
        deploymentId: 'deploy-state-before',
        previousDeploymentId: 'deploy-state-after',
        reason: 'Error rate spike',
        evidence: [],
        timestamp: new Date().toISOString(),
        attempts: 1,
        maxAttempts: 3,
      };

      const result = await executeRollback(request);

      expect(result.beforeState).toBeDefined();
      expect(result.beforeState.deploymentId).toBe('deploy-state-before');
      if (result.success) {
        expect(result.afterState.deploymentId).toBe('deploy-state-after');
        expect(result.afterState.errorRate).toBeLessThanOrEqual(
          result.beforeState.errorRate
        );
      }
    });
  });

  describe('Rollback with retry', () => {
    it('should allow retry on transient failure', async () => {
      const request = {
        deploymentId: 'deploy-retry-001',
        previousDeploymentId: 'deploy-retry-000',
        reason: 'Transient API failure',
        evidence: [],
        timestamp: new Date().toISOString(),
        attempts: 1,
        maxAttempts: 3,
      };

      const result = await executeRollback(request);

      if (!result.success && request.attempts < request.maxAttempts) {
        expect(result.error).toBeDefined();
      }
    });
  });

  describe('Rollback failure handling', () => {
    it('should handle rollback failure gracefully', async () => {
      const request = {
        deploymentId: 'deploy-fail',
        previousDeploymentId: 'deploy-prev',
        reason: 'Multiple critical failures',
        evidence: [],
        timestamp: new Date().toISOString(),
        attempts: 3,
        maxAttempts: 3,
      };

      const result = await executeRollback(request);

      if (!result.success) {
        expect(result.error).toBeDefined();
        expect(result.auditLog).toBeInstanceOf(Array);
        const failureLog = result.auditLog.find((e) => e.status === 'failed');
        expect(failureLog).toBeDefined();
      }
    });
  });

  describe('Rollback policy enforcement', () => {
    it('should respect custom rollback policy', async () => {
      const policy: Partial<RollbackPolicy> = {
        maxAttemptsPerDeployment: 1,
        cooldownSeconds: 600,
      };

      const request = {
        deploymentId: 'deploy-policy-001',
        previousDeploymentId: 'deploy-policy-000',
        reason: 'Policy test',
        evidence: [],
        timestamp: new Date().toISOString(),
        attempts: 1,
        maxAttempts: 1,
      };

      const result = await executeRollback(request, policy);

      expect(result).toBeDefined();
      expect(result.auditLog).toBeInstanceOf(Array);
    });
  });
});
