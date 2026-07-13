import { NextResponse } from 'next/server';
import { getErrorRateReport, formatErrorAlert } from '@/lib/error-rate-monitor';
import { logger } from '@/lib/logger';

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

    // Log alerts (safe for production)
    if (report.alerts.length > 0) {
      if (report.summary.criticalEndpoints.length > 0) {
        logger.error('Error rate: critical endpoints detected', 'ERROR_RATE_CRITICAL', {
          criticalEndpoints: report.summary.criticalEndpoints.length,
          totalErrors: report.summary.totalErrors,
        });
      } else {
        logger.warn('Error rate: warnings detected', 'ERROR_RATE_WARNING', {
          alertCount: report.alerts.length,
        });
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
        },
      }
    );
  } catch (error) {
    logger.error('Error rate report failed', 'ERROR_RATE_REPORT_ERROR', error);

    return NextResponse.json(
      {
        ok: false,
        error: 'Error rate report failed',
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
