import { NextResponse } from 'next/server';
import { getErrorRateReport, formatErrorAlert } from '@/lib/error-rate-monitor';
import { getSafeErrorResponse } from '@/lib/error-handler';
import { cacheHeaders } from '@/lib/cache-control';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/error-rate
 *
 * DNA-GOV-004 endpoint: Report error rates across all endpoints.
 * Called by Vercel cron every 5 minutes (same frequency as health checks).
 *
 * Returns:
 * - 200 + healthy: Error rates within acceptable thresholds
 * - 200 + warning: High error rate or volume on non-critical endpoints
 * - 200 + critical: Critical endpoint errors or excessive error rate
 *
 * Success criteria: <5% error rate per endpoint, <10 errors in 5min window.
 */
export async function GET(req: Request) {
  try {
    const report = getErrorRateReport();
    const alert = formatErrorAlert(report);

    // Log alerts for Founder visibility
    if (report.alerts.length > 0) {
      if (report.summary.criticalEndpoints.length > 0) {
        console.error('[error-rate] CRITICAL alerts:\n', report.alerts.join('\n'));
      } else {
        console.warn('[error-rate] Warnings:\n', report.alerts.join('\n'));
      }
    }

    return NextResponse.json(
      {
        ok: report.ok,
        status: report.summary.criticalEndpoints.length > 0 ? 'critical' : report.alerts.length > 0 ? 'warning' : 'healthy',
        timestamp: report.timestamp,
        alert,
        summary: report.summary,
        endpoints: report.endpoints.filter((e) => e.errorRequests > 0), // Only show endpoints with errors
        alerts: report.alerts,
      },
      {
        status: 200,
        headers: {
          'X-Error-Status': report.ok ? 'healthy' : 'degraded',
          'X-Total-Errors': String(report.summary.totalErrors),
          'X-Critical-Endpoints': String(report.summary.criticalEndpoints.length),
          ...cacheHeaders.short,
        },
      }
    );
  } catch (error: unknown) {
    const message = getSafeErrorResponse(
      'Error rate report failed',
      error,
      'api/error-rate'
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
