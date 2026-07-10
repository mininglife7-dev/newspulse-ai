import { NextResponse } from 'next/server';
import { runProductionHealthChecks } from '@/lib/production-monitoring';
import { getSafeErrorResponse } from '@/lib/error-handler';
import { cacheHeaders } from '@/lib/cache-control';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/production-health
 *
 * DNA-GOV-002 endpoint: Monitor if production deployment is working.
 * Called by Vercel cron every 5 minutes.
 *
 * Returns:
 * - 200 + all healthy: Production is working normally
 * - 200 + degraded/critical: Some features not working (Founder should investigate)
 * - 503: Health check itself failed
 *
 * Success criteria: All health checks must pass; latency must be <2s average.
 */
export async function GET(req: Request) {
  const protocol = req.headers.get('x-forwarded-proto') || 'https';
  const host = req.headers.get('x-forwarded-host') || 'localhost:3000';
  const baseUrl = `${protocol}://${host}`;

  try {
    const report = await runProductionHealthChecks(baseUrl);

    // Log alerts for Founder visibility
    if (report.alerts.length > 0) {
      if (report.summary.critical > 0) {
        console.error('[production-health] CRITICAL alerts:\n', report.alerts.join('\n'));
      } else {
        console.warn('[production-health] Warnings:\n', report.alerts.join('\n'));
      }
    }

    return NextResponse.json(
      {
        ok: report.ok,
        timestamp: report.timestamp,
        checks: report.checks,
        summary: report.summary,
        alerts: report.alerts,
      },
      {
        status: 200,
        headers: {
          'X-Health-Status': report.ok ? 'healthy' : 'degraded',
          'X-Critical-Issues': String(report.summary.critical),
          'X-Warnings': String(report.summary.degraded),
          ...cacheHeaders.short,
        },
      }
    );
  } catch (error: unknown) {
    const message = getSafeErrorResponse(
      'Production health check failed',
      error,
      'api/production-health'
    );

    return NextResponse.json(
      {
        ok: false,
        error: message,
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
