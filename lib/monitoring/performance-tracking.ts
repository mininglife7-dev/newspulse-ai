/**
 * Performance Tracking Module
 *
 * Tracks API response times and sends metrics to Sentry.
 * Used to measure SLOs: p50 <100ms, p95 <300ms, p99 <500ms
 *
 * Usage:
 * ```typescript
 * const tracker = startPerformanceTracking('POST /api/assessment');
 * // ... do work ...
 * tracker.end({ statusCode: 200, userId: 'user123' });
 * ```
 */

import * as Sentry from '@sentry/nextjs';

export interface PerformanceMetrics {
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  duration: number; // milliseconds
  statusCode: number;
  userId?: string;
  workspaceId?: string;
  error?: string;
}

// Store for aggregating metrics (reset every 5 minutes)
let metricsBuffer: PerformanceMetrics[] = [];

// SLO targets for different endpoints
const SLO_TARGETS: Record<string, { p50: number; p95: number; p99: number }> = {
  'POST /api/auth/signup': { p50: 200, p95: 500, p99: 1000 },
  'POST /api/auth/signin': { p50: 100, p95: 300, p99: 500 },
  'GET /api/workspace': { p50: 50, p95: 100, p99: 200 },
  'GET /api/inventory': { p50: 100, p95: 200, p99: 400 },
  'POST /api/assessment': { p50: 500, p95: 800, p99: 1500 },
  'GET /api/assessment': { p50: 100, p95: 300, p99: 500 },
  'GET /api/compliance': { p50: 100, p95: 300, p99: 500 },
};

class PerformanceTracker {
  private startTime: number;
  private endpoint: string;
  private method: string;

  constructor(endpoint: string, method: string) {
    this.startTime = Date.now();
    this.endpoint = endpoint;
    this.method = method;
  }

  end(options: {
    statusCode: number;
    userId?: string;
    workspaceId?: string;
    error?: string;
  }): PerformanceMetrics {
    const duration = Date.now() - this.startTime;

    const metric: PerformanceMetrics = {
      endpoint: this.endpoint,
      method: this.method as any,
      duration,
      statusCode: options.statusCode,
      userId: options.userId,
      workspaceId: options.workspaceId,
      error: options.error,
    };

    // Add to buffer
    metricsBuffer.push(metric);

    // Send to Sentry
    this.reportToSentry(metric);

    // Check SLO breach
    this.checkSLOBreach(metric);

    return metric;
  }

  private reportToSentry(metric: PerformanceMetrics): void {
    // Only report if Sentry is configured
    if (!process.env.NEXT_PUBLIC_SENTRY_DSN) {
      return;
    }

    const endpointKey = `${metric.method} ${metric.endpoint}`;
    const isSlow = metric.duration > 500; // Flag slow requests
    const isError = metric.statusCode >= 400;

    // Send as breadcrumb for context
    Sentry.captureMessage(
      `API Request: ${endpointKey} ${metric.duration}ms`,
      isSlow ? 'warning' : 'info'
    );

    // Send as custom event with full context
    if (isSlow || isError) {
      Sentry.captureEvent({
        message: `API Performance: ${endpointKey}`,
        level: isSlow ? 'warning' : 'error',
        contexts: {
          performance: {
            endpoint: metric.endpoint,
            method: metric.method,
            duration_ms: metric.duration,
            status_code: metric.statusCode,
            user_id: metric.userId,
            workspace_id: metric.workspaceId,
          },
        },
        tags: {
          'performance.category': isSlow ? 'slow' : 'error',
          'api.endpoint': metric.endpoint,
          'http.status_code': `${metric.statusCode}`,
        },
      });
    }
  }

  private checkSLOBreach(metric: PerformanceMetrics): void {
    const endpointKey = `${metric.method} ${metric.endpoint}`;
    const slo = SLO_TARGETS[endpointKey];

    if (!slo) {
      return; // No target defined for this endpoint
    }

    // Check if p95 SLO is breached (use 300ms as threshold)
    if (metric.duration > slo.p95) {
      console.warn(
        `⚠️  SLO BREACH: ${endpointKey} took ${metric.duration}ms (target: ${slo.p95}ms)`
      );

      // Capture as warning in Sentry
      if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
        Sentry.captureMessage(
          `SLO Breach: ${endpointKey} ${metric.duration}ms > ${slo.p95}ms`,
          'warning'
        );
      }
    }
  }
}

export function startPerformanceTracking(
  endpoint: string,
  method: string = 'GET'
): PerformanceTracker {
  return new PerformanceTracker(endpoint, method);
}

/**
 * Calculate percentiles from metrics buffer
 * Used for generating performance reports
 */
export function calculatePercentiles(endpoint?: string) {
  let metrics = metricsBuffer;

  if (endpoint) {
    metrics = metrics.filter((m) => m.endpoint === endpoint);
  }

  if (metrics.length === 0) {
    return null;
  }

  // Sort by duration
  const sorted = [...metrics].sort((a, b) => a.duration - b.duration);
  const len = sorted.length;

  return {
    count: len,
    min: sorted[0].duration,
    max: sorted[len - 1].duration,
    avg: Math.round(sorted.reduce((sum, m) => sum + m.duration, 0) / len),
    p50: sorted[Math.floor(len * 0.5)].duration,
    p95: sorted[Math.floor(len * 0.95)].duration,
    p99: sorted[Math.floor(len * 0.99)].duration,
  };
}

/**
 * Get summary of all metrics collected
 */
export function getPerformanceSummary() {
  const byEndpoint = new Map<string, PerformanceMetrics[]>();

  for (const metric of metricsBuffer) {
    const key = `${metric.method} ${metric.endpoint}`;
    if (!byEndpoint.has(key)) {
      byEndpoint.set(key, []);
    }
    byEndpoint.get(key)!.push(metric);
  }

  const summary: Record<string, any> = {};

  for (const [endpoint, metrics] of byEndpoint) {
    const percentiles = calculatePercentiles(endpoint.split(' ')[1]);
    const errorCount = metrics.filter((m) => m.statusCode >= 400).length;

    summary[endpoint] = {
      requests: metrics.length,
      errors: errorCount,
      errorRate: errorCount / metrics.length,
      ...percentiles,
    };
  }

  return summary;
}

/**
 * Clear metrics buffer (call every 5 minutes)
 */
export function clearMetricsBuffer() {
  metricsBuffer = [];
}

/**
 * Reset performance tracking
 */
export function resetPerformanceTracking() {
  clearMetricsBuffer();
}
