/**
 * DNA-GOV-009: Performance Baseline Tracking
 *
 * Detect performance regressions before they degrade user experience.
 * Track key metrics: latency, bundle size, build time, database queries.
 */

export interface PerformanceMetric {
  name: string; // e.g., "api-response-time", "bundle-size", "build-duration"
  value: number;
  unit: string; // e.g., "ms", "bytes", "seconds"
  timestamp: string;
  tags?: Record<string, string>; // e.g., { endpoint: "/api/health", status: "success" }
}

export interface PerformanceBaseline {
  name: string;
  avgValue: number;
  minValue: number;
  maxValue: number;
  stdDev: number;
  samples: number;
  lastUpdated: string;
  thresholdPercentage: number; // Trigger alert if metric exceeds baseline by this %
}

export interface PerformanceRegression {
  metric: string;
  baselineValue: number;
  currentValue: number;
  regressionPercentage: number;
  regressionStatus: 'critical' | 'high' | 'medium' | 'low';
  severity: 'critical' | 'high' | 'medium' | 'low';
  recommendedAction: string;
  timestamp: string;
}

export interface PerformanceReport {
  timestamp: string;
  metricsAnalyzed: number;
  baselinesEstablished: number;
  regressions: PerformanceRegression[];
  ok: boolean;
  summary: string;
}

/**
 * In-memory performance tracker (MVP).
 * Future: Store baselines in Supabase for persistent tracking.
 */
export class PerformanceBaselineTracker {
  private baselines: Map<string, PerformanceBaseline> = new Map();
  private recentMetrics: PerformanceMetric[] = [];
  private readonly maxHistorySize = 1000;

  /**
   * Record a performance metric.
   */
  recordMetric(metric: PerformanceMetric): void {
    this.recentMetrics.push(metric);

    // Trim history to prevent unbounded growth
    if (this.recentMetrics.length > this.maxHistorySize) {
      this.recentMetrics = this.recentMetrics.slice(-this.maxHistorySize);
    }
  }

  /**
   * Calculate baseline from recent metrics.
   */
  updateBaseline(metricName: string, thresholdPercentage: number = 20): void {
    const metricsForName = this.recentMetrics.filter(
      (m) => m.name === metricName
    );

    if (metricsForName.length < 3) {
      // Not enough samples yet
      return;
    }

    const values = metricsForName.map((m) => m.value);
    const avgValue = values.reduce((a, b) => a + b, 0) / values.length;
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);

    // Calculate standard deviation
    const variance =
      values.reduce((sum, val) => sum + Math.pow(val - avgValue, 2), 0) /
      values.length;
    const stdDev = Math.sqrt(variance);

    this.baselines.set(metricName, {
      name: metricName,
      avgValue,
      minValue,
      maxValue,
      stdDev,
      samples: values.length,
      lastUpdated: new Date().toISOString(),
      thresholdPercentage,
    });
  }

  /**
   * Detect performance regressions against baseline.
   */
  detectRegressions(): PerformanceRegression[] {
    const regressions: PerformanceRegression[] = [];

    for (const [metricName, baseline] of this.baselines) {
      // Get most recent metric value for this name
      const metricsForName = this.recentMetrics.filter(
        (m) => m.name === metricName
      );

      if (metricsForName.length === 0) continue;

      // Use only the most recent value
      const latestMetric = metricsForName[metricsForName.length - 1];
      const currentValue = latestMetric.value;

      const regressionPercentage =
        ((currentValue - baseline.avgValue) / baseline.avgValue) * 100;

      if (regressionPercentage > baseline.thresholdPercentage) {
        const severity = this.calculateSeverity(
          regressionPercentage,
          baseline.thresholdPercentage
        );

        regressions.push({
          metric: metricName,
          baselineValue: baseline.avgValue,
          currentValue,
          regressionPercentage,
          regressionStatus: severity,
          severity,
          recommendedAction: this.getRecommendedAction(
            metricName,
            regressionPercentage
          ),
          timestamp: new Date().toISOString(),
        });
      }
    }

    return regressions;
  }

  /**
   * Generate performance report.
   */
  generateReport(): PerformanceReport {
    const regressions = this.detectRegressions();
    const uniqueMetrics = new Set(this.recentMetrics.map((m) => m.name)).size;

    return {
      timestamp: new Date().toISOString(),
      metricsAnalyzed: uniqueMetrics,
      baselinesEstablished: this.baselines.size,
      regressions,
      ok:
        regressions.filter(
          (r) => r.severity === 'critical' || r.severity === 'high'
        ).length === 0,
      summary: this.generateSummary(regressions),
    };
  }

  /**
   * Get all recorded metrics.
   */
  getMetrics(): PerformanceMetric[] {
    return [...this.recentMetrics];
  }

  /**
   * Get baseline for a specific metric.
   */
  getBaseline(metricName: string): PerformanceBaseline | undefined {
    return this.baselines.get(metricName);
  }

  /**
   * Get all baselines.
   */
  getAllBaselines(): PerformanceBaseline[] {
    return Array.from(this.baselines.values());
  }

  /**
   * Clear all data.
   */
  reset(): void {
    this.baselines.clear();
    this.recentMetrics = [];
  }

  // Private helpers

  private calculateSeverity(
    regressionPercentage: number,
    threshold: number
  ): 'critical' | 'high' | 'medium' | 'low' {
    if (regressionPercentage > threshold * 2) return 'critical';
    if (regressionPercentage > threshold * 1.5) return 'high';
    if (regressionPercentage > threshold) return 'medium';
    return 'low';
  }

  private getRecommendedAction(
    metricName: string,
    regressionPercentage: number
  ): string {
    const impact = regressionPercentage.toFixed(1);

    if (
      metricName.includes('latency') ||
      metricName.includes('response-time')
    ) {
      return `Investigate API latency regression (+${impact}%). Check database queries, external API calls, middleware overhead.`;
    }

    if (metricName.includes('bundle') || metricName.includes('size')) {
      return `Analyze bundle size increase (+${impact}%). Review new dependencies, unused imports, code splitting.`;
    }

    if (metricName.includes('build')) {
      return `Build time increased (+${impact}%). Profile build process, check for new expensive plugins, parallelize where possible.`;
    }

    if (metricName.includes('query') || metricName.includes('database')) {
      return `Database query performance degraded (+${impact}%). Check query patterns, add indexes, review N+1 queries.`;
    }

    return `Performance regression detected (+${impact}%). Investigate and optimize.`;
  }

  private generateSummary(regressions: PerformanceRegression[]): string {
    if (regressions.length === 0) {
      return '✅ All performance metrics within baseline';
    }

    const critical = regressions.filter((r) => r.severity === 'critical');
    const high = regressions.filter((r) => r.severity === 'high');

    if (critical.length > 0) {
      return `🔴 ${critical.length} CRITICAL regression(s) detected. Immediate investigation required.`;
    }

    if (high.length > 0) {
      return `🟠 ${high.length} HIGH severity regression(s) detected. Schedule investigation.`;
    }

    return `🟡 ${regressions.length} regression(s) detected. Monitor for escalation.`;
  }
}
