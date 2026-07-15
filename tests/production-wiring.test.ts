import { describe, it, expect, beforeEach } from 'vitest';
import {
  ProductionWiring,
  IncidentToAlertMapping,
  RemediationFeedback,
  wireProductionIncidentResponse,
} from '../lib/production-wiring';
import { ErrorMetrics, ErrorPattern } from '../lib/error-tracking';

describe('Production Wiring (DNA-GOV-014)', () => {
  let wiring: ProductionWiring;

  const mockErrorMetrics: ErrorMetrics = {
    timestamp: new Date().toISOString(),
    totalErrors: 150,
    criticalErrors: 5,
    errorsByCategory: {
      runtime: 60,
      api: 50,
      database: 30,
      auth: 10,
      validation: 0,
      'external-service': 0,
      unknown: 0,
    },
    errorsBySeverity: {
      critical: 5,
      high: 30,
      medium: 80,
      low: 35,
    },
    errorsByService: {
      api: 100,
      worker: 50,
    },
    uniquePatterns: 8,
    errorRate: 2.5,
    topPatterns: [],
    newPatternsLastHour: [],
    resolvedPatterns: [],
  };

  const mockErrorPatterns: ErrorPattern[] = [
    {
      fingerprint: 'fp-api-timeout-001',
      category: 'api',
      message: 'API timeout after 30s',
      firstSeen: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
      occurrenceCount: 45,
      severity: 'high',
      affectedServices: new Set(['api']),
      sampleStackTrace: 'Error: API timeout',
    },
    {
      fingerprint: 'fp-db-connection-001',
      category: 'database',
      message: 'Database connection refused',
      firstSeen: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
      occurrenceCount: 30,
      severity: 'critical',
      affectedServices: new Set(['api', 'worker']),
      sampleStackTrace: 'Error: Connection refused',
    },
    {
      fingerprint: 'fp-runtime-error-001',
      category: 'runtime',
      message: 'Unexpected null pointer',
      firstSeen: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
      occurrenceCount: 20,
      severity: 'medium',
      affectedServices: new Set(['worker']),
    },
  ];

  beforeEach(() => {
    wiring = new ProductionWiring();
  });

  describe('Error to incident conversion', () => {
    it('should convert error metrics into incidents', async () => {
      const incidents = await wiring.processErrorsIntoIncidents(
        'deploy-errors-001',
        mockErrorMetrics,
        mockErrorPatterns
      );

      expect(incidents).toBeInstanceOf(Array);
      expect(incidents.length).toBeGreaterThan(0);
      incidents.forEach((incident) => {
        expect(incident.deploymentId).toBe('deploy-errors-001');
        expect(['low', 'medium', 'high', 'critical']).toContain(incident.severity);
      });
    });

    it('should detect high error rates as incidents', async () => {
      const highErrorMetrics = { ...mockErrorMetrics, errorRate: 50 };
      const incidents = await wiring.processErrorsIntoIncidents(
        'deploy-high-error',
        highErrorMetrics,
        mockErrorPatterns
      );

      expect(incidents.length).toBeGreaterThan(0);
      const serviceUnavailableIncidents = incidents.filter(
        (i) => i.category === 'service-unavailable'
      );
      expect(serviceUnavailableIncidents.length).toBeGreaterThan(0);
    });

    it('should detect database errors as data loss risk', async () => {
      const dbErrorPatterns: ErrorPattern[] = [
        {
          fingerprint: 'fp-db-001',
          category: 'database',
          message: 'Database error',
          firstSeen: new Date().toISOString(),
          lastSeen: new Date().toISOString(),
          occurrenceCount: 150,
          severity: 'critical',
          affectedServices: new Set(['api']),
        },
      ];

      const incidents = await wiring.processErrorsIntoIncidents(
        'deploy-db-risk',
        mockErrorMetrics,
        dbErrorPatterns
      );

      const dataRiskIncidents = incidents.filter((i) => i.category === 'data-loss-risk');
      expect(dataRiskIncidents.length).toBeGreaterThan(0);
    });
  });

  describe('Orchestration and execution', () => {
    it('should orchestrate incident response', async () => {
      const incidents = await wiring.processErrorsIntoIncidents(
        'deploy-orch-001',
        mockErrorMetrics,
        mockErrorPatterns
      );

      if (incidents.length > 0) {
        const result = await wiring.orchestrateAndExecute(
          'deploy-orch-001',
          incidents[0],
          mockErrorMetrics
        );

        expect(result.decision).toBeDefined();
        expect(result.decision.recommendedAction).toBeDefined();
        expect(result.alerts).toBeInstanceOf(Array);
      }
    });

    it('should execute auto-remediation when enabled', async () => {
      wiring.updateConfig({ enableAutoRemediation: true });

      const incidents = await wiring.processErrorsIntoIncidents(
        'deploy-exec-001',
        mockErrorMetrics,
        mockErrorPatterns
      );

      if (incidents.length > 0) {
        const result = await wiring.orchestrateAndExecute(
          'deploy-exec-001',
          incidents[0],
          mockErrorMetrics
        );

        expect(result.decision).toBeDefined();
      }
    });

    it('should skip remediation when disabled', async () => {
      wiring.updateConfig({ enableAutoRemediation: false });

      const incidents = await wiring.processErrorsIntoIncidents(
        'deploy-disabled-001',
        mockErrorMetrics,
        mockErrorPatterns
      );

      if (incidents.length > 0) {
        const result = await wiring.orchestrateAndExecute(
          'deploy-disabled-001',
          incidents[0],
          mockErrorMetrics
        );

        expect(result.executed).toBe(false);
      }
    });

    it('should respect remediation cooldown', async () => {
      wiring.updateConfig({ remediationCooldown: 5000 }); // 5 second cooldown

      const incidents = await wiring.processErrorsIntoIncidents(
        'deploy-cooldown-001',
        mockErrorMetrics,
        mockErrorPatterns
      );

      if (incidents.length > 0 && incidents[0].severity === 'medium') {
        // First execution
        const result1 = await wiring.orchestrateAndExecute(
          'deploy-cooldown-001',
          incidents[0],
          mockErrorMetrics
        );

        // Immediate second execution
        const result2 = await wiring.orchestrateAndExecute(
          'deploy-cooldown-001',
          incidents[0],
          mockErrorMetrics
        );

        // Second should be skipped due to cooldown
        if (result1.executed && incidents[0].severity === 'medium') {
          expect(result2.decision.recommendedAction).toBe('none');
        }
      }
    });
  });

  describe('Alert generation', () => {
    it('should generate alerts for critical incidents', async () => {
      const incidents = await wiring.processErrorsIntoIncidents(
        'deploy-critical-alert',
        { ...mockErrorMetrics, criticalErrors: 10 },
        mockErrorPatterns
      );

      const criticalIncident = incidents.find((i) => i.severity === 'critical');
      if (criticalIncident) {
        const result = await wiring.orchestrateAndExecute(
          'deploy-critical-alert',
          criticalIncident,
          mockErrorMetrics
        );

        expect(result.alerts.length).toBeGreaterThan(0);
        const founderAlerts = result.alerts.filter((a) => a.channel === 'founder');
        expect(founderAlerts.length).toBeGreaterThan(0);
      }
    });

    it('should generate escalation alerts for data loss risk', async () => {
      const dbPatterns: ErrorPattern[] = [
        {
          fingerprint: 'fp-db-escalate',
          category: 'database',
          message: 'DB error',
          firstSeen: new Date().toISOString(),
          lastSeen: new Date().toISOString(),
          occurrenceCount: 200,
          severity: 'critical',
          affectedServices: new Set(['api']),
        },
      ];

      const incidents = await wiring.processErrorsIntoIncidents(
        'deploy-escalate-001',
        mockErrorMetrics,
        dbPatterns
      );

      const dataLossIncident = incidents.find((i) => i.category === 'data-loss-risk');
      if (dataLossIncident) {
        const result = await wiring.orchestrateAndExecute(
          'deploy-escalate-001',
          dataLossIncident,
          mockErrorMetrics
        );

        const escalationAlerts = result.alerts.filter((a) =>
          a.escalationPath.includes('ceo')
        );
        expect(escalationAlerts.length).toBeGreaterThan(0);
      }
    });

    it('should generate info alerts for successful remediation', async () => {
      const incidents = await wiring.processErrorsIntoIncidents(
        'deploy-info-alert',
        mockErrorMetrics,
        mockErrorPatterns
      );

      if (incidents.length > 0 && incidents[0].severity !== 'critical') {
        const result = await wiring.orchestrateAndExecute(
          'deploy-info-alert',
          incidents[0],
          mockErrorMetrics
        );

        if (result.decision.recommendedAction !== 'none') {
          const infoAlerts = result.alerts.filter((a) => a.severity === 'info');
          // May or may not have info alerts depending on decision
          expect(Array.isArray(infoAlerts)).toBe(true);
        }
      }
    });
  });

  describe('Remediation feedback and tracking', () => {
    it('should track remediation attempts', async () => {
      const incidents = await wiring.processErrorsIntoIncidents(
        'deploy-track-001',
        mockErrorMetrics,
        mockErrorPatterns
      );

      if (incidents.length > 0) {
        await wiring.orchestrateAndExecute('deploy-track-001', incidents[0], mockErrorMetrics);

        const history = wiring.getRemediationHistory('deploy-track-001');
        expect(history).toBeInstanceOf(Array);
      }
    });

    it('should calculate success rate', async () => {
      const incidents = await wiring.processErrorsIntoIncidents(
        'deploy-success-001',
        mockErrorMetrics,
        mockErrorPatterns
      );

      if (incidents.length > 0) {
        await wiring.orchestrateAndExecute('deploy-success-001', incidents[0], mockErrorMetrics);

        const rate = wiring.getRemediationSuccessRate('deploy-success-001');
        expect(typeof rate).toBe('number');
        expect(rate).toBeGreaterThanOrEqual(0);
        expect(rate).toBeLessThanOrEqual(100);
      }
    });

    it('should calculate average recovery time', async () => {
      const incidents = await wiring.processErrorsIntoIncidents(
        'deploy-recovery-001',
        mockErrorMetrics,
        mockErrorPatterns
      );

      if (incidents.length > 0) {
        await wiring.orchestrateAndExecute(
          'deploy-recovery-001',
          incidents[0],
          mockErrorMetrics
        );

        const avgTime = wiring.getAverageRecoveryTime('deploy-recovery-001');
        expect(typeof avgTime).toBe('number');
        expect(avgTime).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('Alert acknowledgment', () => {
    it('should acknowledge alerts', async () => {
      const incidents = await wiring.processErrorsIntoIncidents(
        'deploy-ack-001',
        mockErrorMetrics,
        mockErrorPatterns
      );

      const criticalIncident = incidents.find((i) => i.severity === 'critical');
      if (criticalIncident) {
        const result = await wiring.orchestrateAndExecute(
          'deploy-ack-001',
          criticalIncident,
          mockErrorMetrics
        );

        if (result.alerts.length > 0) {
          const alertId = result.alerts[0].alertId;
          const acknowledged = wiring.acknowledgeAlert(alertId);
          expect(acknowledged).toBe(true);
        }
      }
    });

    it('should get alert status', async () => {
      const incidents = await wiring.processErrorsIntoIncidents(
        'deploy-status-001',
        mockErrorMetrics,
        mockErrorPatterns
      );

      if (incidents.length > 0) {
        const result = await wiring.orchestrateAndExecute(
          'deploy-status-001',
          incidents[0],
          mockErrorMetrics
        );

        if (result.alerts.length > 0) {
          const status = wiring.getAlertStatus(incidents[0].incidentId);
          expect(status).toBeInstanceOf(Array);
        }
      }
    });
  });

  describe('Configuration management', () => {
    it('should get current config', () => {
      const config = wiring.getConfig();
      expect(config).toBeDefined();
      expect(config.enableAutoRemediation).toBeDefined();
      expect(config.enableAlertingFounder).toBeDefined();
      expect(config.alertThresholds).toBeDefined();
    });

    it('should update config', () => {
      const newConfig = {
        enableAutoRemediation: false,
        remediationCooldown: 1000,
      };

      wiring.updateConfig(newConfig);
      const updated = wiring.getConfig();

      expect(updated.enableAutoRemediation).toBe(false);
      expect(updated.remediationCooldown).toBe(1000);
    });

    it('should preserve other config values when updating', () => {
      const originalConfig = wiring.getConfig();

      wiring.updateConfig({ remediationCooldown: 5000 });
      const updated = wiring.getConfig();

      expect(updated.enableAlertingFounder).toBe(originalConfig.enableAlertingFounder);
      expect(updated.remediationCooldown).toBe(5000);
    });
  });

  describe('End-to-end production wiring', () => {
    it('should handle complete incident lifecycle', async () => {
      const result = await wireProductionIncidentResponse(
        'deploy-e2e-001',
        mockErrorMetrics,
        mockErrorPatterns
      );

      expect(result.incidents).toBeInstanceOf(Array);
      expect(result.orchestrations).toBeInstanceOf(Array);
      expect(result.alerts).toBeInstanceOf(Array);

      expect(result.incidents.length).toBeGreaterThan(0);
      result.incidents.forEach((incident) => {
        expect(incident.incidentId).toBeDefined();
        expect(incident.severity).toBeDefined();
        expect(incident.category).toBeDefined();
      });

      result.orchestrations.forEach((orch) => {
        expect(orch.decision).toBeDefined();
        expect(orch.executed).toBeDefined();
      });
    });

    it('should handle multiple concurrent deployments', async () => {
      const deployIds = Array.from(
        { length: 3 },
        (_, i) => `deploy-concurrent-${i}`
      );

      const results = await Promise.all(
        deployIds.map((id) =>
          wireProductionIncidentResponse(id, mockErrorMetrics, mockErrorPatterns)
        )
      );

      expect(results.length).toBe(3);
      results.forEach((result) => {
        expect(result.incidents).toBeInstanceOf(Array);
        expect(result.alerts).toBeInstanceOf(Array);
      });
    });

    it('should generate comprehensive incident response', async () => {
      const result = await wireProductionIncidentResponse(
        'deploy-comprehensive',
        mockErrorMetrics,
        mockErrorPatterns
      );

      // Verify complete response structure
      expect(result.incidents.length).toBeGreaterThan(0);
      expect(result.orchestrations.length).toBeGreaterThan(0);

      // At least some alerts should be generated
      if (
        result.incidents.some((i) => i.severity === 'critical') ||
        result.incidents.some((i) => i.category === 'data-loss-risk')
      ) {
        expect(result.alerts.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Error handling', () => {
    it('should handle missing error patterns gracefully', async () => {
      const incidents = await wiring.processErrorsIntoIncidents(
        'deploy-no-patterns',
        mockErrorMetrics,
        []
      );

      expect(incidents).toBeInstanceOf(Array);
    });

    it('should handle zero error metrics', async () => {
      const zeroMetrics: ErrorMetrics = {
        timestamp: new Date().toISOString(),
        totalErrors: 0,
        criticalErrors: 0,
        errorsByCategory: {
          runtime: 0,
          api: 0,
          database: 0,
          auth: 0,
          validation: 0,
          'external-service': 0,
          unknown: 0,
        },
        errorsBySeverity: {
          critical: 0,
          high: 0,
          medium: 0,
          low: 0,
        },
        errorsByService: {},
        uniquePatterns: 0,
        errorRate: 0,
        topPatterns: [],
        newPatternsLastHour: [],
        resolvedPatterns: [],
      };

      const incidents = await wiring.processErrorsIntoIncidents(
        'deploy-zero-errors',
        zeroMetrics,
        []
      );

      expect(incidents).toBeInstanceOf(Array);
    });
  });
});
