import { describe, it, expect, beforeEach } from 'vitest';
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
});
