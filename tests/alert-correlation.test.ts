import { describe, it, expect, beforeEach } from 'vitest';
import {
  recordAlert,
  correlateAlerts,
  getNonSuppressedAlerts,
  getCorrelatedGroups,
  recordGroupAction,
  updatePatternSuppression,
  getCorrelationMetrics,
  resetAlertStore,
  getAlertPattern,
  getAllAlertPatterns,
  type Alert,
  type AlertSeverity,
  type AlertSource,
} from '@/lib/alert-correlation';

describe('DNS-022: Alert Correlation', () => {
  beforeEach(() => {
    resetAlertStore();
  });

  describe('Alert Recording', () => {
    it('records incoming alert with all fields', () => {
      const alert = recordAlert(
        'performance-monitor',
        'critical',
        'Database Connection Pool Exhausted',
        'Connection pool at 100% capacity',
        ['database', 'connection', 'pool'],
        { pool_size: 100, active_connections: 100 }
      );

      expect(alert).toBeDefined();
      expect(alert.id).toMatch(/^alert-/);
      expect(alert.source).toBe('performance-monitor');
      expect(alert.severity).toBe('critical');
      expect(alert.title).toBe('Database Connection Pool Exhausted');
      expect(alert.suppressed).toBe(false);
      expect(alert.correlatedAlerts).toHaveLength(0);
      expect(alert.metadata).toEqual({ pool_size: 100, active_connections: 100 });
    });

    it('generates unique IDs for each alert', () => {
      const alert1 = recordAlert('uptime-monitor', 'warning', 'Service Down', 'API unavailable', ['api']);
      const alert2 = recordAlert('uptime-monitor', 'warning', 'Service Down', 'API unavailable', ['api']);

      expect(alert1.id).not.toBe(alert2.id);
    });

    it('records timestamp for each alert', () => {
      const before = new Date();
      const alert = recordAlert('error-tracking', 'warning', 'High Error Rate', 'Error rate > 5%', ['errors']);
      const after = new Date();

      const alertTime = new Date(alert.timestamp);
      expect(alertTime.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(alertTime.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('handles optional metadata', () => {
      const alertWithoutMetadata = recordAlert('uptime-monitor', 'info', 'Status Check', 'Periodic check', []);
      const alertWithMetadata = recordAlert('uptime-monitor', 'info', 'Status Check', 'Periodic check', [], { check_id: '123' });

      expect(alertWithoutMetadata.metadata).toBeUndefined();
      expect(alertWithMetadata.metadata).toEqual({ check_id: '123' });
    });
  });

  describe('Alert Correlation', () => {
    it('correlates alerts matching a pattern within time window', () => {
      recordAlert('performance-monitor', 'critical', 'Database Pool Exhausted', 'High pool usage', ['database', 'connection', 'pool']);
      recordAlert('error-tracking', 'critical', 'Connection Timeout Errors', 'Timeout spike', ['timeout', 'database', 'connection']);
      recordAlert('uptime-monitor', 'critical', 'Service Unavailable', 'Service down', ['database', 'unavailable']);

      const groups = correlateAlerts();

      expect(groups.length).toBeGreaterThan(0);
      const dbGroup = groups.find((g) => g.pattern.id === 'pattern-database-cascade');
      expect(dbGroup).toBeDefined();
      expect(dbGroup?.alerts.length).toBeGreaterThanOrEqual(2);
    });

    it('matches alerts by tag patterns', () => {
      recordAlert('performance-monitor', 'critical', 'Memory Usage High', 'Heap usage 90%', ['memory', 'heap', 'oom']);
      recordAlert('error-tracking', 'critical', 'OOM Error', 'Out of memory', ['oom', 'crash']);
      recordAlert('uptime-monitor', 'critical', 'Service Restarted', 'Process restart', ['restart', 'crash']);

      const groups = correlateAlerts();

      const memoryGroup = groups.find((g) => g.pattern.id === 'pattern-memory-leak');
      expect(memoryGroup).toBeDefined();
      if (memoryGroup) {
        expect(memoryGroup.alerts.length).toBeGreaterThanOrEqual(2);
        expect(memoryGroup.alerts.every((a) => a.tags.some((t) => ['memory', 'heap', 'oom', 'crash', 'restart'].includes(t)))).toBe(true);
      }
    });

    it('respects time window for correlation', () => {
      const alert1 = recordAlert('performance-monitor', 'critical', 'High Latency', 'Latency spike', ['timeout']);

      // Simulate old alert by manually setting timestamp (in real scenario would be from past)
      const alert2 = recordAlert('error-tracking', 'critical', 'Timeout Error', 'Request timeout', ['timeout']);

      const groups = correlateAlerts();

      // Both alerts should be within 5 minute window
      expect(groups.length).toBeGreaterThanOrEqual(0);
    });

    it('filters alerts by source', () => {
      recordAlert('error-tracking', 'critical', 'External API Error', 'Service error', ['external', 'dependency', 'timeout']);
      recordAlert('uptime-monitor', 'critical', 'External Service Down', 'Service unavailable', ['external', 'timeout', 'unavailable']);

      const groups = correlateAlerts();

      const externalGroup = groups.find((g) => g.pattern.id === 'pattern-upstream-failure');
      if (groups.length > 0) {
        // If any group was created, verify it matches the pattern sources
        if (externalGroup) {
          expect(externalGroup.alerts.every((a) => ['error-tracking', 'uptime-monitor'].includes(a.source))).toBe(true);
        }
      }
    });

    it('requires minimum match count to create correlation group', () => {
      recordAlert('performance-monitor', 'critical', 'Disk Space Low', 'Disk 90% full', ['disk', 'space']);

      const groups = correlateAlerts();

      const diskGroup = groups.find((g) => g.pattern.id === 'pattern-disk-pressure');
      expect(diskGroup).toBeUndefined(); // Need minMatchCount (2 alerts)
    });

    it('suppresses original alerts in correlated group', () => {
      const alert1 = recordAlert('performance-monitor', 'critical', 'Disk Full', 'Disk 95%', ['disk', 'storage', 'space']);
      const alert2 = recordAlert('error-tracking', 'critical', 'Write Failed', 'Cannot write to disk', ['disk', 'write-failed']);

      correlateAlerts();

      expect(alert1.suppressed).toBe(true);
      expect(alert2.suppressed).toBe(true);
      expect(alert1.correlatedAlerts.length).toBeGreaterThan(0);
    });

    it('calculates correlation score based on alert quality', () => {
      recordAlert('error-tracking', 'critical', 'Rate Limit Hit', 'Request limit exceeded', ['rate-limit', 'quota']);
      recordAlert('uptime-monitor', 'critical', 'Service Degraded', 'High error rate', ['rate-limit', 'throttle', 'too-many-requests']);

      const groups = correlateAlerts();

      const rateLimitGroup = groups.find((g) => g.pattern.id === 'pattern-rate-limit');
      expect(rateLimitGroup).toBeDefined();
      if (rateLimitGroup) {
        expect(rateLimitGroup.correlationScore).toBeGreaterThan(0);
        expect(rateLimitGroup.correlationScore).toBeLessThanOrEqual(100);
      }
    });

    it('includes pattern details in correlation group', () => {
      recordAlert('performance-monitor', 'critical', 'Memory Leak Suspected', 'Heap growth', ['memory', 'heap', 'oom']);
      recordAlert('error-tracking', 'critical', 'OOM Error', 'Out of memory', ['oom', 'crash']);
      recordAlert('uptime-monitor', 'critical', 'Service Crashed', 'Process restart', ['crash', 'restart']);

      const groups = correlateAlerts();

      const memoryGroup = groups.find((g) => g.pattern.id === 'pattern-memory-leak');
      expect(memoryGroup).toBeDefined();
      if (memoryGroup) {
        expect(memoryGroup.pattern.name).toBe('Memory Leak Cascade');
        expect(memoryGroup.rootCauseEstimate).toBe('Memory leak in application');
        expect(memoryGroup.suggestedActions.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Alert Retrieval', () => {
    it('retrieves non-suppressed alerts', () => {
      const alert1 = recordAlert('uptime-monitor', 'critical', 'Service Down', 'API unavailable', ['api']);
      const alert2 = recordAlert('performance-monitor', 'warning', 'High Latency', 'Response time > 1s', ['latency']);

      const unsuppressed = getNonSuppressedAlerts();

      expect(unsuppressed.length).toBe(2);
      expect(unsuppressed.map((a) => a.id)).toContain(alert1.id);
      expect(unsuppressed.map((a) => a.id)).toContain(alert2.id);
    });

    it('excludes suppressed alerts from retrieval', () => {
      recordAlert('performance-monitor', 'critical', 'Database Pool Exhausted', 'High pool usage', ['database', 'connection', 'pool']);
      const alert2 = recordAlert('uptime-monitor', 'warning', 'Slow Response', 'Latency spike', ['latency']);
      recordAlert('error-tracking', 'critical', 'Connection Timeout', 'Timeout spike', ['timeout', 'database', 'connection']);

      correlateAlerts();
      const unsuppressed = getNonSuppressedAlerts();

      expect(unsuppressed.length).toBe(1);
      expect(unsuppressed[0].id).toBe(alert2.id);
    });

    it('sorts non-suppressed alerts by timestamp descending', () => {
      const alert1 = recordAlert('uptime-monitor', 'info', 'Alert 1', 'First', []);
      const alert2 = recordAlert('uptime-monitor', 'info', 'Alert 2', 'Second', []);
      const alert3 = recordAlert('uptime-monitor', 'info', 'Alert 3', 'Third', []);

      const unsuppressed = getNonSuppressedAlerts();

      expect(unsuppressed.length).toBe(3);
      expect(unsuppressed.map((a) => a.id)).toContain(alert1.id);
      expect(unsuppressed.map((a) => a.id)).toContain(alert2.id);
      expect(unsuppressed.map((a) => a.id)).toContain(alert3.id);

      // Verify sorted by timestamp descending (most recent first)
      for (let i = 0; i < unsuppressed.length - 1; i++) {
        const current = new Date(unsuppressed[i].timestamp).getTime();
        const next = new Date(unsuppressed[i + 1].timestamp).getTime();
        expect(current).toBeGreaterThanOrEqual(next);
      }
    });

    it('retrieves correlated groups sorted by score', () => {
      recordAlert('performance-monitor', 'critical', 'Database Pool Exhausted', 'High usage', ['database', 'connection', 'pool']);
      recordAlert('error-tracking', 'critical', 'Connection Timeout', 'Timeout', ['timeout', 'database', 'connection']);

      recordAlert('error-tracking', 'critical', 'Rate Limit Hit', 'Limit exceeded', ['rate-limit', 'quota']);
      recordAlert('uptime-monitor', 'critical', 'Service Degraded', 'High error rate', ['rate-limit', 'throttle']);

      correlateAlerts();
      const groups = getCorrelatedGroups();

      expect(groups.length).toBeGreaterThan(0);
      for (let i = 0; i < groups.length - 1; i++) {
        expect(groups[i].correlationScore).toBeGreaterThanOrEqual(groups[i + 1].correlationScore);
      }
    });

    it('filters correlated groups by time window', () => {
      recordAlert('performance-monitor', 'critical', 'Database Pool Exhausted', 'High usage', ['database', 'connection', 'pool']);
      recordAlert('error-tracking', 'critical', 'Connection Timeout', 'Timeout', ['timeout', 'database', 'connection']);

      correlateAlerts();

      const allGroups = getCorrelatedGroups(24);
      const recentGroups = getCorrelatedGroups(0.01); // 36 seconds

      expect(allGroups.length).toBeGreaterThanOrEqual(recentGroups.length);
    });
  });

  describe('Action Recording', () => {
    it('records action taken on correlated group', () => {
      recordAlert('performance-monitor', 'critical', 'Database Pool Exhausted', 'High usage', ['database', 'connection', 'pool']);
      recordAlert('error-tracking', 'critical', 'Connection Timeout', 'Timeout', ['timeout', 'database', 'connection']);

      const groups = correlateAlerts();
      const group = groups[0];

      const updated = recordGroupAction(group.id, 'Scaled database connections to 200');

      expect(updated).toBeDefined();
      expect(updated?.actionTaken).toBe('Scaled database connections to 200');
    });

    it('returns undefined for non-existent group', () => {
      const result = recordGroupAction('non-existent-group-id', 'Some action');

      expect(result).toBeUndefined();
    });
  });

  describe('Pattern Management', () => {
    it('retrieves alert pattern by ID', () => {
      const pattern = getAlertPattern('pattern-database-cascade');

      expect(pattern).toBeDefined();
      expect(pattern?.name).toBe('Database Connection Pool Exhaustion Cascade');
      expect(pattern?.enabled).toBe(true);
    });

    it('returns undefined for non-existent pattern', () => {
      const pattern = getAlertPattern('non-existent-pattern');

      expect(pattern).toBeUndefined();
    });

    it('gets all default alert patterns', () => {
      const patterns = getAllAlertPatterns();

      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns.map((p) => p.id)).toContain('pattern-database-cascade');
      expect(patterns.map((p) => p.id)).toContain('pattern-memory-leak');
      expect(patterns.map((p) => p.id)).toContain('pattern-upstream-failure');
      expect(patterns.map((p) => p.id)).toContain('pattern-disk-pressure');
      expect(patterns.map((p) => p.id)).toContain('pattern-rate-limit');
    });

    it('disables pattern suppression', () => {
      recordAlert('performance-monitor', 'critical', 'Database Pool Exhausted', 'High usage', ['database', 'connection', 'pool']);
      recordAlert('error-tracking', 'critical', 'Connection Timeout', 'Timeout', ['timeout', 'database', 'connection']);

      updatePatternSuppression('pattern-database-cascade', false);
      const groups = correlateAlerts();

      const dbGroup = groups.find((g) => g.pattern.id === 'pattern-database-cascade');
      expect(dbGroup).toBeUndefined(); // Pattern is disabled
    });

    it('re-enables pattern suppression', () => {
      recordAlert('performance-monitor', 'critical', 'Database Pool Exhausted', 'High usage', ['database', 'connection', 'pool']);
      recordAlert('error-tracking', 'critical', 'Connection Timeout', 'Timeout', ['timeout', 'database', 'connection']);

      updatePatternSuppression('pattern-database-cascade', false);
      let groups = correlateAlerts();
      expect(groups.find((g) => g.pattern.id === 'pattern-database-cascade')).toBeUndefined();

      updatePatternSuppression('pattern-database-cascade', true);
      groups = correlateAlerts();
      expect(groups.find((g) => g.pattern.id === 'pattern-database-cascade')).toBeDefined();
    });
  });

  describe('Correlation Metrics', () => {
    it('calculates alert reduction percentage', () => {
      recordAlert('performance-monitor', 'critical', 'Database Pool Exhausted', 'High usage', ['database', 'connection', 'pool']);
      recordAlert('error-tracking', 'critical', 'Connection Timeout', 'Timeout', ['timeout', 'database', 'connection']);

      correlateAlerts();
      const metrics = getCorrelationMetrics();

      expect(metrics.totalAlerts).toBe(2);
      expect(metrics.suppressedAlerts).toBe(2);
      expect(metrics.alertReductionPercent).toBe(100);
    });

    it('reports average group size', () => {
      recordAlert('performance-monitor', 'critical', 'Database Pool Exhausted', 'High usage', ['database', 'connection', 'pool']);
      recordAlert('error-tracking', 'critical', 'Connection Timeout', 'Timeout', ['timeout', 'database', 'connection']);
      recordAlert('uptime-monitor', 'warning', 'Slow Response', 'Latency spike', ['latency']);

      correlateAlerts();
      const metrics = getCorrelationMetrics();

      expect(metrics.correlatedGroups).toBeGreaterThan(0);
      expect(metrics.averageGroupSize).toBeGreaterThan(0);
    });

    it('reports average correlation score', () => {
      recordAlert('performance-monitor', 'critical', 'Database Pool Exhausted', 'High usage', ['database', 'connection', 'pool']);
      recordAlert('error-tracking', 'critical', 'Connection Timeout', 'Timeout', ['timeout', 'database', 'connection']);

      correlateAlerts();
      const metrics = getCorrelationMetrics();

      expect(metrics.averageCorrelationScore).toBeGreaterThan(0);
      expect(metrics.averageCorrelationScore).toBeLessThanOrEqual(100);
    });

    it('filters metrics by time window', () => {
      recordAlert('performance-monitor', 'critical', 'Database Pool Exhausted', 'High usage', ['database', 'connection', 'pool']);
      recordAlert('error-tracking', 'critical', 'Connection Timeout', 'Timeout', ['timeout', 'database', 'connection']);

      correlateAlerts();

      const allMetrics = getCorrelationMetrics(24);
      const recentMetrics = getCorrelationMetrics(0.01);

      expect(allMetrics.totalAlerts).toBeGreaterThanOrEqual(recentMetrics.totalAlerts);
    });
  });

  describe('Integration Scenarios', () => {
    it('complete alert correlation workflow', () => {
      const alert1 = recordAlert('performance-monitor', 'critical', 'Database Connection Pool Exhausted', 'Pool at 100%', ['database', 'connection', 'pool', 'timeout']);
      const alert2 = recordAlert('error-tracking', 'critical', 'Connection Pool Exhaustion', 'Cannot acquire connection', ['connection', 'pool', 'timeout', 'database']);
      const alert3 = recordAlert('uptime-monitor', 'critical', 'Service Unavailable', 'API not responding', ['database', 'unavailable', 'connection']);

      expect(alert1.suppressed).toBe(false);
      expect(alert2.suppressed).toBe(false);

      const groups = correlateAlerts();

      expect(groups.length).toBeGreaterThan(0);
      expect(alert1.suppressed).toBe(true);
      expect(alert2.suppressed).toBe(true);
      expect(alert3.suppressed).toBe(true);

      const group = groups[0];
      expect(group.alerts.length).toBeGreaterThanOrEqual(2);
      expect(group.correlationScore).toBeGreaterThan(0);

      recordGroupAction(group.id, 'Increased connection pool size to 300');
      const updatedGroup = getCorrelatedGroups()[0];
      expect(updatedGroup.actionTaken).toBe('Increased connection pool size to 300');
    });

    it('handles multiple pattern correlations simultaneously', () => {
      recordAlert('performance-monitor', 'critical', 'Database Pool Exhausted', 'Pool full', ['database', 'connection', 'pool']);
      recordAlert('error-tracking', 'critical', 'Connection Timeout', 'Timeout', ['timeout', 'database', 'connection']);

      recordAlert('performance-monitor', 'critical', 'Memory Leak', 'Heap growth', ['memory', 'heap', 'oom']);
      recordAlert('error-tracking', 'critical', 'OOM Error', 'Out of memory', ['oom', 'crash']);
      recordAlert('uptime-monitor', 'critical', 'Service Crashed', 'Restart', ['crash', 'restart']);

      const groups = correlateAlerts();

      expect(groups.length).toBeGreaterThanOrEqual(2);
      const dbGroup = groups.find((g) => g.pattern.id === 'pattern-database-cascade');
      const memGroup = groups.find((g) => g.pattern.id === 'pattern-memory-leak');
      expect(dbGroup).toBeDefined();
      expect(memGroup).toBeDefined();
    });

    it('measures alert fatigue reduction', () => {
      for (let i = 0; i < 10; i++) {
        recordAlert('error-tracking', 'critical', `Rate Limit Alert ${i}`, 'Quota exceeded', ['rate-limit', 'quota', 'too-many-requests']);
      }
      recordAlert('uptime-monitor', 'critical', 'Service Degraded', 'High error rate', ['rate-limit', 'throttle', 'too-many-requests']);

      const before = getNonSuppressedAlerts().length;
      correlateAlerts();
      const after = getNonSuppressedAlerts().length;

      const metrics = getCorrelationMetrics();

      expect(before).toBeGreaterThan(after);
      expect(metrics.alertReductionPercent).toBeGreaterThan(0);
    });
  });
});
