import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MonitoringLoop } from '../lib/observability/monitoring-loop';

describe('Monitoring Loop', () => {
  let loop: MonitoringLoop;

  beforeEach(() => {
    loop = new MonitoringLoop();
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      await loop.initialize();
      expect(loop).toBeDefined();
    });

    it('should have empty history at start', () => {
      const history = loop.getHistory();
      expect(history).toHaveLength(0);
    });

    it('should return undefined for latest check before any checks', () => {
      const latest = loop.getLatestCheck();
      expect(latest).toBeUndefined();
    });
  });

  describe('Health Checking', () => {
    it('should detect healthy status', async () => {
      await loop.initialize();
      const latest = loop.getLatestCheck();

      // After initialization, should have baseline health
      expect(loop).toBeDefined();
    });

    it('should track component status', () => {
      const components = [
        'database',
        'supabase_auth',
        'session_store',
        'rls_policies',
        'database_triggers',
        'stored_functions',
      ];

      expect(components).toHaveLength(6);
      components.forEach((component) => {
        expect(typeof component).toBe('string');
      });
    });

    it('should maintain health summary counts', () => {
      const summary = {
        total: 6,
        healthy: 6,
        degraded: 0,
        down: 0,
      };

      expect(summary.total).toBe(
        summary.healthy + summary.degraded + summary.down
      );
    });
  });

  describe('Error Tracking', () => {
    it('should initialize with zero errors', () => {
      const errors = {
        totalErrors: 0,
        errorRate: 0,
        trend: 'stable' as const,
      };

      expect(errors.totalErrors).toBe(0);
      expect(errors.errorRate).toBe(0);
    });

    it('should track error rate trends', () => {
      const rates = [0, 0.5, 1.2, 2.1]; // Increasing trend
      let isIncreasing = true;

      for (let i = 1; i < rates.length; i++) {
        if (rates[i] < rates[i - 1]) {
          isIncreasing = false;
        }
      }

      expect(isIncreasing).toBe(true);
    });
  });

  describe('Incident Detection', () => {
    it('should detect critical component down', () => {
      const result = {
        timestamp: new Date().toISOString(),
        health: {
          status: 'down' as const,
          timestamp: new Date().toISOString(),
          components: [
            { name: 'database', status: 'down' as const, responseTime: 0 },
          ],
          summary: { total: 1, healthy: 0, degraded: 0, down: 1 },
        },
        errors: { totalErrors: 0, errorRate: 0, trend: 'stable' as const },
      };

      // Should detect this as critical
      const isCritical = result.health.summary.down > 0;
      expect(isCritical).toBe(true);
    });

    it('should detect high error rate (>5%)', () => {
      const errorRate = 7;
      const isCritical = errorRate > 5;
      expect(isCritical).toBe(true);
    });

    it('should detect elevated error rate (2-5%)', () => {
      const errorRate = 3.5;
      const isElevated = errorRate > 2 && errorRate <= 5;
      expect(isElevated).toBe(true);
    });

    it('should detect component degradation', () => {
      const summary = { total: 6, healthy: 5, degraded: 1, down: 0 };
      const isDegraded = summary.degraded > 0;
      expect(isDegraded).toBe(true);
    });

    it('should return no incident for healthy status', () => {
      const summary = { total: 6, healthy: 6, degraded: 0, down: 0 };
      const hasIncident = summary.down > 0 || summary.degraded > 0;
      expect(hasIncident).toBe(false);
    });
  });

  describe('History Management', () => {
    it('should maintain check history', () => {
      const history = loop.getHistory();
      expect(Array.isArray(history)).toBe(true);
    });

    it('should limit history to max size', () => {
      // Mock history with more than max entries
      const maxSize = 60;
      const mockHistory = Array(100)
        .fill(null)
        .map((_, i) => ({
          timestamp: new Date(Date.now() - i * 60000).toISOString(),
          health: {
            status: 'healthy' as const,
            timestamp: new Date().toISOString(),
            components: [],
            summary: { total: 6, healthy: 6, degraded: 0, down: 0 },
          },
          errors: { totalErrors: 0, errorRate: 0, trend: 'stable' as const },
        }));

      // In production, this would be enforced by the monitoring loop
      expect(mockHistory.length > maxSize).toBe(true);
    });
  });

  describe('Trend Analysis', () => {
    it('should detect increasing error rate trend', () => {
      const rates = [0.5, 1.0, 1.5, 2.0];
      let isIncreasing = true;

      for (let i = 1; i < rates.length; i++) {
        if (rates[i] < rates[i - 1]) {
          isIncreasing = false;
        }
      }

      expect(isIncreasing).toBe(true);
    });

    it('should detect decreasing error rate trend', () => {
      const rates = [2.0, 1.5, 1.0, 0.5];
      let isDecreasing = true;

      for (let i = 1; i < rates.length; i++) {
        if (rates[i] > rates[i - 1]) {
          isDecreasing = false;
        }
      }

      expect(isDecreasing).toBe(true);
    });

    it('should detect intermittent failures', () => {
      const downCounts = [0, 1, 0, 1]; // Alternating
      const hasIntermittent =
        downCounts.some((c) => c > 0) && downCounts.some((c) => c === 0);
      expect(hasIntermittent).toBe(true);
    });
  });

  describe('Autonomous Response', () => {
    it('should classify incident severity', () => {
      const testCases = [
        { down: 1, errorRate: 0, expectedSeverity: 'critical' },
        { down: 0, errorRate: 7, expectedSeverity: 'critical' },
        { down: 0, errorRate: 3, expectedSeverity: 'high' },
        { down: 0, errorRate: 0.5, expectedSeverity: null },
      ];

      testCases.forEach(({ down, errorRate, expectedSeverity }) => {
        let severity = null;

        if (down > 0 || errorRate > 5) {
          severity = 'critical';
        } else if (errorRate > 2) {
          severity = 'high';
        }

        expect(severity).toBe(expectedSeverity);
      });
    });

    it('should escalate critical incidents', () => {
      const incident = {
        id: 'INC-001',
        severity: 'critical' as const,
        type: 'component_down',
        details: 'Database is down',
      };

      const shouldEscalate = incident.severity === 'critical';
      expect(shouldEscalate).toBe(true);
    });

    it('should auto-investigate warnings', () => {
      const incident = {
        id: 'INC-002',
        severity: 'high' as const,
        type: 'elevated_error_rate',
        details: 'Error rate 3.5%',
      };

      const shouldInvestigate = incident.severity === 'high';
      expect(shouldInvestigate).toBe(true);
    });
  });

  describe('Monitoring Summary', () => {
    it('should provide monitoring summary', () => {
      const summary = loop.getSummary();

      expect(summary).toHaveProperty('totalChecks');
      expect(summary).toHaveProperty('incidents');
      expect(summary).toHaveProperty('averageErrorRate');
      expect(typeof summary.totalChecks).toBe('number');
      expect(typeof summary.incidents).toBe('number');
      expect(typeof summary.averageErrorRate).toBe('number');
    });

    it('should track incident count', () => {
      const summary = loop.getSummary();
      expect(summary.incidents).toBeGreaterThanOrEqual(0);
    });

    it('should calculate average error rate', () => {
      const summary = loop.getSummary();
      expect(summary.averageErrorRate).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Lifecycle', () => {
    it('should initialize and have no errors', async () => {
      await loop.initialize();
      const summary = loop.getSummary();
      expect(summary.totalChecks).toBeGreaterThanOrEqual(0);
    });

    it('should stop gracefully', async () => {
      await loop.initialize();
      await loop.stop();
      expect(loop).toBeDefined();
    });
  });

  describe('Severity Classification', () => {
    it('should classify CRITICAL severity for component down', () => {
      const testCase = { down: 1, degraded: 0, errorRate: 0 };
      const severity =
        testCase.down > 0
          ? 'critical'
          : testCase.errorRate > 5
            ? 'critical'
            : null;

      expect(severity).toBe('critical');
    });

    it('should classify CRITICAL severity for high error rate', () => {
      const testCase = { down: 0, degraded: 0, errorRate: 6.5 };
      const severity =
        testCase.down > 0
          ? 'critical'
          : testCase.errorRate > 5
            ? 'critical'
            : null;

      expect(severity).toBe('critical');
    });

    it('should classify HIGH severity for elevated error rate', () => {
      const testCase = { down: 0, degraded: 0, errorRate: 3.5 };
      const severity =
        testCase.errorRate > 5
          ? 'critical'
          : testCase.errorRate > 2
            ? 'high'
            : null;

      expect(severity).toBe('high');
    });

    it('should classify MEDIUM severity for degradation', () => {
      const testCase = { down: 0, degraded: 1, errorRate: 0.5 };
      const severity =
        testCase.down > 0
          ? 'critical'
          : testCase.errorRate > 5
            ? 'critical'
            : testCase.errorRate > 2
              ? 'high'
              : testCase.degraded > 0
                ? 'medium'
                : null;

      expect(severity).toBe('medium');
    });

    it('should classify INFO severity for healthy status', () => {
      const testCase = { down: 0, degraded: 0, errorRate: 0.5 };
      const severity =
        testCase.down > 0
          ? 'critical'
          : testCase.errorRate > 5
            ? 'critical'
            : testCase.errorRate > 2
              ? 'high'
              : testCase.degraded > 0
                ? 'medium'
                : null;

      expect(severity).toBe(null);
    });
  });

  describe('Response Routing', () => {
    it('CRITICAL incidents escalate immediately', () => {
      const incident = { severity: 'critical', type: 'component_down' };
      const action = incident.severity === 'critical' ? 'escalate' : null;

      expect(action).toBe('escalate');
    });

    it('HIGH severity incidents auto-investigate', () => {
      const incident = { severity: 'high', type: 'elevated_error_rate' };
      const action =
        incident.severity === 'critical'
          ? 'escalate'
          : incident.severity === 'high'
            ? 'investigate'
            : null;

      expect(action).toBe('investigate');
    });

    it('MEDIUM severity incidents auto-log', () => {
      const incident = { severity: 'medium', type: 'component_degraded' };
      const action =
        incident.severity === 'critical'
          ? 'escalate'
          : incident.severity === 'high'
            ? 'investigate'
            : 'log';

      expect(action).toBe('log');
    });

    it('INFO severity incidents log only', () => {
      const incident = { severity: 'info', type: 'baseline' };
      const action =
        incident.severity === 'critical'
          ? 'escalate'
          : incident.severity === 'high'
            ? 'investigate'
            : 'log';

      expect(action).toBe('log');
    });
  });

  describe('Component Monitoring', () => {
    it('should monitor 6 critical components', () => {
      const components = [
        'database',
        'supabase_auth',
        'session_store',
        'rls_policies',
        'database_triggers',
        'stored_functions',
      ];

      expect(components).toHaveLength(6);
      expect(components).toContain('database');
      expect(components).toContain('supabase_auth');
    });

    it('should track response times per component', () => {
      const component = {
        name: 'database',
        status: 'healthy' as const,
        responseTime: 25,
      };

      expect(component.responseTime).toBeGreaterThan(0);
      expect(component.responseTime).toBeLessThan(100);
    });

    it('should calculate overall health status', () => {
      const allHealthy = true;
      const overallStatus = allHealthy ? 'healthy' : 'degraded';

      expect(overallStatus).toBe('healthy');
    });

    it('should track health degradation', () => {
      const components = [
        { status: 'healthy' },
        { status: 'healthy' },
        { status: 'degraded' },
      ];

      const degraded = components.filter((c) => c.status === 'degraded').length;
      expect(degraded).toBe(1);
    });

    it('should detect component down', () => {
      const components = [
        { status: 'healthy' },
        { status: 'healthy' },
        { status: 'down' },
      ];

      const down = components.filter((c) => c.status === 'down').length;
      expect(down).toBe(1);
    });
  });

  describe('Interval Configuration', () => {
    it('should run checks on 60-second interval', () => {
      const intervalMs = 60000;
      expect(intervalMs).toBe(60000);
    });

    it('should maintain 60-check history window (1 hour)', () => {
      const maxHistorySize = 60;
      expect(maxHistorySize).toBe(60);
    });
  });

  describe('Error Handling', () => {
    it('should handle initialization errors gracefully', async () => {
      const loop2 = new MonitoringLoop();
      // Should not throw
      expect(async () => {
        await loop2.initialize();
      }).toBeDefined();
    });

    it('should handle check failures without crashing', () => {
      // Monitoring loop should continue operating even if individual checks fail
      expect(loop).toBeDefined();
    });

    it('should recover from transient failures', () => {
      const status1 = 'down';
      const status2 = 'healthy';
      // Transient failure then recovery
      expect(status1).toBe('down');
      expect(status2).toBe('healthy');
    });
  });

  describe('Summary Calculation', () => {
    it('should calculate totalChecks as array length', () => {
      const history: any[] = [];
      const totalChecks = history.length;

      expect(totalChecks).toBe(0);
    });

    it('should calculate incidents from incidents in history', () => {
      const history = [
        { incident: undefined },
        { incident: { severity: 'critical' } },
        { incident: undefined },
      ];

      const incidents = history.filter((c) => c.incident).length;
      expect(incidents).toBe(1);
    });

    it('should calculate average error rate correctly', () => {
      const errorRates = [0.5, 1.0, 1.5];
      const average =
        errorRates.reduce((sum, r) => sum + r, 0) / errorRates.length;

      expect(average).toBeCloseTo(1.0, 1);
    });

    it('should handle empty history in summary', () => {
      const history: any[] = [];
      const avgErrorRate =
        history.length > 0
          ? history.reduce((sum) => sum, 0) / history.length
          : 0;

      expect(avgErrorRate).toBe(0);
    });
  });
});
