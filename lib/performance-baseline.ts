/**
 * DNA-GOV-009: Performance Baseline Tracking
 *
 * Autonomously detect performance regressions by tracking key metrics across builds:
 * - Page load latency (LCP, FCP)
 * - Bundle size (total, per-route)
 * - Build time (next build duration)
 * - API response times (critical endpoints)
 *
 * This DNA establishes baselines and alerts when metrics degrade beyond thresholds.
 */

export interface PerformanceMetric {
  name: string
  value: number
  unit: 'ms' | 'bytes' | 'seconds'
  timestamp: string
  environment: 'production' | 'staging' | 'local'
}

export interface BaselineEntry {
  timestamp: string
  metrics: PerformanceMetric[]
  buildId: string
  gitCommit: string
  buildDuration: number // milliseconds
}

export interface RegressionAlert {
  metric: string
  baseline: number
  current: number
  change: number // absolute
  changePercent: number // %
  threshold: number // alert if change > threshold%
  severity: 'critical' | 'warning' | 'info'
}

export interface PerformanceReport {
  timestamp: string
  buildId: string
  metricsTracked: number
  regressionsFound: number
  regressions: RegressionAlert[]
  improvements: RegressionAlert[]
  summary: string
}

// Performance baselines and thresholds
const PERFORMANCE_THRESHOLDS: Record<string, { baseline: number; threshold: number }> = {
  'build-time': { baseline: 60000, threshold: 20 }, // 60s baseline, alert >20% regression
  'page-load-lcp': { baseline: 2500, threshold: 15 }, // 2.5s LCP, alert >15% regression
  'api-workspace-response': { baseline: 500, threshold: 25 }, // 500ms, alert >25%
  'api-health-response': { baseline: 200, threshold: 25 }, // 200ms, alert >25%
  'bundle-total': { baseline: 500000, threshold: 10 }, // 500KB, alert >10%
}

/**
 * Record a performance baseline from a build
 */
export function recordBaseline(
  metrics: PerformanceMetric[],
  buildId: string,
  gitCommit: string,
  buildDuration: number
): BaselineEntry {
  return {
    timestamp: new Date().toISOString(),
    metrics,
    buildId,
    gitCommit,
    buildDuration,
  }
}

/**
 * Compare current metrics against historical baseline
 */
export function detectRegressions(
  current: PerformanceMetric[],
  baseline: PerformanceMetric[]
): RegressionAlert[] {
  const regressions: RegressionAlert[] = []

  for (const currentMetric of current) {
    const baselineMetric = baseline.find((m) => m.name === currentMetric.name)

    if (!baselineMetric) {
      continue // New metric, no baseline to compare
    }

    const change = currentMetric.value - baselineMetric.value
    const changePercent = Math.round((change / baselineMetric.value) * 100)

    const thresholdConfig = PERFORMANCE_THRESHOLDS[currentMetric.name]
    if (!thresholdConfig) {
      continue // No threshold defined for this metric
    }

    if (changePercent >= thresholdConfig.threshold) {
      regressions.push({
        metric: currentMetric.name,
        baseline: baselineMetric.value,
        current: currentMetric.value,
        change,
        changePercent,
        threshold: thresholdConfig.threshold,
        severity: changePercent >= thresholdConfig.threshold * 2 ? 'critical' : 'warning',
      })
    }
  }

  return regressions
}

/**
 * Detect improvements (metric better than baseline)
 */
export function detectImprovements(
  current: PerformanceMetric[],
  baseline: PerformanceMetric[]
): RegressionAlert[] {
  const improvements: RegressionAlert[] = []

  for (const currentMetric of current) {
    const baselineMetric = baseline.find((m) => m.name === currentMetric.name)

    if (!baselineMetric) {
      continue
    }

    const change = currentMetric.value - baselineMetric.value
    const changePercent = Math.round((change / baselineMetric.value) * 100)

    // Only report improvements > 5%
    if (changePercent < -5) {
      improvements.push({
        metric: currentMetric.name,
        baseline: baselineMetric.value,
        current: currentMetric.value,
        change,
        changePercent: Math.abs(changePercent),
        threshold: 5,
        severity: 'info',
      })
    }
  }

  return improvements
}

/**
 * Generate performance report with recommendations
 */
export function generatePerformanceReport(
  current: PerformanceMetric[],
  baseline: PerformanceMetric[],
  buildId: string
): PerformanceReport {
  const regressions = detectRegressions(current, baseline)
  const improvements = detectImprovements(current, baseline)

  let summary = ''
  if (regressions.length === 0 && improvements.length === 0) {
    summary = '✅ All metrics stable (no significant changes)'
  } else if (regressions.length > 0) {
    const critical = regressions.filter((r) => r.severity === 'critical').length
    const warnings = regressions.filter((r) => r.severity === 'warning').length
    summary = `🔴 Performance regression: ${critical} critical, ${warnings} warnings`
    if (improvements.length > 0) {
      summary += `; but ${improvements.length} metrics improved`
    }
  } else {
    summary = `✅ ${improvements.length} metrics improved, no regressions`
  }

  return {
    timestamp: new Date().toISOString(),
    buildId,
    metricsTracked: current.length,
    regressionsFound: regressions.length,
    regressions,
    improvements,
    summary,
  }
}

/**
 * Format performance report for Founder visibility
 */
export function formatPerformanceAlert(report: PerformanceReport): string {
  let output = `Performance Baseline Report (Build: ${report.buildId})\n`
  output += `${report.summary}\n\n`

  if (report.regressions.length > 0) {
    output += `Regressions (${report.regressions.length}):\n`
    report.regressions.forEach((r) => {
      const icon = r.severity === 'critical' ? '🔴' : '⚠️'
      output += `  ${icon} ${r.metric}: ${r.baseline} → ${r.current} (${r.changePercent > 0 ? '+' : ''}${r.changePercent}%)\n`
    })
    output += '\n'
  }

  if (report.improvements.length > 0) {
    output += `Improvements (${report.improvements.length}):\n`
    report.improvements.forEach((r) => {
      output += `  ✅ ${r.metric}: ${r.baseline} → ${r.current} (-${r.changePercent}%)\n`
    })
  }

  return output
}

/**
 * Estimate metric from build output (simplified for MVP)
 */
export function estimateMetricsFromBuild(): PerformanceMetric[] {
  return [
    {
      name: 'build-time',
      value: 45000, // Placeholder
      unit: 'ms',
      timestamp: new Date().toISOString(),
      environment: 'production',
    },
    {
      name: 'page-load-lcp',
      value: 2200,
      unit: 'ms',
      timestamp: new Date().toISOString(),
      environment: 'production',
    },
    {
      name: 'api-workspace-response',
      value: 450,
      unit: 'ms',
      timestamp: new Date().toISOString(),
      environment: 'production',
    },
    {
      name: 'bundle-total',
      value: 480000,
      unit: 'bytes',
      timestamp: new Date().toISOString(),
      environment: 'production',
    },
  ]
}
