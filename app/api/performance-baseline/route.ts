import { NextResponse } from 'next/server';
import { detectPerformanceRegressions, measurePerformanceMetrics } from '@/lib/performance-baseline';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/performance-baseline
 *
 * Measures current performance metrics and compares against baseline to detect regressions.
 * Returns bundle size, gzip size, page latency, and API latency changes.
 *
 * Usage: Call after deployments to verify performance hasn't regressed
 * curl https://your-domain.com/api/performance-baseline
 */
export async function GET() {
  try {
    const result = await detectPerformanceRegressions();

    return NextResponse.json({
      ok: true,
      timestamp: new Date().toISOString(),
      metrics: result,
      hasRegression: result.hasRegression,
      regressions: result.regressions,
    });
  } catch (err) {
    console.error('[api/performance-baseline] error:', err);
    return NextResponse.json(
      {
        ok: false,
        error: 'Failed to measure performance metrics',
        message: (err as any).message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/performance-baseline
 *
 * Records current metrics as the new performance baseline for future comparisons.
 * Useful after intentional optimizations or baseline resets.
 *
 * Usage: Call to reset baseline after performance improvements
 * curl -X POST https://your-domain.com/api/performance-baseline
 */
export async function POST() {
  try {
    const metrics = await measurePerformanceMetrics();

    return NextResponse.json({
      ok: true,
      message: 'Baseline updated',
      timestamp: metrics.timestamp,
      metrics: {
        bundleSize: metrics.bundleSize,
        gzipSize: metrics.gzipSize,
        pageLatency: metrics.pageLatency,
        apiLatency: metrics.apiLatency,
      },
    });
  } catch (err) {
    console.error('[api/performance-baseline] error:', err);
    return NextResponse.json(
      {
        ok: false,
        error: 'Failed to update performance baseline',
        message: (err as any).message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
