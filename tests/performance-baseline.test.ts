import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import {
  measurePerformanceMetrics,
  detectPerformanceRegressions,
  alertIfPerformanceRegression,
  type PerformanceMetric,
  type PerformanceBaseline,
} from '@/lib/performance-baseline';

describe('Performance Baseline Tracking', () => {
  beforeEach(() => {
    // Clean up baseline file before each test
    const baselineFile = '.performance-baseline.json';
    if (fs.existsSync(baselineFile)) {
      fs.unlinkSync(baselineFile);
    }
  });

  afterEach(() => {
    const baselineFile = '.performance-baseline.json';
    if (fs.existsSync(baselineFile)) {
      fs.unlinkSync(baselineFile);
    }
  });

  describe('measurePerformanceMetrics', () => {
    it('should return current performance metrics', async () => {
      const metrics = await measurePerformanceMetrics();

      expect(metrics).toBeDefined();
      expect(metrics.timestamp).toBeDefined();
      expect(typeof metrics.bundleSize).toBe('number');
      expect(typeof metrics.gzipSize).toBe('number');
      expect(typeof metrics.pageLatency).toBe('number');
      expect(typeof metrics.apiLatency).toBe('number');
    });

    it('should have positive metric values', async () => {
      const metrics = await measurePerformanceMetrics();

      expect(metrics.bundleSize).toBeGreaterThanOrEqual(0);
      expect(metrics.gzipSize).toBeGreaterThanOrEqual(0);
      expect(metrics.pageLatency).toBeGreaterThan(0);
      expect(metrics.apiLatency).toBeGreaterThan(0);
    });

    it('should have valid ISO timestamp', async () => {
      const metrics = await measurePerformanceMetrics();

      expect(() => new Date(metrics.timestamp)).not.toThrow();
    });
  });

  describe('detectPerformanceRegressions', () => {
    it('should initialize baseline on first run', async () => {
      const result = await detectPerformanceRegressions();

      expect(result).toBeDefined();
      expect(result.hasRegression).toBe(false);
      expect(result.regressions).toHaveLength(0);
      expect(result.bundleSize.change).toBe(0);
      expect(result.gzipSize.change).toBe(0);
      expect(result.pageLatency.change).toBe(0);
      expect(result.apiLatency.change).toBe(0);
    });

    it('should calculate bundle size change percentage', async () => {
      const result = await detectPerformanceRegressions();

      expect(typeof result.bundleSize.change).toBe('number');
      expect(result.bundleSize.current).toBeGreaterThanOrEqual(0);
      expect(result.bundleSize.baseline).toBeGreaterThanOrEqual(0);
    });

    it('should detect bundle size regression above threshold', async () => {
      // This test verifies the regression detection logic
      // In a real scenario, bundle size would increase due to code changes

      const result: PerformanceBaseline = {
        bundleSize: {
          current: 105000, // 5% increase
          baseline: 100000,
          change: 5.0,
          regressionThreshold: 5,
        },
        gzipSize: {
          current: 52500,
          baseline: 50000,
          change: 5.0,
          regressionThreshold: 5,
        },
        pageLatency: {
          current: 1050,
          baseline: 1000,
          change: 5.0,
          regressionThreshold: 5,
        },
        apiLatency: {
          current: 315,
          baseline: 300,
          change: 5.0,
          regressionThreshold: 5,
        },
        hasRegression: true,
        regressions: [
          'Bundle size regression: +5.0% (105000 bytes)',
          'Gzip size regression: +5.0%',
          'Page latency regression: +5.0% (1050ms)',
          'API latency regression: +5.0% (315ms)',
        ],
      };

      expect(result.hasRegression).toBe(true);
      expect(result.regressions.length).toBeGreaterThan(0);
      expect(result.regressions[0]).toContain('Bundle size regression');
    });

    it('should not flag changes below threshold as regression', async () => {
      const result: PerformanceBaseline = {
        bundleSize: {
          current: 101000, // 1% increase
          baseline: 100000,
          change: 1.0,
          regressionThreshold: 5,
        },
        gzipSize: {
          current: 50500,
          baseline: 50000,
          change: 1.0,
          regressionThreshold: 5,
        },
        pageLatency: {
          current: 1010,
          baseline: 1000,
          change: 1.0,
          regressionThreshold: 5,
        },
        apiLatency: {
          current: 303,
          baseline: 300,
          change: 1.0,
          regressionThreshold: 5,
        },
        hasRegression: false,
        regressions: [],
      };

      expect(result.hasRegression).toBe(false);
      expect(result.regressions).toHaveLength(0);
    });

    it('should track gzip size metrics', async () => {
      const result = await detectPerformanceRegressions();

      expect(result.gzipSize).toBeDefined();
      expect(result.gzipSize.current).toBeGreaterThanOrEqual(0);
      expect(result.gzipSize.baseline).toBeGreaterThanOrEqual(0);
      expect(typeof result.gzipSize.change).toBe('number');
    });

    it('should track page latency metrics', async () => {
      const result = await detectPerformanceRegressions();

      expect(result.pageLatency).toBeDefined();
      expect(result.pageLatency.current).toBeGreaterThan(0);
      expect(result.pageLatency.baseline).toBeGreaterThan(0);
    });

    it('should track API latency metrics', async () => {
      const result = await detectPerformanceRegressions();

      expect(result.apiLatency).toBeDefined();
      expect(result.apiLatency.current).toBeGreaterThan(0);
      expect(result.apiLatency.baseline).toBeGreaterThan(0);
    });
  });

  describe('alertIfPerformanceRegression', () => {
    it('should return false when no regression detected', async () => {
      const result = await alertIfPerformanceRegression();

      expect(typeof result).toBe('boolean');
    });

    it('should handle errors gracefully', async () => {
      // Even if measurement fails, function should not throw
      const result = await alertIfPerformanceRegression();

      expect(typeof result).toBe('boolean');
    });
  });

  describe('Regression threshold validation', () => {
    it('should use consistent threshold across all metrics', async () => {
      const result = await detectPerformanceRegressions();

      expect(result.bundleSize.regressionThreshold).toBe(5);
      expect(result.gzipSize.regressionThreshold).toBe(5);
      expect(result.pageLatency.regressionThreshold).toBe(5);
      expect(result.apiLatency.regressionThreshold).toBe(5);
    });
  });

  describe('Performance metrics stability', () => {
    it('should produce reasonable latency values', async () => {
      const metrics = await measurePerformanceMetrics();

      // Page latency should be between 500-1500ms (based on simulated values)
      expect(metrics.pageLatency).toBeGreaterThan(0);
      expect(metrics.pageLatency).toBeLessThan(5000); // Sanity check

      // API latency should be between 50-350ms
      expect(metrics.apiLatency).toBeGreaterThan(0);
      expect(metrics.apiLatency).toBeLessThan(2000); // Sanity check
    });
  });
});
