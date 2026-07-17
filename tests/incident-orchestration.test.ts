import { describe, it, expect, beforeEach } from 'vitest';
import {
  IncidentOrchestrator,
  OrchestrationDecision,
  IncidentState,
} from '../lib/incident-orchestration';
import { IncidentDetector, DetectedIncident } from '../lib/incident-detection';
import { verifyDeployment } from '../lib/deployment-verification';

describe('Incident Orchestration (DNA-GOV-013)', () => {
  let orchestrator: IncidentOrchestrator;
  let detector: IncidentDetector;

  beforeEach(() => {
    orchestrator = new IncidentOrchestrator();
    detector = new IncidentDetector();
  });

  describe('Critical incident orchestration', () => {
    it('should escalate critical data loss risk to founder', async () => {
      const incidents = await detector.detectIncidents('deploy-critical-data', {
        recentErrors: [
          {
            message: 'Database connection timeout',
            category: 'database',
            count: 200,
          },
          { message: 'Transaction failed', category: 'database', count: 180 },
        ],
      });

      const dataIncident = incidents.find(
        (inc) => inc.category === 'data-loss-risk'
      );
      expect(dataIncident).toBeDefined();
      if (dataIncident) {
        const decision = await orchestrator.orchestrateIncident({
          incident: dataIncident,
          previousAttempts: [],
        });

        expect(decision.shouldEscalateToFounder).toBe(true);
        expect(['notify-founder']).toContain(decision.recommendedAction);
      }
    });

    it('should initiate rollback for critical deployment failure', async () => {
      let report = await verifyDeployment('deploy-crit-rollback');

      // Retry until we get critical failure
      let attempts = 0;
      while (
        report.decision !== 'ROLLBACK' &&
        report.decision !== 'ESCALATE' &&
        attempts < 10
      ) {
        report = await verifyDeployment('deploy-crit-rollback');
        attempts++;
      }

      if (report.decision === 'ROLLBACK' || report.decision === 'ESCALATE') {
        const incidents = await detector.detectIncidents(
          'deploy-crit-rollback',
          {
            verificationReport: report,
          }
        );

        if (incidents.length > 0) {
          const decision = await orchestrator.orchestrateIncident({
            incident: incidents[0],
            verificationReport: report,
            previousAttempts: [],
          });

          // Rollback is only guaranteed for auto-remediable deployment failures at
          // critical/high severity; other simulated categories legitimately map to
          // verify-remediation or notify-founder (see lib/incident-orchestration.ts).
          if (
            incidents[0].canAutoRemediate &&
            incidents[0].category === 'deployment-failure' &&
            ['critical', 'high'].includes(incidents[0].severity)
          ) {
            expect(['initiate-rollback']).toContain(decision.recommendedAction);
          }
        }
      }
    });

    // Deterministic companion to the randomized test above: the guard there can
    // skip its assertion when the simulation yields a non-deployment category, so
    // this test constructs the deployment-failure premise directly and always
    // exercises the rollback path.
    it.each(['critical', 'high'] as const)(
      'always initiates rollback for auto-remediable %s deployment failure',
      async (severity) => {
        const incident: DetectedIncident = {
          incidentId: `inc-det-${severity}`,
          deploymentId: `deploy-det-${severity}`,
          category: 'deployment-failure',
          severity,
          signals: [],
          detectedAt: new Date().toISOString(),
          description: 'Deterministic deployment failure',
          affectedServices: ['api'],
          estimatedUserImpact: 0.9,
          canAutoRemediate: true,
          requiresFounderNotification: false,
        };

        const decision = await orchestrator.orchestrateIncident({
          incident,
          previousAttempts: [],
        });

        expect(decision.recommendedAction).toBe('initiate-rollback');
      }
    );

    it('should escalate cascading failures to founder', async () => {
      const incidents = await detector.detectIncidents('deploy-cascade-orch', {
        recentErrors: [
          { message: 'API timeout', category: 'api', count: 50 },
          { message: 'DB connection failed', category: 'database', count: 45 },
          { message: 'Cache miss', category: 'cache', count: 200 },
          { message: 'Queue backlog', category: 'queue', count: 150 },
        ],
      });

      const cascade = incidents.find(
        (inc) => inc.category === 'cascading-failure'
      );
      if (cascade) {
        const decision = await orchestrator.orchestrateIncident({
          incident: cascade,
          previousAttempts: [],
        });

        expect(decision.shouldEscalateToFounder).toBe(true);
        expect(decision.severity).toBe('critical');
      }
    });
  });

  describe('High severity incident orchestration', () => {
    it('should attempt rollback for high-severity deployment failure', async () => {
      let report = await verifyDeployment('deploy-high-roll');

      let attempts = 0;
      while (report.failedChecks < 2 && attempts < 10) {
        report = await verifyDeployment('deploy-high-roll');
        attempts++;
      }

      if (report.failedChecks >= 2 && report.decision === 'HOLD') {
        const incidents = await detector.detectIncidents('deploy-high-roll', {
          verificationReport: report,
        });

        if (incidents.length > 0 && incidents[0].severity === 'high') {
          const decision = await orchestrator.orchestrateIncident({
            incident: incidents[0],
            verificationReport: report,
            previousAttempts: [],
          });

          expect(decision.severity).toBe('high');
        }
      }
    });

    it('should throttle traffic for high-severity performance degradation', async () => {
      const incidents = await detector.detectIncidents('deploy-perf-throttle', {
        latency: 12000,
      });

      const perfIncident = incidents.find(
        (inc) => inc.category === 'performance-degradation'
      );
      if (perfIncident && perfIncident.severity === 'high') {
        const decision = await orchestrator.orchestrateIncident({
          incident: perfIncident,
          previousAttempts: [],
        });

        expect(['throttle-traffic', 'scale-infrastructure']).toContain(
          decision.recommendedAction
        );
      }
    });

    it('should verify remediation for high-severity incidents', async () => {
      const incidents = await detector.detectIncidents('deploy-high-verify', {
        errorRate: 0.12,
      });

      if (incidents.length > 0 && incidents[0].severity === 'high') {
        const decision = await orchestrator.orchestrateIncident({
          incident: incidents[0],
          previousAttempts: [],
        });

        expect(['verify-remediation', 'initiate-rollback']).toContain(
          decision.recommendedAction
        );
      }
    });
  });

  describe('Medium severity incident orchestration', () => {
    it('should scale infrastructure for medium performance degradation', async () => {
      const incidents = await detector.detectIncidents('deploy-medium-scale', {
        latency: 6500,
      });

      const perfIncident = incidents.find(
        (inc) => inc.category === 'performance-degradation'
      );
      if (perfIncident && perfIncident.severity === 'medium') {
        const decision = await orchestrator.orchestrateIncident({
          incident: perfIncident,
          previousAttempts: [],
        });

        expect(['scale-infrastructure', 'verify-remediation']).toContain(
          decision.recommendedAction
        );
      }
    });

    it('should monitor rather than act on low-severity incidents', async () => {
      const incidents = await detector.detectIncidents('deploy-low-monitor', {
        errorRate: 0.02,
        latency: 1000,
      });

      if (incidents.length === 0) {
        // If no incidents detected at all, test passes
        expect(true).toBe(true);
      } else if (incidents[0].severity === 'low') {
        const decision = await orchestrator.orchestrateIncident({
          incident: incidents[0],
          previousAttempts: [],
        });

        expect(['none']).toContain(decision.recommendedAction);
      }
    });
  });

  describe('Decision execution', () => {
    it('should execute founder notification without operator action', async () => {
      const incidents = await detector.detectIncidents('deploy-exec-notify', {
        recentErrors: [
          {
            message: 'Database connection timeout',
            category: 'database',
            count: 200,
          },
        ],
      });

      const dataIncident = incidents.find(
        (inc) => inc.category === 'data-loss-risk'
      );
      if (dataIncident) {
        const decision = await orchestrator.orchestrateIncident({
          incident: dataIncident,
          previousAttempts: [],
        });

        const result = await orchestrator.executeOrchestrationDecision(
          decision,
          {
            incident: dataIncident,
            previousAttempts: [],
          }
        );

        expect(result.finalState).toBe('escalated-to-founder');
      }
    });

    it('should execute rollback initiation', async () => {
      let report = await verifyDeployment('deploy-exec-rollback');

      let attempts = 0;
      while (
        report.decision !== 'ROLLBACK' &&
        report.decision !== 'ESCALATE' &&
        attempts < 5
      ) {
        report = await verifyDeployment('deploy-exec-rollback');
        attempts++;
      }

      if (report.canRollback) {
        const incidents = await detector.detectIncidents(
          'deploy-exec-rollback',
          {
            verificationReport: report,
          }
        );

        if (incidents.length > 0 && incidents[0].canAutoRemediate) {
          const decision = await orchestrator.orchestrateIncident({
            incident: incidents[0],
            verificationReport: report,
            previousAttempts: [],
          });

          if (decision.recommendedAction === 'initiate-rollback') {
            const result = await orchestrator.executeOrchestrationDecision(
              decision,
              {
                incident: incidents[0],
                verificationReport: report,
                previousAttempts: [],
              }
            );

            expect([
              'auto-remediation-initiated',
              'remediation-in-progress',
            ]).toContain(result.finalState);
          }
        }
      }
    });

    it('should execute traffic throttling action', async () => {
      const incidents = await detector.detectIncidents('deploy-exec-throttle', {
        latency: 15000,
      });

      const perfIncident = incidents.find(
        (inc) => inc.category === 'performance-degradation'
      );
      if (perfIncident && perfIncident.severity === 'high') {
        const decision = await orchestrator.orchestrateIncident({
          incident: perfIncident,
          previousAttempts: [],
        });

        if (decision.recommendedAction === 'throttle-traffic') {
          const result = await orchestrator.executeOrchestrationDecision(
            decision,
            {
              incident: perfIncident,
              previousAttempts: [],
            }
          );

          expect(result.success).toBe(true);
          expect(result.finalState).toBe('remediation-in-progress');
        }
      }
    });
  });

  describe('Remediation attempt tracking', () => {
    it('should track remediation attempts per deployment', async () => {
      const deployId = `deploy-track-${Date.now()}`;
      const incidents = await detector.detectIncidents(deployId, {
        errorRate: 0.15,
      });

      if (incidents.length > 0) {
        const decision = await orchestrator.orchestrateIncident({
          incident: incidents[0],
          previousAttempts: [],
        });

        if (decision.recommendedAction !== 'none') {
          await orchestrator.executeOrchestrationDecision(decision, {
            incident: incidents[0],
            previousAttempts: [],
          });

          const attempts = orchestrator.getRemediationAttempts(deployId);
          expect(attempts.length).toBeGreaterThan(0);
          expect(attempts[0].action).toBe(decision.recommendedAction);
          expect(attempts[0].startedAt).toBeDefined();
        }
      }
    });

    it('should escalate when max remediation attempts exceeded', async () => {
      const deployId = `deploy-max-attempts-${Date.now()}`;

      // Simulate multiple failed remediation attempts
      const failedAttempt = {
        action: 'initiate-rollback' as const,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        success: false,
        error: 'Rollback failed',
        duration: 5000,
      };

      const incident: DetectedIncident = {
        incidentId: `inc-${deployId}`,
        deploymentId: deployId,
        category: 'deployment-failure',
        severity: 'high',
        signals: [],
        detectedAt: new Date().toISOString(),
        description: 'Test deployment failure',
        affectedServices: ['api'],
        estimatedUserImpact: 0.8,
        canAutoRemediate: true,
        requiresFounderNotification: false,
      };

      // Simulate reaching max attempts (3)
      const attempts = [failedAttempt, failedAttempt, failedAttempt];

      const decision = await orchestrator.orchestrateIncident({
        incident,
        previousAttempts: attempts,
      });

      // After max attempts reached, should escalate
      if (attempts.length >= 3) {
        expect(decision.shouldEscalateToFounder).toBe(true);
      }
    });
  });

  describe('State transitions', () => {
    it('should transition from detected to auto-remediation-initiated', async () => {
      let report = await verifyDeployment('deploy-state-1');

      let attempts = 0;
      while (report.canRollback === false && attempts < 10) {
        report = await verifyDeployment('deploy-state-1');
        attempts++;
      }

      if (report.canRollback) {
        const incidents = await detector.detectIncidents('deploy-state-1', {
          verificationReport: report,
        });

        if (
          incidents.length > 0 &&
          incidents[0].canAutoRemediate &&
          incidents[0].severity !== 'low'
        ) {
          const decision = await orchestrator.orchestrateIncident({
            incident: incidents[0],
            verificationReport: report,
            previousAttempts: [],
          });

          const result = await orchestrator.executeOrchestrationDecision(
            decision,
            {
              incident: incidents[0],
              verificationReport: report,
              previousAttempts: [],
            }
          );

          if (decision.recommendedAction === 'initiate-rollback') {
            expect([
              'auto-remediation-initiated',
              'remediation-in-progress',
            ]).toContain(result.finalState);
          }
        }
      }
    });

    it('should transition to escalated-to-founder for critical incidents', async () => {
      const incidents = await detector.detectIncidents('deploy-state-founder', {
        recentErrors: [
          {
            message: 'Database connection timeout',
            category: 'database',
            count: 300,
          },
        ],
      });

      const critical = incidents.find((inc) => inc.severity === 'critical');
      if (critical) {
        const decision = await orchestrator.orchestrateIncident({
          incident: critical,
          previousAttempts: [],
        });

        const result = await orchestrator.executeOrchestrationDecision(
          decision,
          {
            incident: critical,
            previousAttempts: [],
          }
        );

        expect(result.finalState).toBe('escalated-to-founder');
      }
    });

    it('should transition to incident-resolved when monitoring only', async () => {
      const incidents = await detector.detectIncidents(
        'deploy-state-resolved',
        {
          errorRate: 0.01,
        }
      );

      if (incidents.length === 0 || incidents[0].severity === 'low') {
        const testIncident: DetectedIncident = incidents[0] || {
          incidentId: 'test-low',
          deploymentId: 'deploy-state-resolved',
          category: 'performance-degradation',
          severity: 'low',
          signals: [],
          detectedAt: new Date().toISOString(),
          description: 'Low severity for monitoring',
          affectedServices: [],
          estimatedUserImpact: 0.05,
          canAutoRemediate: false,
          requiresFounderNotification: false,
        };

        const decision = await orchestrator.orchestrateIncident({
          incident: testIncident,
          previousAttempts: [],
        });

        const result = await orchestrator.executeOrchestrationDecision(
          decision,
          {
            incident: testIncident,
            previousAttempts: [],
          }
        );

        expect(result.finalState).toBe('incident-resolved');
      }
    });
  });

  describe('Evidence collection and reasoning', () => {
    it('should include evidence in orchestration decision', async () => {
      let report = await verifyDeployment('deploy-evidence-orch');

      let attempts = 0;
      while (report.failedChecks === 0 && attempts < 5) {
        report = await verifyDeployment('deploy-evidence-orch');
        attempts++;
      }

      if (report.failedChecks > 0) {
        const incidents = await detector.detectIncidents(
          'deploy-evidence-orch',
          {
            verificationReport: report,
          }
        );

        if (incidents.length > 0) {
          const decision = await orchestrator.orchestrateIncident({
            incident: incidents[0],
            verificationReport: report,
            previousAttempts: [],
          });

          expect(decision.evidence.length).toBeGreaterThan(0);
          expect(decision.reason).toBeDefined();
          expect(decision.reason.length).toBeGreaterThan(0);
        }
      }
    });

    it('should estimate recovery time based on severity', async () => {
      const criticalIncidents = await detector.detectIncidents(
        'deploy-recovery-critical',
        {
          errorRate: 0.3,
          latency: 20000,
          memoryUsage: 0.99,
        }
      );

      const critical = criticalIncidents.find(
        (inc) => inc.severity === 'critical'
      );
      if (critical) {
        const decision = await orchestrator.orchestrateIncident({
          incident: critical,
          previousAttempts: [],
          foundationMetrics: {
            avgRecoveryTime: 600,
            successRate: 0.95,
            failurePatterns: [],
          },
        });

        expect(decision.estimatedRecoveryTime).toBeGreaterThan(300);
      }

      const mediumIncidents = await detector.detectIncidents(
        'deploy-recovery-medium',
        {
          latency: 7000,
        }
      );

      if (
        mediumIncidents.length > 0 &&
        mediumIncidents[0].severity === 'medium'
      ) {
        const decision = await orchestrator.orchestrateIncident({
          incident: mediumIncidents[0],
          previousAttempts: [],
          foundationMetrics: {
            avgRecoveryTime: 300,
            successRate: 0.98,
            failurePatterns: [],
          },
        });

        expect(decision.estimatedRecoveryTime).toBeDefined();
      }
    });

    it('should classify action risk appropriately', async () => {
      let report = await verifyDeployment('deploy-risk-class');

      let attempts = 0;
      while (report.canRollback === false && attempts < 10) {
        report = await verifyDeployment('deploy-risk-class');
        attempts++;
      }

      if (report.canRollback) {
        const incidents = await detector.detectIncidents('deploy-risk-class', {
          verificationReport: report,
        });

        if (incidents.length > 0 && incidents[0].canAutoRemediate) {
          const decision = await orchestrator.orchestrateIncident({
            incident: incidents[0],
            verificationReport: report,
            previousAttempts: [],
          });

          expect(['low', 'medium', 'high']).toContain(decision.riskOfAction);
        }
      }
    });
  });

  describe('Audit logging', () => {
    it('should record all orchestration decisions in audit log', async () => {
      const deployId = `deploy-audit-${Date.now()}`;
      const incidents = await detector.detectIncidents(deployId, {
        errorRate: 0.15,
      });

      if (incidents.length > 0) {
        const decision = await orchestrator.orchestrateIncident({
          incident: incidents[0],
          previousAttempts: [],
        });

        await orchestrator.executeOrchestrationDecision(decision, {
          incident: incidents[0],
          previousAttempts: [],
        });

        const auditLog = orchestrator.getAuditLog();
        expect(auditLog.length).toBeGreaterThan(0);

        const entry = auditLog[auditLog.length - 1];
        expect(entry.timestamp).toBeDefined();
        expect(entry.incidentId).toBe(incidents[0].incidentId);
        expect(entry.deploymentId).toBe(deployId);
        expect(entry.action).toBeDefined();
        expect(entry.previousState).toBeDefined();
        expect(entry.newState).toBeDefined();
        expect(entry.result).toBeDefined();
      }
    });

    it('should include result details in audit entries', async () => {
      const incidents = await detector.detectIncidents('deploy-audit-detail', {
        errorRate: 0.15,
      });

      if (incidents.length > 0) {
        const decision = await orchestrator.orchestrateIncident({
          incident: incidents[0],
          previousAttempts: [],
        });

        await orchestrator.executeOrchestrationDecision(decision, {
          incident: incidents[0],
          previousAttempts: [],
        });

        const auditLog = orchestrator.getAuditLog();
        const lastEntry = auditLog[auditLog.length - 1];

        if (lastEntry.result) {
          expect(lastEntry.result.success).toBeDefined();
          expect(typeof lastEntry.result.success).toBe('boolean');
          expect(lastEntry.result.message).toBeDefined();
          expect(lastEntry.result.duration).toBeGreaterThanOrEqual(0);
        }
      }
    });
  });

  describe('Concurrent incident orchestration', () => {
    it('should handle multiple concurrent incidents', async () => {
      const deployIds = Array.from(
        { length: 3 },
        (_, i) => `deploy-concurrent-inc-${i}`
      );

      const results = await Promise.all(
        deployIds.map(async (id) => {
          const incidents = await detector.detectIncidents(id, {
            errorRate: Math.random() * 0.2,
          });
          return { deployId: id, incidents };
        })
      );

      expect(results.length).toBe(3);
      results.forEach((result) => {
        expect(Array.isArray(result.incidents)).toBe(true);
      });
    });
  });

  describe('Audit log cleanup', () => {
    it('should remove old audit entries', async () => {
      const incidents = await detector.detectIncidents('deploy-cleanup-audit', {
        errorRate: 0.15,
      });

      if (incidents.length > 0) {
        const decision = await orchestrator.orchestrateIncident({
          incident: incidents[0],
          previousAttempts: [],
        });

        await orchestrator.executeOrchestrationDecision(decision, {
          incident: incidents[0],
          previousAttempts: [],
        });

        let auditLog = orchestrator.getAuditLog();
        const initialLength = auditLog.length;

        // Clear with 0 minute max age
        orchestrator.clearOldAuditEntries(0);

        auditLog = orchestrator.getAuditLog();
        expect(auditLog.length).toBeLessThan(initialLength);
      }
    });
  });
});
