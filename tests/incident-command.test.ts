import { describe, it, expect, beforeEach } from 'vitest';
import {
  createIncident,
  recordIncidentAction,
  markAutoRecoveryAttempted,
  escalateIncident,
  resolveIncident,
  getIncident,
  getActiveIncidents,
  getIncidentsByStatus,
  generateIncidentStats,
  generateIncidentReport,
  formatIncidentReport,
  resetIncidentCommand,
  type IncidentEntry,
} from '@/lib/incident-command';

describe('Incident Command Center', () => {
  beforeEach(() => {
    resetIncidentCommand();
  });

  describe('createIncident', () => {
    it('should create a new critical incident', () => {
      const incident = createIncident({
        category: 'deployment',
        severity: 'critical',
        title: 'Deployment Failed - High Error Rate',
        description: 'Error rate spiked to 15% after deploy-123',
        detectedBy: 'DNS-012',
        affectedServices: ['api', 'web'],
        affectedUsers: 5000,
        customerImpact: 'Users unable to complete transactions',
        relatedAlertIds: ['alert-1', 'alert-2'],
      });

      expect(incident.id).toBeDefined();
      expect(incident.severity).toBe('critical');
      expect(incident.status).toBe('open');
      expect(incident.affectedUsers).toBe(5000);
      expect(incident.actions).toHaveLength(0);
    });

    it('should merge duplicate incidents', () => {
      const incident1 = createIncident({
        category: 'database',
        severity: 'warning',
        title: 'Database Connection Pool Exhausted',
        description: 'Connection pool at 95% capacity',
        detectedBy: 'DNS-002',
        affectedServices: ['database'],
        affectedUsers: 2000,
        customerImpact: 'Slow database queries',
        relatedAlertIds: ['alert-1'],
      });

      const incident2 = createIncident({
        category: 'database',
        severity: 'warning',
        title: 'Database Connection Pool Exhausted',
        description: 'Connection pool still high',
        detectedBy: 'DNS-002',
        affectedServices: ['database'],
        affectedUsers: 1000,
        customerImpact: 'Slow database queries',
        relatedAlertIds: ['alert-2'],
      });

      expect(incident1.id).toBe(incident2.id);
      expect(incident1.affectedUsers).toBe(3000);
    });

    it('should include all incident fields', () => {
      const incident = createIncident({
        category: 'security',
        severity: 'critical',
        title: 'Vulnerability Detected - CVE-2024-1234',
        description: 'Critical vulnerability in dependency',
        detectedBy: 'DNS-008',
        affectedServices: ['api'],
        affectedUsers: 10000,
        customerImpact: 'Potential data breach',
        relatedAlertIds: ['alert-1'],
      });

      expect(incident.category).toBe('security');
      expect(incident.detectedBy).toBe('DNS-008');
      expect(incident.affectedServices).toContain('api');
      expect(incident.relatedAlertIds).toContain('alert-1');
    });
  });

  describe('recordIncidentAction', () => {
    it('should record action on incident', () => {
      const incident = createIncident({
        category: 'deployment',
        severity: 'critical',
        title: 'Deployment Failed',
        description: 'Error rate high',
        detectedBy: 'DNS-012',
        affectedServices: ['api'],
        affectedUsers: 5000,
        customerImpact: 'Users affected',
      });

      const updated = recordIncidentAction(incident.id, {
        actor: 'governor-autonomous',
        action: 'rollback-initiated',
        status: 'in-progress',
      });

      expect(updated?.actions).toHaveLength(1);
      expect(updated?.actions[0].action).toBe('rollback-initiated');
      expect(updated?.status).toBe('remediating');
    });

    it('should record multiple actions', () => {
      const incident = createIncident({
        category: 'deployment',
        severity: 'critical',
        title: 'Deployment Failed',
        description: 'Error rate high',
        detectedBy: 'DNS-012',
        affectedServices: ['api'],
        affectedUsers: 5000,
        customerImpact: 'Users affected',
      });

      recordIncidentAction(incident.id, {
        actor: 'governor-autonomous',
        action: 'investigation-started',
        status: 'in-progress',
      });

      recordIncidentAction(incident.id, {
        actor: 'governor-autonomous',
        action: 'rollback-initiated',
        status: 'in-progress',
      });

      const updated = getIncident(incident.id);
      expect(updated?.actions).toHaveLength(2);
    });

    it('should update status based on action type', () => {
      const incident = createIncident({
        category: 'database',
        severity: 'warning',
        title: 'Database Issue',
        description: 'Performance degradation',
        detectedBy: 'DNS-002',
        affectedServices: ['database'],
        affectedUsers: 1000,
        customerImpact: 'Slow queries',
      });

      recordIncidentAction(incident.id, {
        actor: 'governor-autonomous',
        action: 'investigation-started',
        status: 'in-progress',
      });

      const updated = getIncident(incident.id);
      expect(updated?.status).toBe('investigating');
    });
  });

  describe('markAutoRecoveryAttempted', () => {
    it('should mark auto-recovery attempted', () => {
      const incident = createIncident({
        category: 'deployment',
        severity: 'critical',
        title: 'Deployment Failed',
        description: 'Error rate high',
        detectedBy: 'DNS-012',
        affectedServices: ['api'],
        affectedUsers: 5000,
        customerImpact: 'Users affected',
      });

      const updated = markAutoRecoveryAttempted(incident.id);

      expect(updated?.autoRecoveryAttempted).toBe(true);
      expect(updated?.actions.length).toBeGreaterThan(0);
    });
  });

  describe('escalateIncident', () => {
    it('should escalate incident to founder', () => {
      const incident = createIncident({
        category: 'database',
        severity: 'critical',
        title: 'Database Failure',
        description: 'Database unreachable',
        detectedBy: 'DNS-002',
        affectedServices: ['database'],
        affectedUsers: 10000,
        customerImpact: 'Complete service outage',
      });

      const escalated = escalateIncident(incident.id, 'Auto-recovery failed, manual intervention required');

      expect(escalated?.status).toBe('escalated');
      expect(escalated?.actions.some((a) => a.action === 'escalation-triggered')).toBe(true);
    });
  });

  describe('resolveIncident', () => {
    it('should resolve incident', () => {
      const incident = createIncident({
        category: 'deployment',
        severity: 'critical',
        title: 'Deployment Failed',
        description: 'Error rate high',
        detectedBy: 'DNS-012',
        affectedServices: ['api'],
        affectedUsers: 5000,
        customerImpact: 'Users affected',
      });

      recordIncidentAction(incident.id, {
        actor: 'governor-autonomous',
        action: 'rollback-completed',
        status: 'completed',
        result: 'Successfully rolled back to previous version',
      });

      const resolved = resolveIncident(incident.id, 'Rolled back deployment to previous stable version');

      expect(resolved?.status).toBe('resolved');
      expect(resolved?.resolvedAt).toBeDefined();
      expect(resolved?.resolution).toBe('Rolled back deployment to previous stable version');
    });

    it('should remove resolved incident from active list', () => {
      const incident = createIncident({
        category: 'deployment',
        severity: 'warning',
        title: 'High Latency',
        description: 'Elevated response times',
        detectedBy: 'DNS-009',
        affectedServices: ['api'],
        affectedUsers: 2000,
        customerImpact: 'Slow user experience',
      });

      const activeBeforeResolve = getActiveIncidents().length;

      resolveIncident(incident.id, 'Latency returned to normal');

      const activeAfterResolve = getActiveIncidents().length;

      expect(activeAfterResolve).toBe(activeBeforeResolve - 1);
      expect(getIncident(incident.id)).toBeUndefined();
    });
  });

  describe('getActiveIncidents', () => {
    it('should return all active incidents sorted by severity', () => {
      createIncident({
        category: 'database',
        severity: 'info',
        title: 'Informational Alert',
        description: 'Minor issue',
        detectedBy: 'DNS-002',
        affectedServices: ['database'],
        affectedUsers: 100,
        customerImpact: 'None',
      });

      createIncident({
        category: 'deployment',
        severity: 'critical',
        title: 'Critical Deployment',
        description: 'Critical issue',
        detectedBy: 'DNS-012',
        affectedServices: ['api'],
        affectedUsers: 5000,
        customerImpact: 'Service down',
      });

      const incidents = getActiveIncidents();

      expect(incidents.length).toBe(2);
      expect(incidents[0].severity).toBe('critical');
      expect(incidents[1].severity).toBe('info');
    });
  });

  describe('getIncidentsByStatus', () => {
    it('should return incidents by status', () => {
      const incident1 = createIncident({
        category: 'deployment',
        severity: 'critical',
        title: 'Deployment Failed',
        description: 'Error rate high',
        detectedBy: 'DNS-012',
        affectedServices: ['api'],
        affectedUsers: 5000,
        customerImpact: 'Users affected',
      });

      const incident2 = createIncident({
        category: 'database',
        severity: 'warning',
        title: 'Database Issue',
        description: 'Performance degradation',
        detectedBy: 'DNS-002',
        affectedServices: ['database'],
        affectedUsers: 1000,
        customerImpact: 'Slow queries',
      });

      recordIncidentAction(incident1.id, {
        actor: 'governor-autonomous',
        action: 'rollback-initiated',
        status: 'in-progress',
      });

      const remediating = getIncidentsByStatus('remediating');
      const open = getIncidentsByStatus('open');

      expect(remediating.length).toBe(1);
      expect(open.length).toBe(1);
    });
  });

  describe('generateIncidentStats', () => {
    it('should calculate incident statistics', () => {
      createIncident({
        category: 'deployment',
        severity: 'critical',
        title: 'Critical Deployment',
        description: 'Critical issue',
        detectedBy: 'DNS-012',
        affectedServices: ['api'],
        affectedUsers: 5000,
        customerImpact: 'Service down',
      });

      createIncident({
        category: 'database',
        severity: 'warning',
        title: 'Warning Issue',
        description: 'Warning level',
        detectedBy: 'DNS-002',
        affectedServices: ['database'],
        affectedUsers: 1000,
        customerImpact: 'Slow queries',
      });

      const stats = generateIncidentStats();

      expect(stats.totalIncidents).toBe(2);
      expect(stats.criticalCount).toBe(1);
      expect(stats.warningCount).toBe(1);
      expect(stats.openIncidents).toBe(2);
    });
  });

  describe('generateIncidentReport', () => {
    it('should generate complete incident report', () => {
      createIncident({
        category: 'deployment',
        severity: 'critical',
        title: 'Deployment Failed',
        description: 'Error rate high',
        detectedBy: 'DNS-012',
        affectedServices: ['api'],
        affectedUsers: 5000,
        customerImpact: 'Users affected',
      });

      const report = generateIncidentReport();

      expect(report.timestamp).toBeDefined();
      expect(report.statistics).toBeDefined();
      expect(report.activeIncidents.length).toBe(1);
    });
  });

  describe('formatIncidentReport', () => {
    it('should format report as markdown', () => {
      createIncident({
        category: 'deployment',
        severity: 'critical',
        title: 'Deployment Failed',
        description: 'Error rate high',
        detectedBy: 'DNS-012',
        affectedServices: ['api'],
        affectedUsers: 5000,
        customerImpact: 'Users affected',
      });

      const report = generateIncidentReport();
      const formatted = formatIncidentReport(report);

      expect(formatted).toContain('# Incident Command Center Report');
      expect(formatted).toContain('Summary');
      expect(formatted).toContain('Active Incidents');
      expect(formatted).toContain('Deployment Failed');
    });
  });

  describe('integration: full incident lifecycle', () => {
    it('should track complete incident lifecycle', () => {
      // Create incident
      const incident = createIncident({
        category: 'deployment',
        severity: 'critical',
        title: 'Deployment Failed - Error Rate Spike',
        description: 'Error rate spiked to 15% after deploy-123',
        detectedBy: 'DNS-012',
        affectedServices: ['api'],
        affectedUsers: 5000,
        customerImpact: 'Users unable to complete transactions',
        relatedAlertIds: ['alert-1', 'alert-2'],
      });

      expect(incident.status).toBe('open');

      // Mark auto-recovery attempted
      markAutoRecoveryAttempted(incident.id);

      // Record remediation action
      recordIncidentAction(incident.id, {
        actor: 'governor-autonomous',
        action: 'rollback-initiated',
        status: 'in-progress',
      });

      let updated = getIncident(incident.id);
      expect(updated?.status).toBe('remediating');

      // Record completion
      recordIncidentAction(incident.id, {
        actor: 'governor-autonomous',
        action: 'rollback-completed',
        status: 'completed',
        result: 'Successfully rolled back to deploy-122',
      });

      // Resolve incident
      updated = resolveIncident(incident.id, 'Rolled back to previous stable version, error rate restored');

      expect(updated?.status).toBe('resolved');
      expect(updated?.resolvedAt).toBeDefined();
      expect(updated?.actions.length).toBeGreaterThan(1);
    });
  });
});
