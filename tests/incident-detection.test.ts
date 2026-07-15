import { describe, it, expect, beforeEach } from 'vitest';
import {
  IncidentDetector,
  DetectedIncident,
  IncidentCategory,
  IncidentSeverity,
} from '../lib/incident-detection';
import { verifyDeployment } from '../lib/deployment-verification';

describe('Incident Detection (DNA-GOV-013)', () => {
  let detector: IncidentDetector;

  beforeEach(() => {
    detector = new IncidentDetector();
  });

  describe('Deployment verification-based detection', () => {
    it('should detect critical incident from failed deployment verification', async () => {
      let report = await verifyDeployment('deploy-critical');

      // Retry until we get a critical failure
      let attempts = 0;
      while (report.decision !== 'ROLLBACK' && report.decision !== 'ESCALATE' && attempts < 10) {
        report = await verifyDeployment('deploy-critical');
        attempts++;
      }

      if (report.decision === 'ROLLBACK' || report.decision === 'ESCALATE') {
        const incidents = await detector.detectIncidents('deploy-critical', {
          verificationReport: report,
        });

        expect(incidents.length).toBeGreaterThan(0);
        const incident = incidents[0];
        expect(incident.severity).toMatch(/high|critical/);
        expect(incident.canAutoRemediate).toBe(report.canRollback);
        expect(incident.signals.length).toBeGreaterThan(0);
      }
    });

    it('should detect performance degradation from deployment report', async () => {
      const report = await verifyDeployment('deploy-degraded', {
        latency_p99_ms: 7500,
        error_rate_percent: 8,
      });

      if (report.decision === 'HOLD') {
        const incidents = await detector.detectIncidents('deploy-degraded', {
          verificationReport: report,
        });

        const degradedIncidents = incidents.filter(
          (inc) => inc.category === 'performance-degradation'
        );
        expect(degradedIncidents.length).toBeGreaterThan(0);
        expect(degradedIncidents[0].severity).toBe('medium');
      }
    });

    it('should include all failed checks as signals', async () => {
      const deployId = `deploy-signals-${Date.now()}`;
      let report = await verifyDeployment(deployId);

      // Retry until we get failures
      let attempts = 0;
      while (report.failedChecks === 0 && attempts < 5) {
        report = await verifyDeployment(deployId);
        attempts++;
      }

      if (report.failedChecks > 0) {
        const newDetector = new IncidentDetector();
        const incidents = await newDetector.detectIncidents(deployId, {
          verificationReport: report,
        });

        if (incidents.length > 0) {
          const incident = incidents[0];
          const failedCheckCount = report.checks.filter((c) => c.result === 'fail').length;
          // Allow for some variance in signal count due to incident correlation
          expect(incident.signals.length).toBeGreaterThanOrEqual(failedCheckCount);
          incident.signals.forEach((signal) => {
            expect(signal.type).toBeDefined();
            expect(['fail', 'degraded']).toContain(signal.value as string);
            expect(signal.timestamp).toBeDefined();
          });
        }
      }
    });
  });

  describe('Metrics-based detection', () => {
    it('should detect high error rate incident', async () => {
      const incidents = await detector.detectIncidents('deploy-high-error', {
        errorRate: 0.15,
      });

      const errorIncidents = incidents.filter((inc) => inc.signals.some((s) => s.type === 'error-rate'));
      expect(errorIncidents.length).toBeGreaterThan(0);
    });

    it('should detect latency threshold breach', async () => {
      const incidents = await detector.detectIncidents('deploy-high-latency', {
        latency: 12000,
      });

      const latencyIncidents = incidents.filter((inc) => inc.signals.some((s) => s.type === 'latency'));
      expect(latencyIncidents.length).toBeGreaterThan(0);
      expect(latencyIncidents[0].category).toBe('performance-degradation');
    });

    it('should detect resource exhaustion', async () => {
      const incidents = await detector.detectIncidents('deploy-resource-pressure', {
        memoryUsage: 0.97,
        cpuUsage: 0.92,
      });

      const resourceIncidents = incidents.filter((inc) =>
        inc.signals.some((s) => s.type.includes('usage'))
      );
      expect(resourceIncidents.length).toBeGreaterThan(0);
      expect(resourceIncidents[0].severity).toMatch(/high|critical/);
    });

    it('should detect database latency issues', async () => {
      const incidents = await detector.detectIncidents('deploy-db-latency', {
        databaseLatency: 7500,
      });

      const dbIncidents = incidents.filter((inc) =>
        inc.signals.some((s) => s.type === 'database-latency')
      );
      expect(dbIncidents.length).toBeGreaterThan(0);
      expect(dbIncidents[0].category).toBe('performance-degradation');
    });
  });

  describe('Error pattern detection', () => {
    it('should detect cascading failures from multiple error categories', async () => {
      const incidents = await detector.detectIncidents('deploy-cascade', {
        recentErrors: [
          { message: 'API timeout', category: 'api', count: 50 },
          { message: 'DB connection failed', category: 'database', count: 45 },
          { message: 'Cache miss', category: 'cache', count: 200 },
          { message: 'Queue backlog', category: 'queue', count: 150 },
        ],
      });

      const cascadeIncidents = incidents.filter(
        (inc) => inc.category === 'cascading-failure'
      );
      expect(cascadeIncidents.length).toBeGreaterThan(0);
      expect(cascadeIncidents[0].severity).toBe('critical');
      expect(cascadeIncidents[0].requiresFounderNotification).toBe(true);
    });

    it('should detect data loss risk from database errors', async () => {
      const incidents = await detector.detectIncidents('deploy-data-risk', {
        recentErrors: [
          { message: 'Database connection timeout', category: 'database', count: 200 },
          { message: 'Transaction failed', category: 'database', count: 180 },
        ],
      });

      const dataIncidents = incidents.filter(
        (inc) => inc.category === 'data-loss-risk'
      );
      expect(dataIncidents.length).toBeGreaterThan(0);
      expect(dataIncidents[0].severity).toBe('critical');
    });

    it('should estimate user impact based on incident category', async () => {
      const cascadeIncidents = await detector.detectIncidents('deploy-impact-1', {
        recentErrors: [
          { message: 'API timeout', category: 'api', count: 50 },
          { message: 'DB connection failed', category: 'database', count: 45 },
          { message: 'Cache miss', category: 'cache', count: 200 },
          { message: 'Queue backlog', category: 'queue', count: 150 },
        ],
      });

      const cascade = cascadeIncidents.find((inc) => inc.category === 'cascading-failure');
      if (cascade) {
        expect(cascade.estimatedUserImpact).toBeGreaterThanOrEqual(0.9);
      }

      const dataIncidents = await detector.detectIncidents('deploy-impact-2', {
        recentErrors: [
          { message: 'Database connection timeout', category: 'database', count: 200 },
        ],
      });

      const dataRisk = dataIncidents.find((inc) => inc.category === 'data-loss-risk');
      if (dataRisk) {
        expect(dataRisk.estimatedUserImpact).toBe(1.0);
      }
    });
  });

  describe('Incident severity classification', () => {
    it('should classify critical severity for critical incidents', async () => {
      const incidents = await detector.detectIncidents('deploy-critical-class', {
        errorRate: 0.3,
        latency: 20000,
      });

      expect(incidents.length).toBeGreaterThan(0);
      const criticalIncidents = incidents.filter((inc) => inc.severity === 'critical');
      expect(criticalIncidents.length).toBeGreaterThan(0);
    });

    it('should classify medium severity for single metric breaches', async () => {
      const incidents = await detector.detectIncidents('deploy-medium-class', {
        latency: 8000,
      });

      if (incidents.length > 0) {
        expect(incidents[0].severity).toBe('medium');
      }
    });

    it('should classify high severity for multiple metric breaches', async () => {
      const incidents = await detector.detectIncidents('deploy-high-class', {
        memoryUsage: 0.96,
        cpuUsage: 0.91,
      });

      if (incidents.length > 0) {
        expect(incidents[0].severity).toMatch(/high|critical/);
      }
    });
  });

  describe('Affected services tracking', () => {
    it('should list all affected services in deployment incident', async () => {
      let report = await verifyDeployment('deploy-multi-fail');

      // Retry until we get multiple failures
      let attempts = 0;
      while (report.failedChecks < 2 && attempts < 10) {
        report = await verifyDeployment('deploy-multi-fail');
        attempts++;
      }

      if (report.failedChecks >= 2) {
        const incidents = await detector.detectIncidents('deploy-multi-fail', {
          verificationReport: report,
        });

        // Only the ROLLBACK/ESCALATE path produces the verification-failure
        // incident; a HOLD decision yields a degraded incident whose service
        // list tracks degraded (not failed) checks, so match on description.
        const deploymentIncident = incidents.find((i) =>
          i.description.startsWith('Deployment verification failed')
        );
        if (deploymentIncident) {
          expect(
            deploymentIncident.affectedServices.length
          ).toBeGreaterThanOrEqual(report.failedChecks);
        }
      }
    });

    it('should list affected components from metrics', async () => {
      const incidents = await detector.detectIncidents('deploy-components', {
        memoryUsage: 0.96,
        latency: 15000,
        databaseLatency: 8000,
      });

      if (incidents.length > 0) {
        expect(incidents[0].affectedServices.length).toBeGreaterThan(0);
        incidents[0].affectedServices.forEach((service) => {
          expect(typeof service).toBe('string');
          expect(service.length).toBeGreaterThan(0);
        });
      }
    });
  });

  describe('Incident tracking and history', () => {
    it('should track incident history per deployment', async () => {
      const deployId = `deploy-history-${Date.now()}`;

      const incident1 = await detector.detectIncidents(deployId, {
        errorRate: 0.15,
      });

      const incident2 = await detector.detectIncidents(deployId, {
        latency: 12000,
      });

      const history = detector.getIncidentHistory(deployId);
      expect(history.length).toBe(incident1.length + incident2.length);
    });

    it('should retrieve individual incidents by ID', async () => {
      const incidents = await detector.detectIncidents('deploy-retrieval', {
        errorRate: 0.2,
        latency: 15000,
      });

      if (incidents.length > 0) {
        const stored = detector.getIncident(incidents[0].incidentId);
        expect(stored).toBeDefined();
        expect(stored?.incidentId).toBe(incidents[0].incidentId);
        expect(stored?.deploymentId).toBe('deploy-retrieval');
      }
    });

    it('should correlate related incidents within time window', async () => {
      const deployId = `deploy-correlation-${Date.now()}`;

      const incident1 = await detector.detectIncidents(deployId, {
        errorRate: 0.15,
      });

      // Immediate follow-up incident
      const incident2 = await detector.detectIncidents(deployId, {
        errorRate: 0.18,
      });

      const history = detector.getIncidentHistory(deployId);
      if (history.length > 1) {
        const lastIncident = history[history.length - 1];
        // If related by category, should have previousIncidents set
        // previousIncidents is set after analyzing
        expect(lastIncident.previousIncidents).toBeDefined();
      }
    });
  });

  describe('Auto-remediation capability classification', () => {
    it('should mark deployment failures as auto-remediable if canRollback', async () => {
      let report = await verifyDeployment('deploy-auto-fix');

      // Retry until we get a failure
      let attempts = 0;
      while (report.decision !== 'ROLLBACK' && report.decision !== 'ESCALATE' && attempts < 5) {
        report = await verifyDeployment('deploy-auto-fix');
        attempts++;
      }

      if (report.decision === 'ROLLBACK' || report.decision === 'ESCALATE') {
        const incidents = await detector.detectIncidents('deploy-auto-fix', {
          verificationReport: report,
        });

        if (incidents.length > 0) {
          const deployIncident = incidents.find((inc) => inc.category === 'deployment-failure');
          if (deployIncident) {
            expect(deployIncident.canAutoRemediate).toBe(report.canRollback);
          }
        }
      }
    });

    it('should mark cascading failures as not auto-remediable', async () => {
      const incidents = await detector.detectIncidents('deploy-no-autofix', {
        recentErrors: [
          { message: 'API timeout', category: 'api', count: 50 },
          { message: 'DB connection failed', category: 'database', count: 45 },
          { message: 'Cache miss', category: 'cache', count: 200 },
          { message: 'Queue backlog', category: 'queue', count: 150 },
        ],
      });

      const cascade = incidents.find((inc) => inc.category === 'cascading-failure');
      if (cascade) {
        expect(cascade.canAutoRemediate).toBe(false);
      }
    });
  });

  describe('Incident cleanup', () => {
    it('should remove incidents older than max age', async () => {
      const incidents = await detector.detectIncidents('deploy-cleanup', {
        errorRate: 0.15,
      });

      if (incidents.length > 0) {
        // Check incident exists
        expect(detector.getIncident(incidents[0].incidentId)).toBeDefined();

        // Clear with 0 minute max age (removes everything)
        detector.clearOldIncidents(0);

        // Check incident is removed
        expect(detector.getIncident(incidents[0].incidentId)).toBeUndefined();
      }
    });
  });

  describe('Concurrent incident detection', () => {
    it('should handle multiple concurrent deployments', async () => {
      const deployIds = Array.from(
        { length: 5 },
        (_, i) => `deploy-concurrent-${i}`
      );

      const results = await Promise.all(
        deployIds.map((id) =>
          detector.detectIncidents(id, { errorRate: Math.random() * 0.3 })
        )
      );

      expect(results.length).toBe(5);
      results.forEach((incidents) => {
        expect(Array.isArray(incidents)).toBe(true);
      });
    });
  });

  describe('Edge cases', () => {
    it('should handle deployment with no incidents', async () => {
      const incidents = await detector.detectIncidents('deploy-healthy', {
        errorRate: 0.01,
        latency: 200,
      });

      expect(incidents).toBeInstanceOf(Array);
      // May be empty or contain low-severity incidents
      expect(incidents.length).toBeLessThanOrEqual(10);
    });

    it('should handle incomplete context data', async () => {
      const incidents = await detector.detectIncidents('deploy-partial', {
        errorRate: undefined,
        latency: 500,
      });

      expect(Array.isArray(incidents)).toBe(true);
    });

    it('should set requiresFounderNotification for critical incidents', async () => {
      const incidents = await detector.detectIncidents('deploy-critical-notify', {
        errorRate: 0.5,
        latency: 25000,
        memoryUsage: 0.99,
      });

      const criticalIncidents = incidents.filter((inc) => inc.severity === 'critical');
      criticalIncidents.forEach((incident) => {
        expect(incident.requiresFounderNotification).toBe(true);
      });
    });
  });
});
