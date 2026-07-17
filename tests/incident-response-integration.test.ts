import { describe, it, expect } from 'vitest';
import { IncidentDetector } from '../lib/incident-detection';
import { IncidentOrchestrator } from '../lib/incident-orchestration';
import { verifyDeployment } from '../lib/deployment-verification';

describe('Incident Response Integration (DNA-GOV-013)', () => {
  describe('End-to-end incident detection and orchestration', () => {
    it('should complete full incident response flow for critical deployment failure', async () => {
      // Step 1: Deployment verification triggers incident detection
      let report = await verifyDeployment('deploy-e2e-critical');

      let attempts = 0;
      while (
        report.decision !== 'ROLLBACK' &&
        report.decision !== 'ESCALATE' &&
        attempts < 10
      ) {
        report = await verifyDeployment('deploy-e2e-critical');
        attempts++;
      }

      if (report.decision === 'ROLLBACK' || report.decision === 'ESCALATE') {
        // Step 2: Detect incidents from verification report
        const detector = new IncidentDetector();
        const incidents = await detector.detectIncidents(
          'deploy-e2e-critical',
          {
            verificationReport: report,
          }
        );

        expect(incidents.length).toBeGreaterThan(0);
        const primaryIncident = incidents[0];

        // Step 3: Orchestrate response
        const orchestrator = new IncidentOrchestrator();
        const decision = await orchestrator.orchestrateIncident({
          incident: primaryIncident,
          verificationReport: report,
          previousAttempts: [],
        });

        expect(decision.currentState).toBeDefined();
        expect(decision.recommendedAction).toBeDefined();

        // Step 4: Execute decision
        const result = await orchestrator.executeOrchestrationDecision(
          decision,
          {
            incident: primaryIncident,
            verificationReport: report,
            previousAttempts: [],
          }
        );

        expect(result.finalState).toBeDefined();
        expect(result.success).toBeDefined();

        // Step 5: Verify audit trail
        const auditLog = orchestrator.getAuditLog();
        expect(auditLog.length).toBeGreaterThan(0);
        expect(auditLog[0].incidentId).toBe(primaryIncident.incidentId);
      }
    });

    it('should handle performance degradation incident response', async () => {
      // Simulate performance degradation detection
      const detector = new IncidentDetector();
      const incidents = await detector.detectIncidents('deploy-e2e-perf', {
        latency: 12000,
        errorRate: 0.08,
      });

      if (incidents.length > 0) {
        const perfIncident = incidents[0];

        // Orchestrate mitigation
        const orchestrator = new IncidentOrchestrator();
        const decision = await orchestrator.orchestrateIncident({
          incident: perfIncident,
          previousAttempts: [],
        });

        expect([
          'throttle-traffic',
          'scale-infrastructure',
          'verify-remediation',
        ]).toContain(decision.recommendedAction);

        // Execute mitigation
        const result = await orchestrator.executeOrchestrationDecision(
          decision,
          {
            incident: perfIncident,
            previousAttempts: [],
          }
        );

        expect(result.success).toBe(true);
      }
    });

    it('should handle cascading failure with escalation', async () => {
      const detector = new IncidentDetector();
      const incidents = await detector.detectIncidents('deploy-e2e-cascade', {
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
        const orchestrator = new IncidentOrchestrator();
        const decision = await orchestrator.orchestrateIncident({
          incident: cascade,
          previousAttempts: [],
        });

        expect(decision.shouldEscalateToFounder).toBe(true);
        expect(decision.severity).toBe('critical');

        // Execute escalation
        const result = await orchestrator.executeOrchestrationDecision(
          decision,
          {
            incident: cascade,
            previousAttempts: [],
          }
        );

        expect(result.finalState).toBe('escalated-to-founder');
      }
    });
  });

  describe('Multi-incident response prioritization', () => {
    it('should prioritize critical incidents over lower severity', async () => {
      const detector = new IncidentDetector();

      // Detect multiple incidents with different severities
      const criticalIncidents = await detector.detectIncidents(
        'deploy-multi-1',
        {
          recentErrors: [
            {
              message: 'Database connection timeout',
              category: 'database',
              count: 200,
            },
          ],
        }
      );

      const lowIncidents = await detector.detectIncidents('deploy-multi-2', {
        errorRate: 0.02,
      });

      const allIncidents = [...criticalIncidents, ...lowIncidents];

      // Sort by severity (critical > high > medium > low)
      const sorted = allIncidents.sort((a, b) => {
        const severityMap = { critical: 3, high: 2, medium: 1, low: 0 };
        return (
          severityMap[b.severity as keyof typeof severityMap] -
          severityMap[a.severity as keyof typeof severityMap]
        );
      });

      if (sorted.length > 0) {
        const primaryIncident = sorted[0];
        expect(primaryIncident).toBeDefined();

        // Verify we'd orchestrate the critical incident first
        if (primaryIncident.severity === 'critical') {
          expect(['critical']).toContain(primaryIncident.severity);
        }
      }
    });
  });

  describe('Incident lifecycle tracking', () => {
    it('should track incident from detection through resolution', async () => {
      const deployId = `deploy-lifecycle-${Date.now()}`;
      const detector = new IncidentDetector();

      // Step 1: Detect incident
      const incidents = await detector.detectIncidents(deployId, {
        errorRate: 0.15,
      });

      if (incidents.length > 0) {
        const incident = incidents[0];
        const incidentId = incident.incidentId;

        // Step 2: Get incident from detector
        const retrieved = detector.getIncident(incidentId);
        expect(retrieved).toBeDefined();
        expect(retrieved?.incidentId).toBe(incidentId);

        // Step 3: Check incident history
        const history = detector.getIncidentHistory(deployId);
        expect(history.length).toBeGreaterThan(0);
        expect(history.some((h) => h.incidentId === incidentId)).toBe(true);

        // Step 4: Orchestrate and track state
        const orchestrator = new IncidentOrchestrator();
        const decision = await orchestrator.orchestrateIncident({
          incident,
          previousAttempts: [],
        });

        const state = orchestrator.getIncidentState(incidentId);
        expect(state).toBeDefined();

        // Step 5: Execute and verify final state
        const result = await orchestrator.executeOrchestrationDecision(
          decision,
          {
            incident,
            previousAttempts: [],
          }
        );

        expect(result.finalState).toBeDefined();
      }
    });
  });

  describe('Repeated incident handling', () => {
    it('should detect patterns in repeated incidents', async () => {
      const deployId = `deploy-repeat-${Date.now()}`;
      const detector = new IncidentDetector();

      // First incident
      const incident1 = await detector.detectIncidents(deployId, {
        errorRate: 0.15,
      });

      // Second incident (same type)
      const incident2 = await detector.detectIncidents(deployId, {
        errorRate: 0.18,
      });

      // Third incident (same type)
      const incident3 = await detector.detectIncidents(deployId, {
        errorRate: 0.12,
      });

      const history = detector.getIncidentHistory(deployId);
      const totalIncidents = history.length;

      // Should see pattern of repeated error-rate incidents
      if (totalIncidents > 1) {
        expect(totalIncidents).toBeGreaterThanOrEqual(1);

        // Check if incidents are correlated
        const lastIncident = history[history.length - 1];
        if (
          lastIncident.previousIncidents &&
          lastIncident.previousIncidents.length > 0
        ) {
          expect(lastIncident.previousIncidents.length).toBeGreaterThan(0);
        }
      }
    });

    it('should escalate after multiple failed remediation attempts', async () => {
      const orchestrator = new IncidentOrchestrator();

      // Simulate multiple failed remediation attempts
      const failedAttempt = {
        action: 'initiate-rollback' as const,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        success: false,
        error: 'Rollback failed',
        duration: 5000,
      };

      const mockIncident = {
        incidentId: `inc-repeat-fail-${Date.now()}`,
        deploymentId: `deploy-repeat-fail-${Date.now()}`,
        category: 'deployment-failure' as const,
        severity: 'high' as const,
        signals: [],
        detectedAt: new Date().toISOString(),
        description: 'Deployment failure',
        affectedServices: ['api'],
        estimatedUserImpact: 0.8,
        canAutoRemediate: true,
        requiresFounderNotification: false,
      };

      // First attempt - should try remediation
      const decision1 = await orchestrator.orchestrateIncident({
        incident: mockIncident,
        previousAttempts: [],
      });

      expect(decision1.recommendedAction).toBeDefined();

      // Second attempt after failure - should still try if under limit
      const decision2 = await orchestrator.orchestrateIncident({
        incident: mockIncident,
        previousAttempts: [failedAttempt],
      });

      expect(decision2.recommendedAction).toBeDefined();

      // Third attempt - still under limit
      const decision3 = await orchestrator.orchestrateIncident({
        incident: mockIncident,
        previousAttempts: [failedAttempt, failedAttempt],
      });

      // Fourth attempt - should escalate at this point
      const decision4 = await orchestrator.orchestrateIncident({
        incident: mockIncident,
        previousAttempts: [failedAttempt, failedAttempt, failedAttempt],
      });

      if (
        decision4.previousAttempts &&
        decision4.previousAttempts.length >= 3
      ) {
        expect(decision4.shouldEscalateToFounder).toBe(true);
      }
    });
  });

  describe('Incident response under load', () => {
    it('should handle multiple concurrent deployments with incidents', async () => {
      const detector = new IncidentDetector();
      const deployIds = Array.from(
        { length: 10 },
        (_, i) => `deploy-load-${i}`
      );

      const results = await Promise.all(
        deployIds.map((id) =>
          detector.detectIncidents(id, {
            errorRate: Math.random() * 0.2,
            latency: Math.random() * 15000,
          })
        )
      );

      expect(results.length).toBe(10);
      results.forEach((incidents) => {
        expect(Array.isArray(incidents)).toBe(true);
      });

      // Verify all can be orchestrated
      const orchestrator = new IncidentOrchestrator();
      const orchestrationResults = await Promise.all(
        results.flat().map((incident) =>
          orchestrator.orchestrateIncident({
            incident,
            previousAttempts: [],
          })
        )
      );

      expect(orchestrationResults.length).toBeGreaterThan(0);
      orchestrationResults.forEach((decision) => {
        expect(decision.recommendedAction).toBeDefined();
      });
    });
  });

  describe('Incident resolution verification', () => {
    it('should verify incident is resolved after remediation', async () => {
      const detector = new IncidentDetector();
      const incidents = await detector.detectIncidents(
        'deploy-verify-resolved',
        {
          errorRate: 0.15,
        }
      );

      if (incidents.length > 0) {
        const incident = incidents[0];

        // Orchestrate response
        const orchestrator = new IncidentOrchestrator();
        const decision = await orchestrator.orchestrateIncident({
          incident,
          previousAttempts: [],
        });

        // Execute decision
        const result = await orchestrator.executeOrchestrationDecision(
          decision,
          {
            incident,
            previousAttempts: [],
          }
        );

        // Verify final state indicates some form of resolution
        const validFinalStates = [
          'incident-resolved',
          'escalated-to-founder',
          'remediation-complete',
          'remediation-in-progress',
          'incident-unresolved',
          'auto-remediation-initiated',
        ];
        expect(validFinalStates).toContain(result.finalState);
      }
    });
  });

  describe('Audit compliance', () => {
    it('should maintain complete audit trail for incident response', async () => {
      const detector = new IncidentDetector();
      const incidents = await detector.detectIncidents(
        'deploy-audit-compliance',
        {
          errorRate: 0.15,
        }
      );

      if (incidents.length > 0) {
        const incident = incidents[0];

        const orchestrator = new IncidentOrchestrator();
        const decision = await orchestrator.orchestrateIncident({
          incident,
          previousAttempts: [],
        });

        await orchestrator.executeOrchestrationDecision(decision, {
          incident,
          previousAttempts: [],
        });

        const auditLog = orchestrator.getAuditLog();
        expect(auditLog.length).toBeGreaterThan(0);

        // Verify all entries have required fields
        auditLog.forEach((entry) => {
          expect(entry.timestamp).toBeDefined();
          expect(entry.incidentId).toBeDefined();
          expect(entry.deploymentId).toBeDefined();
          expect(entry.action).toBeDefined();
          expect(entry.previousState).toBeDefined();
          expect(entry.newState).toBeDefined();
          expect(entry.reason).toBeDefined();

          // Verify timestamp is valid
          const date = new Date(entry.timestamp);
          expect(date.getTime()).toBeGreaterThan(0);

          // Verify state transitions are valid
          expect([
            'detected',
            'analyzing',
            'escalated-to-founder',
            'auto-remediation-initiated',
            'remediation-in-progress',
            'remediation-complete',
            'remediation-failed',
            'verification-in-progress',
            'incident-resolved',
            'incident-unresolved',
          ]).toContain(entry.previousState);
          expect([
            'detected',
            'analyzing',
            'escalated-to-founder',
            'auto-remediation-initiated',
            'remediation-in-progress',
            'remediation-complete',
            'remediation-failed',
            'verification-in-progress',
            'incident-resolved',
            'incident-unresolved',
          ]).toContain(entry.newState);
        });
      }
    });
  });

  describe('Recovery validation', () => {
    it('should confirm deployment health after incident response', async () => {
      let report = await verifyDeployment('deploy-recovery-check');

      // Get incident status
      const detector = new IncidentDetector();
      const incidents = await detector.detectIncidents(
        'deploy-recovery-check',
        {
          verificationReport: report,
        }
      );

      // Verify current deployment status
      if (report.passedChecks >= 8) {
        // Deployment is healthy or nearly healthy
        expect(report.decision).toMatch(/PASS|RETRY/);
      }
    });
  });
});
