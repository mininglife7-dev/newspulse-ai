import { NextResponse } from 'next/server'
import {
  estimateMetricsFromBuild,
  generatePerformanceReport,
  formatPerformanceAlert,
  recordBaseline,
} from '@/lib/performance-baseline'
import { recordPerformanceAlerts } from '@/lib/alert-hub'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/performance-baseline
 *
 * DNA-GOV-009 endpoint: Performance Baseline Tracking.
 *
 * Autonomously detect performance regressions by tracking:
 * - Build time (npm run build duration)
 * - Page load latency (LCP, FCP)
 * - Bundle size (total and per-route)
 * - API response times (critical endpoints)
 *
 * Returns:
 * - 200 + report: Current metrics + comparison to baseline
 * - Alert if regressions detected
 *
 * Used by: GitHub Actions workflow (daily); Founder monitoring dashboard
 */
export async function GET(req: Request) {
  try {
    // Estimate current metrics from build
    const currentMetrics = estimateMetricsFromBuild()

    // In production, would load baseline from persistent storage
    // For MVP, use hardcoded baseline
    const baselineMetrics = [
      {
        name: 'build-time',
        value: 60000,
        unit: 'ms' as const,
        timestamp: '2026-07-01T00:00:00Z',
        environment: 'production' as const,
      },
      {
        name: 'page-load-lcp',
        value: 2500,
        unit: 'ms' as const,
        timestamp: '2026-07-01T00:00:00Z',
        environment: 'production' as const,
      },
      {
        name: 'api-workspace-response',
        value: 500,
        unit: 'ms' as const,
        timestamp: '2026-07-01T00:00:00Z',
        environment: 'production' as const,
      },
      {
        name: 'bundle-total',
        value: 500000,
        unit: 'bytes' as const,
        timestamp: '2026-07-01T00:00:00Z',
        environment: 'production' as const,
      },
    ]

    // Generate report
    const report = generatePerformanceReport(
      currentMetrics,
      baselineMetrics,
      `${new Date().toISOString().split('T')[0]}-production`
    )

    const formatted = formatPerformanceAlert(report)

    // Record alerts in Alert Hub (DNA-005) for Founder visibility
    if (report.regressionsFound > 0) {
      recordPerformanceAlerts({
        regressionsFound: report.regressionsFound,
        regressions: report.regressions,
        improvements: report.improvements,
      })
    }

    // Log for Founder visibility
    if (report.regressionsFound > 0) {
      if (report.regressions.some((r) => r.severity === 'critical')) {
        console.error('[performance] CRITICAL:\n', formatted)
      } else {
        console.warn('[performance] WARNINGS:\n', formatted)
      }
    } else if (report.improvements.length > 0) {
      console.log('[performance] IMPROVEMENTS:\n', formatted)
    }

    return NextResponse.json(
      {
        ok: report.regressionsFound === 0,
        timestamp: report.timestamp,
        buildId: report.buildId,
        metricsTracked: report.metricsTracked,
        regressionsFound: report.regressionsFound,
        summary: report.summary,
        regressions: report.regressions,
        improvements: report.improvements,
        formatted,
      },
      {
        status: report.regressionsFound === 0 ? 200 : 206,
        headers: {
          'X-Regression-Count': String(report.regressionsFound),
          'X-Improvements-Count': String(report.improvements.length),
          'X-Metrics-Tracked': String(report.metricsTracked),
        },
      }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[performance] Baseline check failed:', message)

    return NextResponse.json(
      {
        ok: false,
        error: 'Performance baseline check failed',
        message,
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    )
  }
}
