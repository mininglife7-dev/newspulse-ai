import { describe, it, expect, beforeEach } from 'vitest';
import {
  recordLatency,
  timeAsync,
  timeSync,
  getMetrics,
  exportBaseline,
  validateSLA,
  detectRegression,
  __resetMetrics,
} from '@/lib/performance-metrics';

describe('performance-metrics', () => {
  beforeEach(() => {
    __resetMetrics();
  });

  it('records individual latency measurements', () => {
    recordLatency('api-request', 100);
    recordLatency('api-request', 120);
    recordLatency('api-request', 110);

    const metrics = getMetrics();
    expect(metrics['api-request'].measurements.length).toBe(3);
    expect(metrics['api-request'].min).toBe(100);
    expect(metrics['api-request'].max).toBe(120);
  });

  it('calculates mean correctly', () => {
    recordLatency('test-metric', 100);
    recordLatency('test-metric', 200);
    recordLatency('test-metric', 300);

    const metrics = getMetrics();
    expect(metrics['test-metric'].mean).toBe(200);
  });

  it('calculates median correctly', () => {
    for (let i = 1; i <= 5; i++) {
      recordLatency('test-metric', i * 10);
    }

    const metrics = getMetrics();
    expect(metrics['test-metric'].median).toBe(30);
  });

  it('calculates percentiles correctly', () => {
    for (let i = 1; i <= 100; i++) {
      recordLatency('test-metric', i);
    }

    const metrics = getMetrics();
    expect(metrics['test-metric'].p95).toBeGreaterThanOrEqual(95);
    expect(metrics['test-metric'].p99).toBeGreaterThanOrEqual(99);
  });

  it('times async operations', async () => {
    const result = await timeAsync('async-op', async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
      return 'done';
    });

    expect(result).toBe('done');

    const metrics = getMetrics();
    expect(metrics['async-op'].measurements[0]).toBeGreaterThanOrEqual(80);
  });

  it('times sync operations', () => {
    const result = timeSync('sync-op', () => {
      let sum = 0;
      for (let i = 0; i < 1000000; i++) {
        sum += i;
      }
      return sum;
    });

    expect(result).toBeGreaterThan(0);

    const metrics = getMetrics();
    expect(metrics['sync-op'].measurements.length).toBe(1);
    expect(metrics['sync-op'].measurements[0]).toBeGreaterThan(0);
  });

  it('handles multiple metrics independently', () => {
    recordLatency('endpoint-a', 100);
    recordLatency('endpoint-a', 110);
    recordLatency('endpoint-b', 50);
    recordLatency('endpoint-b', 60);

    const metrics = getMetrics();
    expect(metrics['endpoint-a'].mean).toBe(105);
    expect(metrics['endpoint-b'].mean).toBe(55);
    expect(metrics['endpoint-a'].mean).not.toBe(metrics['endpoint-b'].mean);
  });

  it('exports baseline with metadata', () => {
    recordLatency('test', 100);

    const baseline = exportBaseline('production', 1000);

    expect(baseline.timestamp).toBeDefined();
    expect(baseline.environment).toBe('production');
    expect(baseline.nodeVersion).toBe(process.version);
    expect(baseline.requestCount).toBe(1000);
    expect(baseline.metrics['test']).toBeDefined();
  });

  it('validates SLA compliance', () => {
    recordLatency('api-endpoint', 100);
    recordLatency('api-endpoint', 150);
    recordLatency('api-endpoint', 200);
    recordLatency('api-endpoint', 250);
    recordLatency('api-endpoint', 300);

    const metrics = getMetrics()['api-endpoint'];

    const slaPass = validateSLA(metrics, {
      endpoint: 'api-endpoint',
      p95MaxMs: 300,
      p99MaxMs: 300,
      minThroughput: 100,
    });

    expect(slaPass.passed).toBe(true);
    expect(slaPass.violations.length).toBe(0);
  });

  it('detects SLA violations', () => {
    recordLatency('api-endpoint', 100);
    recordLatency('api-endpoint', 150);
    recordLatency('api-endpoint', 200);
    recordLatency('api-endpoint', 250);
    recordLatency('api-endpoint', 500); // Outlier

    const metrics = getMetrics()['api-endpoint'];

    const slaFail = validateSLA(metrics, {
      endpoint: 'api-endpoint',
      p95MaxMs: 150,
      p99MaxMs: 150,
      minThroughput: 100,
    });

    expect(slaFail.passed).toBe(false);
    expect(slaFail.violations.length).toBeGreaterThan(0);
  });

  it('detects performance regressions', () => {
    // Baseline: average ~100ms
    const baseline = {
      name: 'endpoint',
      description: 'test',
      unit: 'ms',
      measurements: Array(100).fill(0).map((_, i) => 95 + (i % 10)),
      min: 95,
      max: 105,
      mean: 100,
      median: 100,
      p95: 105,
      p99: 105,
    };

    // Current: average ~150ms (50% slower)
    recordLatency('endpoint', 150);
    recordLatency('endpoint', 160);
    recordLatency('endpoint', 140);
    recordLatency('endpoint', 155);
    recordLatency('endpoint', 145);

    const current = getMetrics()['endpoint'];
    const regression = detectRegression(current, baseline, 5);

    expect(regression.regressed).toBe(true);
    expect(regression.change).toBeGreaterThan(5);
  });

  it('tolerates minor performance variance', () => {
    const baseline = {
      name: 'endpoint',
      description: 'test',
      unit: 'ms',
      measurements: Array(100).fill(100),
      min: 100,
      max: 100,
      mean: 100,
      median: 100,
      p95: 100,
      p99: 100,
    };

    // Current: 102-103ms (2-3% variance, within tolerance)
    recordLatency('endpoint', 102);
    recordLatency('endpoint', 103);
    recordLatency('endpoint', 101);

    const current = getMetrics()['endpoint'];
    const regression = detectRegression(current, baseline, 5);

    expect(regression.regressed).toBe(false);
  });

  it('tracks multiple operation types separately', async () => {
    await timeAsync('database-query', async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    timeSync('json-parse', () => {
      JSON.parse('{"test": true}');
    });

    recordLatency('cache-lookup', 5);

    const metrics = getMetrics();
    expect(metrics['database-query']).toBeDefined();
    expect(metrics['json-parse']).toBeDefined();
    expect(metrics['cache-lookup']).toBeDefined();
    expect(metrics['database-query'].p95).toBeGreaterThan(
      metrics['cache-lookup'].p95
    );
  });
});
