import { NextResponse } from 'next/server';
import { runProductionHealthChecks } from '@/lib/production-monitoring';
import { logger } from '@/lib/structured-logger';

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
    const startTime = Date.now();
    const report = await runProductionHealthChecks(baseUrl);
    const duration = Date.now() - startTime;

    if (report.alerts.length > 0) {
      if (report.summary.critical > 0) {
        logger.critical(
          `Production health check: ${report.summary.critical} critical issues`,
          'PRODUCTION_HEALTH_CRITICAL',
          new Error('Critical health check alerts detected'),
          {
            critical_issues: report.summary.critical,
            degraded_issues: report.summary.degraded,
            total_checks: Object.keys(report.checks).length,
            alerts: report.alerts,
            duration_ms: duration,
          }
        );
      } else {
        logger.warn(
          `Production health check: ${report.summary.degraded} warnings`,
          'PRODUCTION_HEALTH_DEGRADED',
          {
            critical_issues: report.summary.critical,
            degraded_issues: report.summary.degraded,
            total_checks: Object.keys(report.checks).length,
            alerts: report.alerts,
            duration_ms: duration,
          },
          duration
        );
      }
    } else {
      logger.info(
        'Production health check passed',
        'PRODUCTION_HEALTH_OK',
        {
          total_checks: Object.keys(report.checks).length,
          duration_ms: duration,
        },
        duration
      );
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
        },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    logger.error(
      'Production health check failed',
      'PRODUCTION_HEALTH_ERROR',
      error,
      { message }
    );

    return NextResponse.json(
      {
        ok: false,
        error: 'Production health check failed',
        message,
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
