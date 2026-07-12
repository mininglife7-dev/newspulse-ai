import { describe, it, expect, beforeEach } from 'vitest';
import {
  getProductionMetrics,
  resetProductionMetrics,
  ProductionMetrics,
  type IncidentMetrics,
  type MetricsSnapshot,
} from '../lib/production-monitoring';

describe('Production Monitoring Module', () => {
  beforeEach(() => {
    resetProductionMetrics();
  });

  describe('Incident Detection Recording', () => {
    it('should record incident detection', () => {
      const metrics = getProductionMetrics();
      const now = new Date().toISOString();

      metrics.recordDetection('incident-001', now);

      const incident = metrics.getIncident('incident-001');
      expect(incident).toBeDefined();
      expect(incident?.incidentId).toBe('incident-001');
      expect(incident?.detectedAt).toBe(now);
      expect(incident?.detectionDurationMs).toBeGreaterThanOrEqual(0);
    });

    it('should track multiple incidents', () => {
      const metrics = getProductionMetrics();
      const now = new Date().toISOString();

      metrics.recordDetection('incident-001', now);
      metrics.recordDetection('incident-002', now);
      metrics.recordDetection('incident-003', now);

      expect(metrics.getAllIncidents().length).toBe(3);
    });
  });

  describe('Incident Lifecycle', () => {
    it('should track full incident lifecycle', () => {
      const metrics = getProductionMetrics();
      const now = new Date().toISOString();
      const later = new Date(Date.now() + 5000).toISOString();
      const resolved = new Date(Date.now() + 30000).toISOString();

      metrics.recordDetection('incident-001', now);
      metrics.recordOrchestration('incident-001', later);
      metrics.recordRemediation('incident-001', later);
      metrics.recordRecovery('incident-001', resolved);

      const incident = metrics.getIncident('incident-001');
      expect(incident?.success).toBe(true);
      expect(incident?.recoveryDurationMs).toBeGreaterThan(0);
    });

    it('should mark failed recoveries', () => {
      const metrics = getProductionMetrics();
      const now = new Date().toISOString();

      metrics.recordDetection('incident-001', now);
      metrics.recordRecoveryFailure('incident-001');

      const incident = metrics.getIncident('incident-001');
      expect(incident?.success).toBe(false);
    });
  });

  describe('Alert Tracking', () => {
    it('should count alert deliveries', () => {
      const metrics = getProductionMetrics();
      const now = new Date().toISOString();

      metrics.recordDetection('incident-001', now);
      metrics.recordAlertDelivery('incident-001');
      metrics.recordAlertDelivery('incident-001');

      const incident = metrics.getIncident('incident-001');
      expect(incident?.alertsSent).toBe(2);
    });
  });

  describe('GitHub Issue Tracking', () => {
    it('should record GitHub issue creation', () => {
      const metrics = getProductionMetrics();
      const now = new Date().toISOString();

      metrics.recordDetection('incident-001', now);
      metrics.recordGitHubIssue('incident-001');

      const incident = metrics.getIncident('incident-001');
      expect(incident?.gitHubIssueCreated).toBe(true);
    });
  });

  describe('False Positive Tracking', () => {
    it('should mark false positives', () => {
      const metrics = getProductionMetrics();
      const now = new Date().toISOString();

      metrics.recordDetection('incident-001', now);
      metrics.recordFalsePositive('incident-001');

      const incident = metrics.getIncident('incident-001');
      expect(incident?.falsePositive).toBe(true);
    });
  });

  describe('Metrics Snapshot', () => {
    it('should calculate average MTTD', () => {
      const metrics = getProductionMetrics();
      const now = new Date().toISOString();

      metrics.recordDetection('incident-001', now);
      metrics.recordDetection('incident-002', now);

      const snapshot = metrics.getSnapshot();
      expect(snapshot.incidentCount).toBe(2);
      expect(snapshot.avgMTTD).toBeGreaterThanOrEqual(0);
    });

    it('should calculate average MTTR', () => {
      const metrics = getProductionMetrics();
      const now = new Date().toISOString();
      const resolved = new Date(Date.now() + 50000).toISOString();

      metrics.recordDetection('incident-001', now);
      metrics.recordRemediation('incident-001', now);
      metrics.recordRecovery('incident-001', resolved);

      const snapshot = metrics.getSnapshot();
      expect(snapshot.avgMTTR).toBeGreaterThan(0);
    });

    it('should calculate alert delivery rate', () => {
      const metrics = getProductionMetrics();
      const now = new Date().toISOString();

      metrics.recordDetection('incident-001', now);
      metrics.recordAlertDelivery('incident-001');

      metrics.recordDetection('incident-002', now);
      // No alert for incident-002

      const snapshot = metrics.getSnapshot();
      expect(snapshot.alertDeliveryRate).toBe(0.5);
    });

    it('should calculate false positive rate', () => {
      const metrics = getProductionMetrics();
      const now = new Date().toISOString();

      metrics.recordDetection('incident-001', now);
      metrics.recordFalsePositive('incident-001');

      metrics.recordDetection('incident-002', now);
      metrics.recordDetection('incident-003', now);

      const snapshot = metrics.getSnapshot();
      expect(snapshot.falsePositiveRate).toBeCloseTo(0.333, 2);
    });

    it('should calculate success rate', () => {
      const metrics = getProductionMetrics();
      const now = new Date().toISOString();
      const resolved = new Date(Date.now() + 30000).toISOString();

      metrics.recordDetection('incident-001', now);
      metrics.recordRemediation('incident-001', now);
      metrics.recordRecovery('incident-001', resolved);

      metrics.recordDetection('incident-002', now);
      metrics.recordRecoveryFailure('incident-002');

      const snapshot = metrics.getSnapshot();
      expect(snapshot.orchestrationSuccessRate).toBe(0.5);
    });

    it('should track GitHub issue count', () => {
      const metrics = getProductionMetrics();
      const now = new Date().toISOString();

      metrics.recordDetection('incident-001', now);
      metrics.recordGitHubIssue('incident-001');

      metrics.recordDetection('incident-002', now);
      metrics.recordGitHubIssue('incident-002');

      metrics.recordDetection('incident-003', now);

      const snapshot = metrics.getSnapshot();
      expect(snapshot.gitHubIssuesCreated).toBe(2);
    });
  });

  describe('SLA Compliance', () => {
    it('should report SLA compliant when metrics meet targets', () => {
      const metrics = getProductionMetrics();
      const now = new Date().toISOString();
      const resolved = new Date(Date.now() + 20000).toISOString(); // 20s recovery

      metrics.recordDetection('incident-001', now);
      metrics.recordRemediation('incident-001', now);
      metrics.recordRecovery('incident-001', resolved);

      const sla = metrics.getSLACompliance(30000, 120000); // 30s MTTD, 120s MTTR targets
      expect(sla.mttdCompliant).toBe(true);
      expect(sla.mttrCompliant).toBe(true);
      expect(sla.overallCompliant).toBe(true);
    });

    it('should report SLA non-compliant when metrics exceed targets', () => {
      const metrics = getProductionMetrics();
      const now = new Date().toISOString();
      const resolved = new Date(Date.now() + 200000).toISOString(); // 200s recovery

      metrics.recordDetection('incident-001', now);
      metrics.recordRemediation('incident-001', now);
      metrics.recordRecovery('incident-001', resolved);

      const sla = metrics.getSLACompliance(30000, 120000);
      expect(sla.mttrCompliant).toBe(false);
      expect(sla.overallCompliant).toBe(false);
    });
  });

  describe('Time Window Queries', () => {
    it('should retrieve incidents from last N minutes', () => {
      const metrics = getProductionMetrics();
      const now = new Date().toISOString();
      const earlier = new Date(Date.now() - 5 * 60 * 1000).toISOString(); // 5 minutes ago

      metrics.recordDetection('incident-recent', now);
      // Can't easily test older incidents without mocking Date

      const recent = metrics.getIncidentsSince(1); // Last 1 minute
      expect(recent.length).toBeGreaterThan(0);
    });
  });

  describe('Report Generation', () => {
    it('should generate text report', () => {
      const metrics = getProductionMetrics();
      const now = new Date().toISOString();

      metrics.recordDetection('incident-001', now);
      metrics.recordAlertDelivery('incident-001');
      metrics.recordGitHubIssue('incident-001');

      const report = metrics.generateReport();
      expect(report).toContain('PRODUCTION INCIDENT RESPONSE METRICS');
      expect(report).toContain('Total Incidents: 1');
      expect(report).toContain('Success Rate');
      expect(report).toContain('MTTD');
      expect(report).toContain('MTTR');
    });
  });

  describe('JSON Export', () => {
    it('should export metrics as JSON', () => {
      const metrics = getProductionMetrics();
      const now = new Date().toISOString();

      metrics.recordDetection('incident-001', now);
      metrics.recordAlertDelivery('incident-001');

      const json = metrics.toJSON();
      expect(json.snapshot).toBeDefined();
      expect(json.incidents).toBeDefined();
      expect(json.sla).toBeDefined();
      expect(json.incidents.length).toBe(1);
    });
  });

  describe('Singleton Pattern', () => {
    it('should maintain state across multiple calls', () => {
      const metrics1 = getProductionMetrics();
      const now = new Date().toISOString();
      metrics1.recordDetection('incident-001', now);

      const metrics2 = getProductionMetrics();
      expect(metrics2.getAllIncidents().length).toBe(1);

      const incident = metrics2.getIncident('incident-001');
      expect(incident).toBeDefined();
    });

    it('should reset when requested', () => {
      const metrics = getProductionMetrics();
      const now = new Date().toISOString();
      metrics.recordDetection('incident-001', now);

      resetProductionMetrics();

      const fresh = getProductionMetrics();
      expect(fresh.getAllIncidents().length).toBe(0);
    });
  });
});
