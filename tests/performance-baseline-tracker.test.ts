import { describe, it, expect, beforeEach } from 'vitest';
import { PerformanceBaselineTracker } from '../lib/performance-baseline-tracker';

describe('performance-baseline-tracker (DNA-GOV-009)', () => {
  let tracker: PerformanceBaselineTracker;

  beforeEach(() => {
    tracker = new PerformanceBaselineTracker();
  });

  describe('recordMetric', () => {
    it('stores performance metrics', () => {
      tracker.recordMetric({
        name: 'api-response-time',
        value: 45.3,
        unit: 'ms',
        timestamp: '2026-07-10T08:00:00Z',
      });

      const metrics = tracker.getMetrics();
      expect(metrics).toHaveLength(1);
      expect(metrics[0].name).toBe('api-response-time');
      expect(metrics[0].value).toBe(45.3);
    });

    it('stores multiple metrics', () => {
      tracker.recordMetric({
        name: 'api-response-time',
        value: 45,
        unit: 'ms',
        timestamp: '2026-07-10T08:00:00Z',
      });

      tracker.recordMetric({
        name: 'bundle-size',
        value: 125000,
        unit: 'bytes',
        timestamp: '2026-07-10T08:00:00Z',
      });

      expect(tracker.getMetrics()).toHaveLength(2);
    });

    it('includes tags in metrics', () => {
      tracker.recordMetric({
        name: 'api-response-time',
        value: 50,
        unit: 'ms',
        timestamp: '2026-07-10T08:00:00Z',
        tags: { endpoint: '/api/health', status: 'success' },
      });

      const metrics = tracker.getMetrics();
      expect(metrics[0].tags).toEqual({
        endpoint: '/api/health',
        status: 'success',
      });
    });
  });

  describe('updateBaseline', () => {
    it('calculates baseline from sufficient samples', () => {
      tracker.recordMetric({
        name: 'latency',
        value: 40,
        unit: 'ms',
        timestamp: '2026-07-10T08:00:00Z',
      });
      tracker.recordMetric({
        name: 'latency',
        value: 45,
        unit: 'ms',
        timestamp: '2026-07-10T08:01:00Z',
      });
      tracker.recordMetric({
        name: 'latency',
        value: 50,
        unit: 'ms',
        timestamp: '2026-07-10T08:02:00Z',
      });

      tracker.updateBaseline('latency');

      const baseline = tracker.getBaseline('latency');
      expect(baseline).toBeTruthy();
      expect(baseline?.avgValue).toBe(45);
      expect(baseline?.minValue).toBe(40);
      expect(baseline?.maxValue).toBe(50);
      expect(baseline?.samples).toBe(3);
    });

    it('does not create baseline with insufficient samples', () => {
      tracker.recordMetric({
        name: 'metric',
        value: 10,
        unit: 'ms',
        timestamp: '2026-07-10T08:00:00Z',
      });
      tracker.recordMetric({
        name: 'metric',
        value: 20,
        unit: 'ms',
        timestamp: '2026-07-10T08:01:00Z',
      });

      tracker.updateBaseline('metric');

      const baseline = tracker.getBaseline('metric');
      expect(baseline).toBeUndefined();
    });

    it('calculates standard deviation', () => {
      // Values: 10, 20, 30 (mean=20, variance=66.67, stddev=8.16)
      tracker.recordMetric({
        name: 'metric',
        value: 10,
        unit: 'ms',
        timestamp: '2026-07-10T08:00:00Z',
      });
      tracker.recordMetric({
        name: 'metric',
        value: 20,
        unit: 'ms',
        timestamp: '2026-07-10T08:01:00Z',
      });
      tracker.recordMetric({
        name: 'metric',
        value: 30,
        unit: 'ms',
        timestamp: '2026-07-10T08:02:00Z',
      });

      tracker.updateBaseline('metric');

      const baseline = tracker.getBaseline('metric');
      expect(baseline?.stdDev).toBeGreaterThan(0);
      expect(baseline?.stdDev).toBeLessThan(10);
    });

    it('uses custom threshold percentage', () => {
      tracker.recordMetric({
        name: 'metric',
        value: 100,
        unit: 'ms',
        timestamp: '2026-07-10T08:00:00Z',
      });
      tracker.recordMetric({
        name: 'metric',
        value: 100,
        unit: 'ms',
        timestamp: '2026-07-10T08:01:00Z',
      });
      tracker.recordMetric({
        name: 'metric',
        value: 100,
        unit: 'ms',
        timestamp: '2026-07-10T08:02:00Z',
      });

      tracker.updateBaseline('metric', 15);

      const baseline = tracker.getBaseline('metric');
      expect(baseline?.thresholdPercentage).toBe(15);
    });
  });

  describe('detectRegressions', () => {
    it('detects performance regression', () => {
      // Establish baseline with values around 100
      tracker.recordMetric({
        name: 'latency',
        value: 95,
        unit: 'ms',
        timestamp: '2026-07-10T08:00:00Z',
      });
      tracker.recordMetric({
        name: 'latency',
        value: 100,
        unit: 'ms',
        timestamp: '2026-07-10T08:01:00Z',
      });
      tracker.recordMetric({
        name: 'latency',
        value: 105,
        unit: 'ms',
        timestamp: '2026-07-10T08:02:00Z',
      });
      tracker.updateBaseline('latency', 20);

      // Add regression (50% over baseline)
      tracker.recordMetric({
        name: 'latency',
        value: 150,
        unit: 'ms',
        timestamp: '2026-07-10T08:10:00Z',
      });
      tracker.recordMetric({
        name: 'latency',
        value: 155,
        unit: 'ms',
        timestamp: '2026-07-10T08:11:00Z',
      });

      const regressions = tracker.detectRegressions();

      expect(regressions).toHaveLength(1);
      expect(regressions[0].metric).toBe('latency');
      expect(regressions[0].regressionPercentage).toBeGreaterThan(40);
    });

    it('calculates regression percentage correctly', () => {
      tracker.recordMetric({
        name: 'metric',
        value: 100,
        unit: 'ms',
        timestamp: '2026-07-10T08:00:00Z',
      });
      tracker.recordMetric({
        name: 'metric',
        value: 100,
        unit: 'ms',
        timestamp: '2026-07-10T08:01:00Z',
      });
      tracker.recordMetric({
        name: 'metric',
        value: 100,
        unit: 'ms',
        timestamp: '2026-07-10T08:02:00Z',
      });
      tracker.updateBaseline('metric', 20);

      // Add 30% regression
      tracker.recordMetric({
        name: 'metric',
        value: 130,
        unit: 'ms',
        timestamp: '2026-07-10T08:10:00Z',
      });
      tracker.recordMetric({
        name: 'metric',
        value: 130,
        unit: 'ms',
        timestamp: '2026-07-10T08:11:00Z',
      });

      const regressions = tracker.detectRegressions();

      expect(regressions).toHaveLength(1);
      expect(Math.abs(regressions[0].regressionPercentage - 30)).toBeLessThan(
        1
      );
    });

    it('does not report regression within threshold', () => {
      tracker.recordMetric({
        name: 'metric',
        value: 100,
        unit: 'ms',
        timestamp: '2026-07-10T08:00:00Z',
      });
      tracker.recordMetric({
        name: 'metric',
        value: 100,
        unit: 'ms',
        timestamp: '2026-07-10T08:01:00Z',
      });
      tracker.recordMetric({
        name: 'metric',
        value: 100,
        unit: 'ms',
        timestamp: '2026-07-10T08:02:00Z',
      });
      tracker.updateBaseline('metric', 20);

      // Add 10% variation (within 20% threshold)
      tracker.recordMetric({
        name: 'metric',
        value: 110,
        unit: 'ms',
        timestamp: '2026-07-10T08:10:00Z',
      });
      tracker.recordMetric({
        name: 'metric',
        value: 110,
        unit: 'ms',
        timestamp: '2026-07-10T08:11:00Z',
      });

      const regressions = tracker.detectRegressions();

      expect(regressions).toHaveLength(0);
    });

    it('classifies regression severity correctly', () => {
      tracker.recordMetric({
        name: 'metric',
        value: 100,
        unit: 'ms',
        timestamp: '2026-07-10T08:00:00Z',
      });
      tracker.recordMetric({
        name: 'metric',
        value: 100,
        unit: 'ms',
        timestamp: '2026-07-10T08:01:00Z',
      });
      tracker.recordMetric({
        name: 'metric',
        value: 100,
        unit: 'ms',
        timestamp: '2026-07-10T08:02:00Z',
      });
      tracker.updateBaseline('metric', 20); // 20% threshold

      // Add 60% regression (exceeds threshold * 2)
      tracker.recordMetric({
        name: 'metric',
        value: 160,
        unit: 'ms',
        timestamp: '2026-07-10T08:10:00Z',
      });
      tracker.recordMetric({
        name: 'metric',
        value: 160,
        unit: 'ms',
        timestamp: '2026-07-10T08:11:00Z',
      });

      const regressions = tracker.detectRegressions();

      expect(regressions[0].severity).toBe('critical');
    });

    it('detects multiple regressions across metrics', () => {
      // First metric
      tracker.recordMetric({
        name: 'latency',
        value: 100,
        unit: 'ms',
        timestamp: '2026-07-10T08:00:00Z',
      });
      tracker.recordMetric({
        name: 'latency',
        value: 100,
        unit: 'ms',
        timestamp: '2026-07-10T08:01:00Z',
      });
      tracker.recordMetric({
        name: 'latency',
        value: 100,
        unit: 'ms',
        timestamp: '2026-07-10T08:02:00Z',
      });
      tracker.updateBaseline('latency', 20);

      // Second metric
      tracker.recordMetric({
        name: 'bundle-size',
        value: 100000,
        unit: 'bytes',
        timestamp: '2026-07-10T08:00:00Z',
      });
      tracker.recordMetric({
        name: 'bundle-size',
        value: 100000,
        unit: 'bytes',
        timestamp: '2026-07-10T08:01:00Z',
      });
      tracker.recordMetric({
        name: 'bundle-size',
        value: 100000,
        unit: 'bytes',
        timestamp: '2026-07-10T08:02:00Z',
      });
      tracker.updateBaseline('bundle-size', 20);

      // Add regressions to both
      tracker.recordMetric({
        name: 'latency',
        value: 150,
        unit: 'ms',
        timestamp: '2026-07-10T08:10:00Z',
      });
      tracker.recordMetric({
        name: 'bundle-size',
        value: 150000,
        unit: 'bytes',
        timestamp: '2026-07-10T08:10:00Z',
      });

      const regressions = tracker.detectRegressions();

      expect(regressions.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('generateReport', () => {
    it('generates performance report', () => {
      tracker.recordMetric({
        name: 'metric1',
        value: 100,
        unit: 'ms',
        timestamp: '2026-07-10T08:00:00Z',
      });
      tracker.recordMetric({
        name: 'metric1',
        value: 100,
        unit: 'ms',
        timestamp: '2026-07-10T08:01:00Z',
      });
      tracker.recordMetric({
        name: 'metric1',
        value: 100,
        unit: 'ms',
        timestamp: '2026-07-10T08:02:00Z',
      });
      tracker.updateBaseline('metric1');

      const report = tracker.generateReport();

      expect(report.timestamp).toBeTruthy();
      expect(report.metricsAnalyzed).toBeGreaterThan(0);
      expect(report.baselinesEstablished).toBeGreaterThan(0);
    });

    it('marks report as ok when no regressions', () => {
      tracker.recordMetric({
        name: 'metric',
        value: 100,
        unit: 'ms',
        timestamp: '2026-07-10T08:00:00Z',
      });
      tracker.recordMetric({
        name: 'metric',
        value: 100,
        unit: 'ms',
        timestamp: '2026-07-10T08:01:00Z',
      });
      tracker.recordMetric({
        name: 'metric',
        value: 100,
        unit: 'ms',
        timestamp: '2026-07-10T08:02:00Z',
      });
      tracker.updateBaseline('metric');

      const report = tracker.generateReport();

      expect(report.ok).toBe(true);
    });

    it('marks report as not ok when critical regression', () => {
      tracker.recordMetric({
        name: 'metric',
        value: 100,
        unit: 'ms',
        timestamp: '2026-07-10T08:00:00Z',
      });
      tracker.recordMetric({
        name: 'metric',
        value: 100,
        unit: 'ms',
        timestamp: '2026-07-10T08:01:00Z',
      });
      tracker.recordMetric({
        name: 'metric',
        value: 100,
        unit: 'ms',
        timestamp: '2026-07-10T08:02:00Z',
      });
      tracker.updateBaseline('metric', 20);

      tracker.recordMetric({
        name: 'metric',
        value: 160,
        unit: 'ms',
        timestamp: '2026-07-10T08:10:00Z',
      });
      tracker.recordMetric({
        name: 'metric',
        value: 160,
        unit: 'ms',
        timestamp: '2026-07-10T08:11:00Z',
      });

      const report = tracker.generateReport();

      expect(report.ok).toBe(false);
    });

    it('generates appropriate summary', () => {
      tracker.recordMetric({
        name: 'metric',
        value: 100,
        unit: 'ms',
        timestamp: '2026-07-10T08:00:00Z',
      });
      tracker.recordMetric({
        name: 'metric',
        value: 100,
        unit: 'ms',
        timestamp: '2026-07-10T08:01:00Z',
      });
      tracker.recordMetric({
        name: 'metric',
        value: 100,
        unit: 'ms',
        timestamp: '2026-07-10T08:02:00Z',
      });
      tracker.updateBaseline('metric');

      const report = tracker.generateReport();

      expect(report.summary).toContain('✅');
    });
  });

  describe('getBaseline', () => {
    it('returns baseline for established metric', () => {
      tracker.recordMetric({
        name: 'metric',
        value: 100,
        unit: 'ms',
        timestamp: '2026-07-10T08:00:00Z',
      });
      tracker.recordMetric({
        name: 'metric',
        value: 100,
        unit: 'ms',
        timestamp: '2026-07-10T08:01:00Z',
      });
      tracker.recordMetric({
        name: 'metric',
        value: 100,
        unit: 'ms',
        timestamp: '2026-07-10T08:02:00Z',
      });
      tracker.updateBaseline('metric');

      const baseline = tracker.getBaseline('metric');
      expect(baseline).toBeTruthy();
    });

    it('returns undefined for non-existent metric', () => {
      const baseline = tracker.getBaseline('non-existent');
      expect(baseline).toBeUndefined();
    });
  });

  describe('getAllBaselines', () => {
    it('returns all established baselines', () => {
      // Metric 1
      tracker.recordMetric({
        name: 'metric1',
        value: 100,
        unit: 'ms',
        timestamp: '2026-07-10T08:00:00Z',
      });
      tracker.recordMetric({
        name: 'metric1',
        value: 100,
        unit: 'ms',
        timestamp: '2026-07-10T08:01:00Z',
      });
      tracker.recordMetric({
        name: 'metric1',
        value: 100,
        unit: 'ms',
        timestamp: '2026-07-10T08:02:00Z',
      });
      tracker.updateBaseline('metric1');

      // Metric 2
      tracker.recordMetric({
        name: 'metric2',
        value: 200,
        unit: 'bytes',
        timestamp: '2026-07-10T08:00:00Z',
      });
      tracker.recordMetric({
        name: 'metric2',
        value: 200,
        unit: 'bytes',
        timestamp: '2026-07-10T08:01:00Z',
      });
      tracker.recordMetric({
        name: 'metric2',
        value: 200,
        unit: 'bytes',
        timestamp: '2026-07-10T08:02:00Z',
      });
      tracker.updateBaseline('metric2');

      const baselines = tracker.getAllBaselines();

      expect(baselines).toHaveLength(2);
    });
  });

  describe('reset', () => {
    it('clears all data', () => {
      tracker.recordMetric({
        name: 'metric',
        value: 100,
        unit: 'ms',
        timestamp: '2026-07-10T08:00:00Z',
      });
      tracker.recordMetric({
        name: 'metric',
        value: 100,
        unit: 'ms',
        timestamp: '2026-07-10T08:01:00Z',
      });
      tracker.recordMetric({
        name: 'metric',
        value: 100,
        unit: 'ms',
        timestamp: '2026-07-10T08:02:00Z',
      });
      tracker.updateBaseline('metric');

      tracker.reset();

      expect(tracker.getMetrics()).toHaveLength(0);
      expect(tracker.getAllBaselines()).toHaveLength(0);
    });
  });

  describe('metric history limit', () => {
    it('trims history to prevent unbounded growth', () => {
      // Add 1100 metrics (exceeds max of 1000)
      for (let i = 0; i < 1100; i++) {
        tracker.recordMetric({
          name: 'metric',
          value: 100 + i,
          unit: 'ms',
          timestamp: `2026-07-10T08:${i % 60}:${i % 60}Z`,
        });
      }

      const metrics = tracker.getMetrics();
      expect(metrics.length).toBeLessThanOrEqual(1000);
    });
  });
});
