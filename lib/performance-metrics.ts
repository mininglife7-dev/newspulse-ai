/**
 * Performance Metrics Collection & Analysis
 *
 * Captures latency, throughput, and resource utilization across:
 * - API endpoints
 * - Database queries
 * - Business logic operations
 * - Full request lifecycle
 *
 * Enables Phase 3 regression detection and performance SLA validation.
 */

export interface MetricPoint {
  timestamp: string;
  name: string;
  value: number;
  unit: string;
  tags?: Record<string, string>;
}

export interface PerformanceMetric {
  name: string;
  description: string;
  unit: string;
  measurements: number[];
  min: number;
  max: number;
  mean: number;
  median: number;
  p95: number;
  p99: number;
}

export interface PerformanceBaseline {
  timestamp: string;
  environment: string;
  nodeVersion: string;
  testDuration: number;
  requestCount: number;
  metrics: Record<string, PerformanceMetric>;
}

class MetricsCollector {
  private measurements: Map<string, number[]> = new Map();
  private startTime = Date.now();

  /**
   * Record a single measurement
   */
  record(name: string, value: number): void {
    if (!this.measurements.has(name)) {
      this.measurements.set(name, []);
    }
    this.measurements.get(name)!.push(value);
  }

  /**
   * Record multiple measurements in batch
   */
  recordBatch(name: string, values: number[]): void {
    if (!this.measurements.has(name)) {
      this.measurements.set(name, []);
    }
    this.measurements.get(name)!.push(...values);
  }

  /**
   * Get aggregated metrics for all recorded measurements
   */
  getMetrics(): Record<string, PerformanceMetric> {
    const metrics: Record<string, PerformanceMetric> = {};

    for (const [name, values] of this.measurements) {
      if (values.length === 0) continue;

      const sorted = [...values].sort((a, b) => a - b);
      const len = sorted.length;

      metrics[name] = {
        name,
        description: name,
        unit: 'ms',
        measurements: values,
        min: sorted[0],
        max: sorted[len - 1],
        mean: Math.round(values.reduce((a, b) => a + b, 0) / len),
        median: sorted[Math.floor(len / 2)],
        p95: sorted[Math.floor(len * 0.95)],
        p99: sorted[Math.floor(len * 0.99)],
      };
    }

    return metrics;
  }

  /**
   * Export baseline for versioning
   */
  exportBaseline(
    environment: string,
    requestCount: number
  ): PerformanceBaseline {
    return {
      timestamp: new Date().toISOString(),
      environment,
      nodeVersion: process.version,
      testDuration: Date.now() - this.startTime,
      requestCount,
      metrics: this.getMetrics(),
    };
  }

  /**
   * Reset measurements (for testing)
   */
  reset(): void {
    this.measurements.clear();
    this.startTime = Date.now();
  }
}

// Global metrics instance
const collector = new MetricsCollector();

/**
 * Record latency measurement for a named operation
 */
export function recordLatency(name: string, latencyMs: number): void {
  collector.record(name, latencyMs);
}

/**
 * Time an async operation and record latency
 */
export async function timeAsync<T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = Date.now();
  try {
    return await fn();
  } finally {
    const duration = Date.now() - start;
    recordLatency(name, duration);
  }
}

/**
 * Time a sync operation and record latency
 */
export function timeSync<T>(name: string, fn: () => T): T {
  const start = Date.now();
  try {
    return fn();
  } finally {
    const duration = Date.now() - start;
    recordLatency(name, duration);
  }
}

/**
 * Get all collected metrics
 */
export function getMetrics(): Record<string, PerformanceMetric> {
  return collector.getMetrics();
}

/**
 * Export current metrics as a baseline
 */
export function exportBaseline(
  environment: string,
  requestCount: number
): PerformanceBaseline {
  return collector.exportBaseline(environment, requestCount);
}

/**
 * SLA configuration
 */
export interface SLAConfig {
  endpoint: string;
  p95MaxMs: number;
  p99MaxMs: number;
  minThroughput: number;
}

/**
 * SLA validation result
 */
export interface SLAValidationResult {
  passed: boolean;
  violations: string[];
}

/**
 * Validate SLA compliance for a metric
 */
export function validateSLA(
  metric: PerformanceMetric,
  config: SLAConfig
): SLAValidationResult {
  const violations: string[] = [];

  if (metric.p95 > config.p95MaxMs) {
    violations.push(
      `p95 latency ${metric.p95}ms exceeds target ${config.p95MaxMs}ms`
    );
  }

  if (metric.p99 > config.p99MaxMs) {
    violations.push(
      `p99 latency ${metric.p99}ms exceeds target ${config.p99MaxMs}ms`
    );
  }

  if (metric.measurements.length < config.minThroughput) {
    violations.push(
      `Throughput ${metric.measurements.length} below minimum ${config.minThroughput}`
    );
  }

  return {
    passed: violations.length === 0,
    violations,
  };
}

/**
 * Regression detection
 */
export interface RegressionResult {
  regressed: boolean;
  change: number; // percentage
  message: string;
}

/**
 * Detect performance regressions vs baseline
 */
export function detectRegression(
  current: PerformanceMetric,
  baseline: PerformanceMetric,
  tolerancePercent: number
): RegressionResult {
  const changePercent = ((current.mean - baseline.mean) / baseline.mean) * 100;

  if (changePercent > tolerancePercent) {
    return {
      regressed: true,
      change: changePercent,
      message: `Performance regressed ${changePercent.toFixed(2)}% (threshold: ${tolerancePercent}%)`,
    };
  }

  return {
    regressed: false,
    change: changePercent,
    message: `Performance stable (change: ${changePercent.toFixed(2)}%)`,
  };
}

/**
 * Reset metrics (for testing)
 */
export function __resetMetrics(): void {
  collector.reset();
}
