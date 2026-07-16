import { describe, it, expect, beforeEach } from 'vitest';
import {
  AutoRepairEngine,
  InvestigationResult,
  RepairAction,
} from '../lib/observability/auto-repair';

describe('AutoRepairEngine', () => {
  let engine: AutoRepairEngine;

  beforeEach(() => {
    engine = new AutoRepairEngine();
  });

  describe('High Error Rate Investigation', () => {
    it('should detect critical error rate (>5%)', async () => {
      const result = await engine.investigateHighErrorRate(7.5);

      expect(result.issueType).toBe('high_error_rate');
      expect(result.severity).toBe('critical');
      expect(
        result.findings.some((f) => f.includes('Critical error rate detected'))
      ).toBe(true);
    });

    it('should detect elevated error rate (2-5%)', async () => {
      const result = await engine.investigateHighErrorRate(3.5);

      expect(result.severity).toBe('high');
      expect(
        result.findings.some((f) => f.includes('Elevated error rate detected'))
      ).toBe(true);
    });

    it('should classify error signatures', async () => {
      const result = await engine.investigateHighErrorRate(6.0, {
        signature: 'Error: Connection timeout',
        count: 42,
      });

      expect(
        result.findings.some((f) => f.includes('Top error signature'))
      ).toBe(true);
      expect(
        result.suggestedFixes.some((f) => f.target === 'slow_queries')
      ).toBe(true);
    });

    it('should identify connection pool errors', async () => {
      const result = await engine.investigateHighErrorRate(5.2, {
        signature: 'Error: Connection pool exhausted',
        count: 128,
      });

      expect(
        result.rootCausePossibilities.some((c) =>
          c.includes('Connection pool exhaustion')
        )
      ).toBe(true);
      expect(
        result.suggestedFixes.some((f) => f.target === 'connection_pool')
      ).toBe(true);
    });

    it('should identify memory errors', async () => {
      const result = await engine.investigateHighErrorRate(6.5, {
        signature: 'Error: Out of memory',
        count: 23,
      });

      expect(
        result.rootCausePossibilities.some((c) => c.includes('Memory leak'))
      ).toBe(true);
      expect(
        result.suggestedFixes.some((f) => f.target === 'memory_usage')
      ).toBe(true);
    });

    it('should generate critical recommendations for high error rates', async () => {
      const result = await engine.investigateHighErrorRate(7.0);

      expect(
        result.recommendedActions.some((a) => a.includes('Escalate to on-call'))
      ).toBe(true);
      expect(result.recommendedActions.length).toBeGreaterThan(0);
    });

    it('should generate elevated recommendations for moderate error rates', async () => {
      const result = await engine.investigateHighErrorRate(3.0);

      expect(
        result.recommendedActions.some((a) =>
          a.includes('Review recent deployments')
        )
      ).toBe(true);
    });

    it('should create investigation action with correct severity', async () => {
      const result = await engine.investigateHighErrorRate(6.0);

      const investigateAction = result.suggestedFixes.find(
        (f) => f.type === 'investigate'
      );
      expect(investigateAction).toBeDefined();
      expect(investigateAction?.severity).toBe('critical');
      expect(investigateAction?.autoExecute).toBe(true);
    });
  });

  describe('Slow Query Investigation', () => {
    it('should detect critical query latency (>2000ms)', async () => {
      const result = await engine.investigateSlowQueries(5, 2500);

      expect(result.issueType).toBe('slow_query');
      expect(result.severity).toBe('critical');
      expect(
        result.findings.some((f) =>
          f.includes('Critical query performance degradation')
        )
      ).toBe(true);
    });

    it('should detect elevated query latency (1000-2000ms)', async () => {
      const result = await engine.investigateSlowQueries(3, 1500);

      expect(result.severity).toBe('high');
      expect(
        result.findings.some((f) => f.includes('Elevated query latency'))
      ).toBe(true);
    });

    it('should suggest index optimization', async () => {
      const result = await engine.investigateSlowQueries(8, 2200);

      expect(
        result.suggestedFixes.some(
          (f) => f.type === 'optimize' && f.target === 'slow_queries'
        )
      ).toBe(true);
    });

    it('should identify missing indexes as root cause', async () => {
      const result = await engine.investigateSlowQueries(12, 3000);

      expect(
        result.rootCausePossibilities.some((c) =>
          c.includes('Missing database indexes')
        )
      ).toBe(true);
    });

    it('should generate query performance recommendations', async () => {
      const result = await engine.investigateSlowQueries(4, 1800);

      expect(
        result.recommendedActions.some((a) =>
          a.includes('Review query execution plans')
        )
      ).toBe(true);
      expect(
        result.recommendedActions.some((a) =>
          a.includes('Check for missing indexes')
        )
      ).toBe(true);
    });

    it('should include slow query count in findings', async () => {
      const result = await engine.investigateSlowQueries(15, 1200);

      expect(
        result.findings.some((f) => f.includes('15 slow queries detected'))
      ).toBe(true);
    });
  });

  describe('Connection Pool Exhaustion Investigation', () => {
    it('should detect critical connection pool exhaustion (>95%)', async () => {
      const result = await engine.investigateConnectionPoolExhaustion(
        97,
        97,
        100
      );

      expect(result.issueType).toBe('connection_pool');
      expect(result.severity).toBe('critical');
      expect(
        result.findings.some((f) =>
          f.includes('CRITICAL: Pool nearly exhausted')
        )
      ).toBe(true);
    });

    it('should detect warning level pool exhaustion (80-95%)', async () => {
      const result = await engine.investigateConnectionPoolExhaustion(
        85,
        85,
        100
      );

      expect(result.severity).toBe('high');
      expect(
        result.findings.some((f) =>
          f.includes('WARNING: Limited capacity for traffic spikes')
        )
      ).toBe(true);
    });

    it('should suggest immediate scaling for critical exhaustion', async () => {
      const result = await engine.investigateConnectionPoolExhaustion(
        96,
        96,
        100
      );

      expect(
        result.suggestedFixes.some(
          (f) => f.type === 'scale' && f.severity === 'critical'
        )
      ).toBe(true);
    });

    it('should identify connection leak as root cause', async () => {
      const result = await engine.investigateConnectionPoolExhaustion(
        99,
        99,
        100
      );

      expect(
        result.rootCausePossibilities.some((c) => c.includes('Connection leak'))
      ).toBe(true);
    });

    it('should suggest optimization for warning level exhaustion', async () => {
      const result = await engine.investigateConnectionPoolExhaustion(
        82,
        82,
        100
      );

      expect(result.suggestedFixes.some((f) => f.type === 'optimize')).toBe(
        true
      );
    });

    it('should include pool metrics in findings', async () => {
      const result = await engine.investigateConnectionPoolExhaustion(
        75,
        150,
        200
      );

      expect(
        result.findings.some((f) =>
          f.includes('Connection pool at 75.0% utilization')
        )
      ).toBe(true);
      expect(result.findings.some((f) => f.includes('Active: 150/200'))).toBe(
        true
      );
    });

    it('should generate appropriate recommendations for critical exhaustion', async () => {
      const result = await engine.investigateConnectionPoolExhaustion(
        98,
        98,
        100
      );

      expect(
        result.recommendedActions.some((a) =>
          a.includes('Prepare to scale connections immediately')
        )
      ).toBe(true);
    });
  });

  describe('Investigation History Management', () => {
    it('should store investigations in order', async () => {
      await engine.investigateHighErrorRate(3.0);
      await engine.investigateSlowQueries(5, 1500);
      await engine.investigateConnectionPoolExhaustion(85, 85, 100);

      const investigations = engine.getInvestigations();
      expect(investigations).toHaveLength(3);
      expect(investigations[0].issueType).toBe('high_error_rate');
      expect(investigations[1].issueType).toBe('slow_query');
      expect(investigations[2].issueType).toBe('connection_pool');
    });

    it('should retrieve latest investigation', async () => {
      await engine.investigateHighErrorRate(3.0);
      const latest1 = engine.getLatestInvestigation();
      expect(latest1?.issueType).toBe('high_error_rate');

      await engine.investigateSlowQueries(5, 1500);
      const latest2 = engine.getLatestInvestigation();
      expect(latest2?.issueType).toBe('slow_query');
    });

    it('should filter investigations by type', async () => {
      await engine.investigateHighErrorRate(3.0);
      await engine.investigateSlowQueries(5, 1500);
      await engine.investigateHighErrorRate(4.0);

      const errorRateInvestigations =
        engine.getInvestigationsByType('high_error_rate');
      expect(errorRateInvestigations).toHaveLength(2);
      expect(
        errorRateInvestigations.every((i) => i.issueType === 'high_error_rate')
      ).toBe(true);
    });

    it('should limit investigation history to max size', async () => {
      for (let i = 0; i < 105; i++) {
        await engine.investigateHighErrorRate(2.0 + (i % 5));
      }

      const investigations = engine.getInvestigations();
      expect(investigations.length).toBeLessThanOrEqual(100);
    });

    it('should return empty array for non-existent type', async () => {
      const investigations = engine.getInvestigationsByType('nonexistent_type');
      expect(investigations).toHaveLength(0);
    });
  });

  describe('Investigation Result Structure', () => {
    it('should include required fields in investigation result', async () => {
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

    it('should generate valid investigation IDs', async () => {
      const result = await engine.investigateHighErrorRate(5.0);

      expect(result.id).toMatch(/^INV-\d+$/);
    });

    it('should populate findings array', async () => {
      const result = await engine.investigateHighErrorRate(6.0);

      expect(result.findings.length).toBeGreaterThan(0);
      expect(result.findings.every((f) => typeof f === 'string')).toBe(true);
    });

    it('should populate root cause possibilities', async () => {
      const result = await engine.investigateHighErrorRate(7.0);

      expect(result.rootCausePossibilities.length).toBeGreaterThan(0);
      expect(
        result.rootCausePossibilities.every((c) => typeof c === 'string')
      ).toBe(true);
    });

    it('should populate recommended actions', async () => {
      const result = await engine.investigateHighErrorRate(5.0);

      expect(result.recommendedActions.length).toBeGreaterThan(0);
      expect(
        result.recommendedActions.every((a) => typeof a === 'string')
      ).toBe(true);
    });

    it('should include valid repair actions in suggested fixes', async () => {
      const result = await engine.investigateHighErrorRate(6.0, {
        signature: 'Error: timeout',
        count: 50,
      });

      expect(result.suggestedFixes.length).toBeGreaterThan(0);
      result.suggestedFixes.forEach((fix) => {
        expect(fix).toHaveProperty('id');
        expect(fix).toHaveProperty('type');
        expect(fix).toHaveProperty('severity');
        expect(fix).toHaveProperty('target');
        expect(fix).toHaveProperty('description');
        expect(fix).toHaveProperty('suggestedFix');
        expect(fix).toHaveProperty('autoExecute');
        expect(fix).toHaveProperty('timestamp');
      });
    });
  });

  describe('Repair Action Structure', () => {
    it('should generate valid repair action IDs', async () => {
      const result = await engine.investigateHighErrorRate(6.0);

      result.suggestedFixes.forEach((fix) => {
        expect(fix.id).toMatch(
          /^FIX-INV-\d+(-\d+|-investigate|-index|-scale|-optimize)?$/
        );
      });
    });

    it('should set appropriate severity for repair actions', async () => {
      const result = await engine.investigateHighErrorRate(6.0);

      result.suggestedFixes.forEach((fix) => {
        expect(['low', 'medium', 'high', 'critical']).toContain(fix.severity);
      });
    });

    it('should set autoExecute appropriately', async () => {
      const result = await engine.investigateHighErrorRate(6.0);

      const investigateAction = result.suggestedFixes.find(
        (f) => f.type === 'investigate'
      );
      expect(investigateAction?.autoExecute).toBe(true);

      const otherActions = result.suggestedFixes.filter(
        (f) => f.type !== 'investigate'
      );
      otherActions.forEach((action) => {
        expect(action.autoExecute).toBe(false);
      });
    });

    it('should include descriptive suggestions', async () => {
      const result = await engine.investigateHighErrorRate(7.0, {
        signature: 'Error: timeout',
        count: 30,
      });

      result.suggestedFixes.forEach((fix) => {
        expect(fix.description.length).toBeGreaterThan(0);
        expect(fix.suggestedFix.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Timestamp Handling', () => {
    it('should use ISO string timestamps', async () => {
      const result = await engine.investigateHighErrorRate(5.0);

      expect(result.timestamp).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.?\d*Z$/
      );
      result.suggestedFixes.forEach((fix) => {
        expect(fix.timestamp).toMatch(
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.?\d*Z$/
        );
      });
    });

    it('should maintain consistent timestamp ordering', async () => {
      const result1 = await engine.investigateHighErrorRate(3.0);
      const timestamp1 = new Date(result1.timestamp).getTime();

      await new Promise((resolve) => setTimeout(resolve, 10));

      const result2 = await engine.investigateSlowQueries(5, 1500);
      const timestamp2 = new Date(result2.timestamp).getTime();

      expect(timestamp2).toBeGreaterThanOrEqual(timestamp1);
    });
  });

  describe('Multiple Investigation Types', () => {
    it('should handle mixed investigation types', async () => {
      const errorResult = await engine.investigateHighErrorRate(4.5);
      const queryResult = await engine.investigateSlowQueries(10, 1800);
      const poolResult = await engine.investigateConnectionPoolExhaustion(
        88,
        88,
        100
      );

      const all = engine.getInvestigations();
      expect(all).toHaveLength(3);
      expect(all[0].issueType).toBe('high_error_rate');
      expect(all[1].issueType).toBe('slow_query');
      expect(all[2].issueType).toBe('connection_pool');

      const byType = engine.getInvestigationsByType('slow_query');
      expect(byType).toHaveLength(1);
      expect(byType[0].id).toBe(queryResult.id);
    });
  });
});
