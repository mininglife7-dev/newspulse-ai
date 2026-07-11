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
   * Clear measurements
   */
  clear(): void {
    this.measurements.clear();
    this.startTime = Date.now();
  }
}

/**
 * Global metrics collector instance
 */
const globalCollector = new MetricsCollector();

/**
 * Record latency for an operation
 */
export function recordLatency(name: string, durationMs: number): void {
  globalCollector.record(name, durationMs);
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
    recordLatency(name, Date.now() - start);
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
    recordLatency(name, Date.now() - start);
  }
}

/**
 * Get current metrics
 */
export function getMetrics(): Record<string, PerformanceMetric> {
  return globalCollector.getMetrics();
}

/**
 * Export baseline
 */
export function exportBaseline(
  environment: string = process.env.NODE_ENV || 'development',
  requestCount: number = 0
): PerformanceBaseline {
  return globalCollector.exportBaseline(environment, requestCount);
}

/**
 * Reset collector (testing only)
 */
export function __resetMetrics(): void {
  globalCollector.clear();
}

/**
 * SLA validation
 */
export interface PerformanceSLA {
  endpoint: string;
  p95MaxMs: number;
  p99MaxMs: number;
  minThroughput: number; // req/sec
}

export function validateSLA(
  metric: PerformanceMetric,
  sla: PerformanceSLA
): { passed: boolean; violations: string[] } {
  const violations: string[] = [];

  if (metric.p95 > sla.p95MaxMs) {
    violations.push(`p95 ${metric.p95}ms exceeds SLA ${sla.p95MaxMs}ms`);
  }

  if (metric.p99 > sla.p99MaxMs) {
    violations.push(`p99 ${metric.p99}ms exceeds SLA ${sla.p99MaxMs}ms`);
  }

  return {
    passed: violations.length === 0,
    violations,
  };
}

/**
 * Regression detection
 */
export function detectRegression(
  current: PerformanceMetric,
  baseline: PerformanceMetric,
  tolerancePercent: number = 5
): { regressed: boolean; change: number } {
  const baselineP95 = baseline.p95;
  const currentP95 = current.p95;
  const changePercent = ((currentP95 - baselineP95) / baselineP95) * 100;

  return {
    regressed: changePercent > tolerancePercent,
    change: changePercent,
  };
}
