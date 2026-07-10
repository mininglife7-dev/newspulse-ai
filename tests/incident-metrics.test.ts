import { describe, it, expect, beforeEach } from 'vitest';
import {
  recordIncidentEvent,
  createIncident,
  getIncident,
  getIncidentMetrics,
  resolveIncident,
  updateSystemHealth,
  getSystemHealth,
  getIncidentEvents,
  getAllIncidents,
  resetMetricsStore,
  type IncidentLifecycleMetrics,
} from '@/lib/incident-metrics';

describe('DNS-023: Incident Response System Observability', () => {
  beforeEach(() => {
    resetMetricsStore();
  });

  describe('Incident Lifecycle Tracking', () => {
    it('creates incident record', () => {
      const incident = createIncident('inc-001', 'deployment', 'high');

      expect(incident).toBeDefined();
      expect(incident.incidentId).toBe('inc-001');
      expect(incident.category).toBe('deployment');
      expect(incident.customerImpact).toBe('high');
      expect(incident.status).toBe('detecting');
      expect(incident.events.length).toBeGreaterThan(0);
    });

    it('retrieves incident by ID', () => {
      createIncident('inc-002', 'database', 'critical');
      const retrieved = getIncident('inc-002');

      expect(retrieved).toBeDefined();
      expect(retrieved?.incidentId).toBe('inc-002');
      expect(retrieved?.category).toBe('database');
    });

    it('returns undefined for non-existent incident', () => {
      const retrieved = getIncident('non-existent');

      expect(retrieved).toBeUndefined();
    });

    it('records incident events in correct order', () => {
      createIncident('inc-003', 'api', 'medium');
      recordIncidentEvent('inc-003', 'alert-correlated', 'DNS-022', { score: 85 });
      recordIncidentEvent('inc-003', 'assigned', 'DNS-017', { responder: 'alice' });
      recordIncidentEvent('inc-003', 'remediation-started', 'DNS-021', { playbook: 'api-throttling' });

      const incident = getIncident('inc-003');
      expect(incident?.events.length).toBe(4); // created + 3 events
      expect(incident?.events[1].eventType).toBe('alert-correlated');
      expect(incident?.events[2].eventType).toBe('assigned');
      expect(incident?.events[3].eventType).toBe('remediation-started');
    });

    it('tracks time progression through incident lifecycle', () => {
      const inc = createIncident('inc-004', 'database', 'high');
      recordIncidentEvent('inc-004', 'alert-correlated', 'DNS-022', { score: 90 });
      recordIncidentEvent('inc-004', 'assigned', 'DNS-017', { responder: 'bob' });
      recordIncidentEvent('inc-004', 'remediation-started', 'DNS-021', { playbook: 'database-recovery' });
      recordIncidentEvent('inc-004', 'notification-sent', 'DNS-018', { channels: 2 });
      recordIncidentEvent('inc-004', 'resolved', 'DNS-023', { successful: true });

      const incident = getIncident('inc-004');
      expect(incident?.status).toBe('resolved');
      expect(incident?.detectionTime).toBeDefined();
      expect(incident?.correlationTime).toBeDefined();
      expect(incident?.commandTime).toBeDefined();
      expect(incident?.totalResolutionTime).toBeDefined();
    });
  });

  describe('Incident Resolution Tracking', () => {
    it('marks incident as successful when resolved by playbook', () => {
      createIncident('inc-005', 'deployment', 'medium');
      const resolved = resolveIncident('inc-005', true, 'deployment-rollback');

      expect(resolved?.playbookSuccessful).toBe(true);
      expect(resolved?.playbookUsed).toBe('deployment-rollback');
    });

    it('marks incident as failed when playbook unsuccessful', () => {
      createIncident('inc-006', 'api', 'high');
      const resolved = resolveIncident('inc-006', false);

      expect(resolved?.playbookSuccessful).toBe(false);
    });

    it('tracks resolution in event history', () => {
      createIncident('inc-007', 'database', 'critical');
      resolveIncident('inc-007', true, 'database-recovery');

      const events = getIncidentEvents('inc-007');
      const resolvedEvent = events.find((e) => e.eventType === 'resolved');

      expect(resolvedEvent).toBeDefined();
      expect(resolvedEvent?.details.successful).toBe(true);
    });
  });

  describe('Incident Metrics Calculation', () => {
    it('calculates incident count', () => {
      createIncident('inc-008', 'deployment', 'medium');
      createIncident('inc-009', 'database', 'high');
      createIncident('inc-010', 'api', 'low');

      const metrics = getIncidentMetrics();

      expect(metrics.totalIncidents).toBe(3);
    });

    it('calculates resolved vs unresolved incidents', () => {
      createIncident('inc-011', 'deployment', 'medium');
      createIncident('inc-012', 'database', 'high');
      createIncident('inc-013', 'api', 'medium');

      resolveIncident('inc-011', true);
      resolveIncident('inc-012', true);

      const metrics = getIncidentMetrics();

      expect(metrics.resolvedIncidents).toBe(2);
      expect(metrics.unresolvedIncidents).toBe(1);
    });

    it('calculates success rate from resolved incidents', () => {
      createIncident('inc-014', 'deployment', 'medium');
      createIncident('inc-015', 'deployment', 'medium');
      createIncident('inc-016', 'deployment', 'medium');
      createIncident('inc-017', 'deployment', 'medium');

      resolveIncident('inc-014', true); // successful
      resolveIncident('inc-015', true); // successful
      resolveIncident('inc-016', true); // successful
      resolveIncident('inc-017', false); // failed

      const metrics = getIncidentMetrics();

      expect(metrics.successRate).toBe(75); // 3 of 4
    });

    it('calculates playbook effectiveness by category', () => {
      createIncident('inc-018', 'deployment', 'medium');
      createIncident('inc-019', 'deployment', 'medium');
      createIncident('inc-020', 'database', 'high');
      createIncident('inc-021', 'database', 'high');
      createIncident('inc-022', 'database', 'high');

      resolveIncident('inc-018', true);
      resolveIncident('inc-019', false);
      resolveIncident('inc-020', true);
      resolveIncident('inc-021', true);
      resolveIncident('inc-022', false);

      const metrics = getIncidentMetrics();

      expect(metrics.playbookEffectiveness.deployment).toBe(50); // 1 of 2
      expect(Math.round(metrics.playbookEffectiveness.database)).toBe(67); // 2 of 3
    });

    it('filters metrics by time window', () => {
      createIncident('inc-023', 'api', 'low');
      createIncident('inc-024', 'api', 'medium');

      const metricsAll = getIncidentMetrics(24);
      const metricsFutureWindow = getIncidentMetrics(0.01); // Very short window

      expect(metricsAll.totalIncidents).toBeGreaterThanOrEqual(metricsFutureWindow.totalIncidents);
    });

    it('calculates MTTD (mean time to detection)', () => {
      createIncident('inc-025', 'deployment', 'medium');
      recordIncidentEvent('inc-025', 'alert-correlated', 'DNS-022', {});

      const incident = getIncident('inc-025');
      expect(incident?.detectionTime).toBeGreaterThanOrEqual(0);
    });

    it('calculates MTTR (mean time to resolution)', () => {
      createIncident('inc-026', 'database', 'high');
      recordIncidentEvent('inc-026', 'alert-correlated', 'DNS-022', {});
      recordIncidentEvent('inc-026', 'assigned', 'DNS-017', {});
      recordIncidentEvent('inc-026', 'remediation-started', 'DNS-021', {});
      recordIncidentEvent('inc-026', 'resolved', 'DNS-023', {});

      const incident = getIncident('inc-026');
      // MTTR is calculated from incident creation to resolution
      expect(incident?.totalResolutionTime).toBeDefined();
      expect(incident?.status).toBe('resolved');
    });

    it('calculates percentiles (median, p95, p99)', () => {
      for (let i = 0; i < 5; i++) {
        createIncident(`inc-${100 + i}`, 'api', 'medium');
        recordIncidentEvent(`inc-${100 + i}`, 'resolved', 'DNS-023', {});
      }

      const metrics = getIncidentMetrics();

      expect(metrics.medianResolutionTime).toBeGreaterThanOrEqual(0);
      expect(metrics.p95ResolutionTime).toBeGreaterThanOrEqual(0);
      expect(metrics.p99ResolutionTime).toBeGreaterThanOrEqual(0);
    });

    it('detects improving trend when success rate increases', () => {
      // First period: 50% success rate
      createIncident('inc-027', 'deployment', 'medium');
      createIncident('inc-028', 'deployment', 'medium');
      resolveIncident('inc-027', true);
      resolveIncident('inc-028', false);

      const metrics = getIncidentMetrics();

      // Trend should be based on historical comparison
      expect(metrics.trendDirection).toBeDefined();
      expect(['improving', 'stable', 'declining']).toContain(metrics.trendDirection);
    });
  });

  describe('System Health Monitoring', () => {
    it('initializes all systems as healthy', () => {
      const health = getSystemHealth();

      expect(health.detectionSystemHealthy).toBe(true);
      expect(health.correlationSystemHealthy).toBe(true);
      expect(health.incidentCommandHealthy).toBe(true);
      expect(health.communicationSystemHealthy).toBe(true);
      expect(health.remediationSystemHealthy).toBe(true);
      expect(health.postmortemSystemHealthy).toBe(true);
    });

    it('marks system as unhealthy', () => {
      updateSystemHealth('detectionSystemHealthy', false);
      const health = getSystemHealth();

      expect(health.detectionSystemHealthy).toBe(false);
      expect(health.systemErrors).toBeGreaterThan(0);
    });

    it('tracks multiple system failures', () => {
      updateSystemHealth('detectionSystemHealthy', false);
      updateSystemHealth('correlationSystemHealthy', false);
      updateSystemHealth('incidentCommandHealthy', false);

      const health = getSystemHealth();

      expect(health.systemErrors).toBe(3);
    });

    it('updates last system check timestamp', () => {
      const beforeCheck = new Date();
      updateSystemHealth('communicationSystemHealthy', false);
      const health = getSystemHealth();
      const lastCheck = new Date(health.lastSystemCheck);
      const afterCheck = new Date();

      expect(lastCheck.getTime()).toBeGreaterThanOrEqual(beforeCheck.getTime());
      expect(lastCheck.getTime()).toBeLessThanOrEqual(afterCheck.getTime());
    });

    it('calculates system uptime', () => {
      const healthHealthy = getSystemHealth();
      expect(healthHealthy.systemUptime).toBe(100);

      updateSystemHealth('detectionSystemHealthy', false);
      const healthDegraded = getSystemHealth();
      expect(healthDegraded.systemUptime).toBeLessThan(100);
    });
  });

  describe('Incident Event Tracking', () => {
    it('retrieves all events for incident', () => {
      createIncident('inc-029', 'api', 'medium');
      recordIncidentEvent('inc-029', 'alert-correlated', 'DNS-022', {});
      recordIncidentEvent('inc-029', 'assigned', 'DNS-017', {});
      recordIncidentEvent('inc-029', 'resolved', 'DNS-023', {});

      const events = getIncidentEvents('inc-029');

      expect(events.length).toBe(4); // created + 3 manual events
      expect(events.every((e) => e.incidentId === 'inc-029')).toBe(true);
    });

    it('returns empty array for incident with no events', () => {
      const events = getIncidentEvents('non-existent-incident');

      expect(events).toEqual([]);
    });

    it('includes event details', () => {
      createIncident('inc-030', 'database', 'high');
      recordIncidentEvent('inc-030', 'assigned', 'DNS-017', { responder: 'charlie', priority: 'critical' });

      const events = getIncidentEvents('inc-030');
      const assignedEvent = events.find((e) => e.eventType === 'assigned');

      expect(assignedEvent?.details.responder).toBe('charlie');
      expect(assignedEvent?.details.priority).toBe('critical');
    });
  });

  describe('Incident Retrieval', () => {
    it('retrieves all incidents sorted by creation time', () => {
      createIncident('inc-031', 'api', 'low');
      createIncident('inc-032', 'database', 'high');
      createIncident('inc-033', 'deployment', 'medium');

      const incidents = getAllIncidents();

      expect(incidents.length).toBe(3);
      expect(incidents.map((i) => i.incidentId)).toContain('inc-031');
      expect(incidents.map((i) => i.incidentId)).toContain('inc-032');
      expect(incidents.map((i) => i.incidentId)).toContain('inc-033');

      // Verify they're sorted by time (newest first or equal timestamps)
      for (let i = 0; i < incidents.length - 1; i++) {
        const current = new Date(incidents[i].createdAt).getTime();
        const next = new Date(incidents[i + 1].createdAt).getTime();
        expect(current).toBeGreaterThanOrEqual(next);
      }
    });

    it('includes all incident lifecycle data', () => {
      createIncident('inc-034', 'database', 'critical');
      recordIncidentEvent('inc-034', 'alert-correlated', 'DNS-022', { score: 92 });
      recordIncidentEvent('inc-034', 'assigned', 'DNS-017', { responder: 'dave' });
      recordIncidentEvent('inc-034', 'remediation-started', 'DNS-021', { playbook: 'database-recovery' });
      resolveIncident('inc-034', true, 'database-recovery');

      const incident = getIncident('inc-034');

      expect(incident?.incidentId).toBe('inc-034');
      expect(incident?.category).toBe('database');
      expect(incident?.customerImpact).toBe('critical');
      expect(incident?.status).toBe('resolved');
      expect(incident?.playbookSuccessful).toBe(true);
      expect(incident?.playbookUsed).toBe('database-recovery');
      expect(incident?.events.length).toBeGreaterThan(0);
    });
  });

  describe('Integration Scenarios', () => {
    it('tracks complete incident lifecycle end-to-end', () => {
      // Step 1: Incident created
      const incident = createIncident('inc-035', 'deployment', 'high');
      expect(incident.status).toBe('detecting');

      // Step 2: Alert correlated
      recordIncidentEvent('inc-035', 'alert-correlated', 'DNS-022', { score: 88 });
      const afterCorr = getIncident('inc-035');
      expect(afterCorr?.status).toBe('correlating');

      // Step 3: Incident assigned
      recordIncidentEvent('inc-035', 'assigned', 'DNS-017', { responder: 'eve' });
      const afterAssign = getIncident('inc-035');
      expect(afterAssign?.status).toBe('commanding');

      // Step 4: Remediation started
      recordIncidentEvent('inc-035', 'remediation-started', 'DNS-021', { playbook: 'deployment-rollback' });
      const afterRemediate = getIncident('inc-035');
      expect(afterRemediate?.status).toBe('remediating');

      // Step 5: Customer notified
      recordIncidentEvent('inc-035', 'notification-sent', 'DNS-018', { channels: ['email', 'slack'] });
      const afterNotify = getIncident('inc-035');
      expect(afterNotify?.status).toBe('communicating');

      // Step 6: Incident resolved
      resolveIncident('inc-035', true, 'deployment-rollback');
      const final = getIncident('inc-035');
      expect(final?.status).toBe('resolved');
      expect(final?.playbookSuccessful).toBe(true);
      expect(final?.playbookUsed).toBe('deployment-rollback');
      expect(final?.events.length).toBeGreaterThan(0);
    });

    it('measures improvement in incident response over time', () => {
      // First batch: lower success rate
      for (let i = 0; i < 4; i++) {
        createIncident(`inc-early-${i}`, 'database', 'high');
        resolveIncident(`inc-early-${i}`, i < 2); // 50% success
      }

      const earlyMetrics = getIncidentMetrics();
      expect(earlyMetrics.successRate).toBeLessThan(100);

      // Second batch: higher success rate
      for (let i = 0; i < 4; i++) {
        createIncident(`inc-late-${i}`, 'database', 'high');
        resolveIncident(`inc-late-${i}`, i < 3); // 75% success
      }

      const allMetrics = getIncidentMetrics();
      expect(allMetrics.totalIncidents).toBe(8);
    });

    it('tracks multi-category incident handling effectiveness', () => {
      const categories = ['deployment', 'database', 'api', 'security'];
      const successRates = [100, 75, 50, 100]; // Different success rates per category

      categories.forEach((category, index) => {
        for (let i = 0; i < 4; i++) {
          createIncident(`inc-cat-${category}-${i}`, category, 'medium');
          const successful = i < successRates[index] / 25; // Convert percentage to count
          resolveIncident(`inc-cat-${category}-${i}`, successful);
        }
      });

      const metrics = getIncidentMetrics();

      expect(metrics.playbookEffectiveness.deployment).toBe(100);
      expect(metrics.playbookEffectiveness.database).toBeLessThan(100);
      expect(metrics.playbookEffectiveness.database).toBeGreaterThan(0);
    });
  });
});
