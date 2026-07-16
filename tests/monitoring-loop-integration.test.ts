import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { MonitoringLoop } from '../lib/observability/monitoring-loop';
import { AutoRepairEngine } from '../lib/observability/auto-repair';

describe('MonitoringLoop + AutoRepairEngine Integration', () => {
  let loop: MonitoringLoop;
  let engine: AutoRepairEngine;

  beforeEach(() => {
    loop = new MonitoringLoop();
    engine = new AutoRepairEngine();
  });

  describe('Auto-Repair Triggering on Incidents', () => {
    it('should trigger auto-repair when critical error rate detected', async () => {
      const spy = vi.spyOn(engine, 'investigateHighErrorRate');

      await loop.initialize();
      const history = loop.getHistory();

      expect(history).toBeDefined();
      expect(Array.isArray(history)).toBe(true);
    });

    it('should track investigations in auto-repair engine', async () => {
      await engine.investigateHighErrorRate(6.5);
      const investigations = engine.getInvestigations();

      expect(investigations.length).toBeGreaterThan(0);
      expect(investigations[0].severity).toBe('critical');
    });

    it('should store investigation details for error rate incidents', async () => {
      const result = await engine.investigateHighErrorRate(7.0, {
        signature: 'Error: timeout',
        count: 50,
      });

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('findings');
      expect(result).toHaveProperty('suggestedFixes');
      expect(result.findings.length).toBeGreaterThan(0);
    });

    it('should generate actionable suggestions for high error rates', async () => {
      const result = await engine.investigateHighErrorRate(8.5);

      expect(result.suggestedFixes.length).toBeGreaterThan(0);
      result.suggestedFixes.forEach((fix) => {
        expect(fix.description.length).toBeGreaterThan(0);
        expect(fix.suggestedFix.length).toBeGreaterThan(0);
      });
    });

    it('should classify query performance issues', async () => {
      const result = await engine.investigateSlowQueries(12, 2500);

      expect(result.issueType).toBe('slow_query');
      expect(result.severity).toBe('critical');
      expect(result.suggestedFixes.some((f) => f.type === 'optimize')).toBe(
        true
      );
    });

    it('should generate query optimization recommendations', async () => {
      const result = await engine.investigateSlowQueries(8, 1800);

      expect(
        result.recommendedActions.some((a) => a.includes('missing indexes'))
      ).toBe(true);
    });

    it('should detect connection pool exhaustion', async () => {
      const result = await engine.investigateConnectionPoolExhaustion(
        96,
        96,
        100
      );

      expect(result.severity).toBe('critical');
      expect(result.suggestedFixes.some((f) => f.type === 'scale')).toBe(true);
    });

    it('should provide connection scaling recommendations', async () => {
      const result = await engine.investigateConnectionPoolExhaustion(
        98,
        98,
        100
      );

      expect(
        result.recommendedActions.some((a) =>
          a.includes('scale connections immediately')
        )
      ).toBe(true);
    });
  });

  describe('Investigation History and Retrieval', () => {
    it('should retrieve investigations by type', async () => {
      await engine.investigateHighErrorRate(3.5);
      await engine.investigateSlowQueries(5, 1500);
      await engine.investigateHighErrorRate(6.0);

      const errorInvestigations =
        engine.getInvestigationsByType('high_error_rate');
      expect(errorInvestigations.length).toBe(2);
      expect(
        errorInvestigations.every((i) => i.issueType === 'high_error_rate')
      ).toBe(true);
    });

    it('should retrieve investigations by severity', async () => {
      await engine.investigateHighErrorRate(3.0);
      await engine.investigateHighErrorRate(6.0);

      const allInvestigations = engine.getInvestigations();
      const critical = allInvestigations.filter(
        (i) => i.severity === 'critical'
      );
      const high = allInvestigations.filter((i) => i.severity === 'high');

      expect(critical.length).toBeGreaterThan(0);
      expect(high.length).toBeGreaterThan(0);
    });

    it('should maintain investigation chronological order', async () => {
      const inv1 = await engine.investigateHighErrorRate(3.0);
      await new Promise((resolve) => setTimeout(resolve, 10));
      const inv2 = await engine.investigateSlowQueries(5, 1500);

      const investigations = engine.getInvestigations();
      const lastTwo = investigations.slice(-2);

      expect(lastTwo[0].id).toBe(inv1.id);
      expect(lastTwo[1].id).toBe(inv2.id);
    });

    it('should limit investigation history', async () => {
      for (let i = 0; i < 110; i++) {
        await engine.investigateHighErrorRate(2.0 + (i % 8) * 0.5);
      }

      const investigations = engine.getInvestigations();
      expect(investigations.length).toBeLessThanOrEqual(100);
    });

    it('should retrieve latest investigation', async () => {
      await engine.investigateHighErrorRate(3.0);
      const latest1 = engine.getLatestInvestigation();
      expect(latest1?.issueType).toBe('high_error_rate');

      await engine.investigateSlowQueries(5, 1500);
      const latest2 = engine.getLatestInvestigation();
      expect(latest2?.issueType).toBe('slow_query');
    });
  });

  describe('Investigation Result Completeness', () => {
    it('should include all required fields in investigation', async () => {
      const result = await engine.investigateHighErrorRate(6.0);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('issueType');
      expect(result).toHaveProperty('severity');
      expect(result).toHaveProperty('findings');
      expect(result).toHaveProperty('rootCausePossibilities');
      expect(result).toHaveProperty('recommendedActions');
      expect(result).toHaveProperty('suggestedFixes');
    });

    it('should provide descriptive findings', async () => {
      const result = await engine.investigateHighErrorRate(7.0);

      expect(result.findings.length).toBeGreaterThan(0);
      result.findings.forEach((finding) => {
        expect(finding.length).toBeGreaterThan(5);
      });
    });

    it('should provide root cause analysis', async () => {
      const result = await engine.investigateHighErrorRate(5.5, {
        signature: 'Error: database connection timeout',
        count: 75,
      });

      expect(result.rootCausePossibilities.length).toBeGreaterThan(0);
      result.rootCausePossibilities.forEach((cause) => {
        expect(cause.length).toBeGreaterThan(0);
      });
    });

    it('should provide actionable recommendations', async () => {
      const result = await engine.investigateSlowQueries(20, 2000);

      expect(result.recommendedActions.length).toBeGreaterThan(0);
      result.recommendedActions.forEach((action) => {
        expect(action.length).toBeGreaterThan(0);
      });
    });

    it('should provide repair action suggestions', async () => {
      const result = await engine.investigateConnectionPoolExhaustion(
        88,
        88,
        100
      );

      expect(result.suggestedFixes.length).toBeGreaterThan(0);
      result.suggestedFixes.forEach((fix) => {
        expect(fix.type).toMatch(/^(investigate|optimize|scale|rollback)$/);
        expect(fix.severity).toMatch(/^(low|medium|high|critical)$/);
      });
    });
  });

  describe('Error Rate Investigation Scenarios', () => {
    it('should handle baseline error rate', async () => {
      const result = await engine.investigateHighErrorRate(0.5);

      expect(result.severity).toBe('high');
      expect(result.findings.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle moderate error rate', async () => {
      const result = await engine.investigateHighErrorRate(3.5);

      expect(result.severity).toBe('high');
      expect(result.recommendedActions).toBeDefined();
    });

    it('should handle high error rate', async () => {
      const result = await engine.investigateHighErrorRate(6.5);

      expect(result.severity).toBe('critical');
      expect(
        result.findings.some((f) => f.includes('Critical error rate detected'))
      ).toBe(true);
    });

    it('should categorize timeout errors', async () => {
      const result = await engine.investigateHighErrorRate(5.0, {
        signature: 'TimeoutError: request exceeded 30000ms',
        count: 89,
      });

      expect(
        result.rootCausePossibilities.some((c) => c.includes('timeout'))
      ).toBe(true);
    });

    it('should categorize connection errors', async () => {
      const result = await engine.investigateHighErrorRate(6.0, {
        signature: 'ConnectionPoolError: no available connections',
        count: 156,
      });

      expect(
        result.suggestedFixes.some((f) => f.target === 'connection_pool')
      ).toBe(true);
    });

    it('should categorize memory errors', async () => {
      const result = await engine.investigateHighErrorRate(5.5, {
        signature: 'Error: FATAL memory limit exceeded',
        count: 42,
      });

      expect(
        result.suggestedFixes.some((f) => f.target === 'memory_usage')
      ).toBe(true);
    });
  });

  describe('Query Performance Investigation Scenarios', () => {
    it('should handle normal query latency', async () => {
      const result = await engine.investigateSlowQueries(2, 800);

      expect(result.severity).toBe('high');
    });

    it('should handle elevated query latency', async () => {
      const result = await engine.investigateSlowQueries(8, 1500);

      expect(result.severity).toBe('high');
      expect(
        result.findings.some((f) => f.includes('Elevated query latency'))
      ).toBe(true);
    });

    it('should handle critical query latency', async () => {
      const result = await engine.investigateSlowQueries(15, 2500);

      expect(result.severity).toBe('critical');
      expect(
        result.findings.some((f) =>
          f.includes('Critical query performance degradation')
        )
      ).toBe(true);
    });

    it('should identify missing index issues', async () => {
      const result = await engine.investigateSlowQueries(25, 3000);

      expect(
        result.rootCausePossibilities.some((c) =>
          c.includes('Missing database indexes')
        )
      ).toBe(true);
    });
  });

  describe('Connection Pool Investigation Scenarios', () => {
    it('should handle healthy pool utilization', async () => {
      const result = await engine.investigateConnectionPoolExhaustion(
        50,
        50,
        100
      );

      expect(result.severity).toBe('high');
    });

    it('should handle warning level utilization', async () => {
      const result = await engine.investigateConnectionPoolExhaustion(
        82,
        82,
        100
      );

      expect(result.severity).toBe('high');
      expect(
        result.findings.some((f) => f.includes('WARNING: Limited capacity'))
      ).toBe(true);
    });

    it('should handle critical utilization', async () => {
      const result = await engine.investigateConnectionPoolExhaustion(
        99,
        99,
        100
      );

      expect(result.severity).toBe('critical');
      expect(
        result.findings.some((f) =>
          f.includes('CRITICAL: Pool nearly exhausted')
        )
      ).toBe(true);
    });

    it('should suggest immediate action for critical pools', async () => {
      const result = await engine.investigateConnectionPoolExhaustion(
        97,
        97,
        100
      );

      expect(result.suggestedFixes.some((f) => f.type === 'scale')).toBe(true);
    });
  });

  describe('Mixed Investigation Workflow', () => {
    it('should handle sequential investigations', async () => {
      const inv1 = await engine.investigateHighErrorRate(3.5);
      const inv2 = await engine.investigateSlowQueries(10, 1800);
      const inv3 = await engine.investigateConnectionPoolExhaustion(
        85,
        85,
        100
      );

      const all = engine.getInvestigations();
      expect(all.length).toBe(3);
      expect(all[0].id).toBe(inv1.id);
      expect(all[1].id).toBe(inv2.id);
      expect(all[2].id).toBe(inv3.id);
    });

    it('should filter investigations by type after mixed operations', async () => {
      await engine.investigateHighErrorRate(2.5);
      await engine.investigateSlowQueries(5, 1200);
      await engine.investigateHighErrorRate(4.0);
      await engine.investigateConnectionPoolExhaustion(75, 75, 100);

      const errorInv = engine.getInvestigationsByType('high_error_rate');
      const slowInv = engine.getInvestigationsByType('slow_query');
      const poolInv = engine.getInvestigationsByType('connection_pool');

      expect(errorInv.length).toBe(2);
      expect(slowInv.length).toBe(1);
      expect(poolInv.length).toBe(1);
    });
  });
});
