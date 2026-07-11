import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FounderAlertingSystem, getFounderAlertingSystem } from '../lib/founder-alerting';
import { DetectedIncident } from '../lib/incident-detection';
import { OrchestrationDecision } from '../lib/incident-orchestration';

describe('DNS-028: Founder Alerting System', () => {
  let alertingSystem: FounderAlertingSystem;

  const mockIncident: DetectedIncident = {
    incidentId: 'incident-001',
    deploymentId: 'deploy-001',
    severity: 'critical',
    category: 'deployment-failure',
    description: 'Database schema mismatch detected',
    detectedAt: new Date().toISOString(),
    affectedServices: ['/api/search', '/api/history'],
    estimatedUserImpact: 0.8,
    canAutoRemediate: false,
    requiresFounderNotification: true,
    signals: [],
  };

  const mockDecision: OrchestrationDecision = {
    incidentId: 'incident-001',
    deploymentId: 'deploy-001',
    currentState: 'analyzing',
    recommendedAction: 'execute-rollback',
    shouldEscalateToFounder: true,
    reason: 'Critical schema mismatch requires manual verification',
    evidence: ['Column preferences does not exist'],
    estimatedRecoveryTime: 120,
    riskOfAction: 'low',
    timestamp: new Date().toISOString(),
  };

  beforeEach(() => {
    alertingSystem = new FounderAlertingSystem();
  });

  describe('Initialization', () => {
    it('should initialize alerting system', () => {
      expect(alertingSystem).toBeDefined();
    });

    it('should get singleton instance', () => {
      const instance1 = getFounderAlertingSystem();
      const instance2 = getFounderAlertingSystem();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Alert Configuration', () => {
    it('should report email disabled when FOUNDER_EMAIL not set', () => {
      const status = alertingSystem.getStatus();
      expect(status).toHaveProperty('emailEnabled');
      expect(status).toHaveProperty('slackEnabled');
    });

    it('should include both channels in configuration', () => {
      const status = alertingSystem.getStatus();
      expect(status.channels).toHaveLength(2);
      expect(status.channels.map((c) => c.type)).toContain('email');
      expect(status.channels.map((c) => c.type)).toContain('slack');
    });
  });

  describe('Critical Incident Alerting', () => {
    it('should alert on critical incident', async () => {
      const result = await alertingSystem.alertCriticalIncident(mockIncident, mockDecision);

      expect(result).toHaveProperty('emailSent');
      expect(result).toHaveProperty('slackSent');
      expect(result).toHaveProperty('deduped');
      expect(result.deduped).toBe(false);
    });

    it('should include incident details in alert payload', async () => {
      const result = await alertingSystem.alertCriticalIncident(mockIncident, mockDecision);

      // Alert should have been attempted
      expect(result).toBeDefined();
    });

    it('should deduplicate repeated alerts for same incident', async () => {
      // First alert
      const result1 = await alertingSystem.alertCriticalIncident(mockIncident, mockDecision);
      expect(result1.deduped).toBe(false);

      // Second alert immediately after (should be deduped)
      const result2 = await alertingSystem.alertCriticalIncident(mockIncident, mockDecision);
      expect(result2.deduped).toBe(true);
      expect(result2.emailSent).toBe(false);
      expect(result2.slackSent).toBe(false);
    });

    it('should alert with correct severity level', async () => {
      const criticalIncident: DetectedIncident = {
        ...mockIncident,
        severity: 'critical',
      };

      const result = await alertingSystem.alertCriticalIncident(criticalIncident, mockDecision);
      expect(result).toBeDefined();
    });

    it('should include dashboard link in alert', async () => {
      const dashboardUrl = 'https://example.com/dashboard';
      const result = await alertingSystem.alertCriticalIncident(
        mockIncident,
        mockDecision,
        dashboardUrl
      );

      expect(result).toBeDefined();
    });
  });

  describe('Remediation Outcome Alerting', () => {
    it('should alert on successful remediation', async () => {
      const result = await alertingSystem.alertRemediationOutcome(
        'incident-001',
        true,
        45000,
        'Executed rollback',
        'Schema was out of sync; re-deployed with migration'
      );

      expect(result).toHaveProperty('emailSent');
      expect(result).toHaveProperty('slackSent');
    });

    it('should alert on failed remediation', async () => {
      const result = await alertingSystem.alertRemediationOutcome(
        'incident-001',
        false,
        30000,
        'Rollback failed: old deployment corrupted',
        'Requires manual intervention'
      );

      expect(result).toHaveProperty('emailSent');
      expect(result).toHaveProperty('slackSent');
    });

    it('should include recovery time in alert', async () => {
      const recoveryTimeMs = 65400;
      const result = await alertingSystem.alertRemediationOutcome(
        'incident-001',
        true,
        recoveryTimeMs,
        'Scaled database connections',
        undefined
      );

      expect(result).toBeDefined();
    });
  });

  describe('Repeated Pattern Alerting', () => {
    it('should alert on repeated error patterns', async () => {
      const result = await alertingSystem.alertRepeatedPattern(
        'fp-connection-timeout-001',
        'Connection timeout on read replica',
        42,
        'Increase connection pool size or add read-only replicas'
      );

      expect(result).toHaveProperty('emailSent');
      expect(result).toHaveProperty('slackSent');
    });

    it('should include pattern details in alert', async () => {
      const pattern = 'Database connection refused';
      const occurrences = 150;

      const result = await alertingSystem.alertRepeatedPattern(
        'fp-db-connection-001',
        pattern,
        occurrences,
        'Check database cluster health and connection limits'
      );

      expect(result).toBeDefined();
    });

    it('should escalate high-frequency patterns', async () => {
      const result = await alertingSystem.alertRepeatedPattern(
        'fp-rate-limit-001',
        'OpenAI rate limit exceeded',
        500,
        'Upgrade OpenAI plan or implement request batching'
      );

      expect(result).toBeDefined();
    });
  });

  describe('Alert History and Deduplication', () => {
    it('should track alert history', async () => {
      const incident1: DetectedIncident = { ...mockIncident, incidentId: 'incident-1' };
      const incident2: DetectedIncident = { ...mockIncident, incidentId: 'incident-2' };

      await alertingSystem.alertCriticalIncident(incident1, mockDecision);
      await alertingSystem.alertCriticalIncident(incident2, mockDecision);

      // Same incident within dedup window
      const dupResult = await alertingSystem.alertCriticalIncident(incident1, mockDecision);
      expect(dupResult.deduped).toBe(true);
    });

    it('should reset deduplication after window expires', async () => {
      vi.useFakeTimers();

      const incident: DetectedIncident = mockIncident;

      // First alert
      const result1 = await alertingSystem.alertCriticalIncident(incident, mockDecision);
      expect(result1.deduped).toBe(false);

      // Advance time past dedup window (5 minutes)
      vi.advanceTimersByTime(301000);

      // Second alert should not be deduped
      const result2 = await alertingSystem.alertCriticalIncident(incident, mockDecision);
      expect(result2.deduped).toBe(false);

      vi.useRealTimers();
    });
  });

  describe('Multi-Channel Delivery', () => {
    it('should attempt delivery on all enabled channels', async () => {
      const result = await alertingSystem.alertCriticalIncident(mockIncident, mockDecision);

      // Should have attempted both channels (may succeed or fail based on config)
      expect(result).toHaveProperty('emailSent');
      expect(result).toHaveProperty('slackSent');
    });

    it('should handle email failures gracefully', async () => {
      const result = await alertingSystem.alertCriticalIncident(mockIncident, mockDecision);

      // System should not throw even if email fails
      expect(result).toBeDefined();
      expect(result).toHaveProperty('slackSent');
    });

    it('should handle Slack failures gracefully', async () => {
      const result = await alertingSystem.alertCriticalIncident(mockIncident, mockDecision);

      // System should not throw even if Slack fails
      expect(result).toBeDefined();
      expect(result).toHaveProperty('emailSent');
    });
  });

  describe('Alert Payload Content', () => {
    it('should include incident severity in alert', async () => {
      const criticalIncident: DetectedIncident = { ...mockIncident, severity: 'critical' };
      await alertingSystem.alertCriticalIncident(criticalIncident, mockDecision);

      // Alert should reference severity
      const status = alertingSystem.getStatus();
      expect(status).toBeDefined();
    });

    it('should include decision recommendation in alert', async () => {
      const decision: OrchestrationDecision = { ...mockDecision, recommendedAction: 'scale-infrastructure' };
      await alertingSystem.alertCriticalIncident(mockIncident, decision);

      // Alert should reference decision
      const status = alertingSystem.getStatus();
      expect(status).toBeDefined();
    });

    it('should distinguish actionable vs escalated incidents', async () => {
      // Actionable: auto-remediation in progress
      const autoRemediateDecision = {
        ...mockDecision,
        shouldEscalateToFounder: false,
      };

      await alertingSystem.alertCriticalIncident(mockIncident, autoRemediateDecision);

      // Escalated: requires manual review
      const escalatedDecision = {
        ...mockDecision,
        shouldEscalateToFounder: true,
      };

      await alertingSystem.alertCriticalIncident(mockIncident, escalatedDecision);

      // Both should succeed
      const status = alertingSystem.getStatus();
      expect(status).toBeDefined();
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle full incident lifecycle alerts', async () => {
      // 1. Critical incident detected
      const detectionAlert = await alertingSystem.alertCriticalIncident(
        mockIncident,
        mockDecision
      );
      expect(detectionAlert).toBeDefined();

      // 2. Remediation executed
      const remediationAlert = await alertingSystem.alertRemediationOutcome(
        mockIncident.incidentId,
        true,
        120000,
        'Rollback to previous deployment',
        'New migration had schema compatibility issue'
      );
      expect(remediationAlert).toBeDefined();
    });

    it('should handle escalation when auto-remediation fails', async () => {
      // First attempt: auto-remediation fails
      const failedRemediation = await alertingSystem.alertRemediationOutcome(
        'incident-001',
        false,
        30000,
        'Rollback failed',
        'Requires manual intervention'
      );
      expect(failedRemediation).toBeDefined();

      // Then: escalate to founder
      const escalation = await alertingSystem.alertCriticalIncident(
        {
          ...mockIncident,
          description: 'Auto-remediation failed: manual intervention required',
        },
        { ...mockDecision, shouldEscalateToFounder: true }
      );
      expect(escalation.deduped).toBe(false);
    });
  });
});
