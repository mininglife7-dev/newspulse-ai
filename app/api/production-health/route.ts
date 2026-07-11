import { NextRequest, NextResponse } from 'next/server';
import { runProductionHealthChecks } from '@/lib/production-monitoring';
import { withLogging } from '@/lib/middleware-logging';

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
export async function GET(request: NextRequest) {
  return withLogging(
    request,
    async () => {
      const protocol = request.headers.get('x-forwarded-proto') || 'https';
      const host = request.headers.get('x-forwarded-host') || 'localhost:3000';
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
            },
          }
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('[production-health] Monitoring failed:', message);

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
    },
    {
      endpoint: '/api/production-health',
      method: 'GET',
    }
  );
}
