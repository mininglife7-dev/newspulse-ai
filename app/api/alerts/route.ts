import { NextRequest, NextResponse } from 'next/server';
import {
  getAlertHubReport,
  formatAlertHubReport,
  cleanupResolvedAlerts,
} from '@/lib/alert-hub';
import { requireAdminToken, unauthorizedResponse } from '@/lib/api-auth';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/alerts
 *
 * DNA-GOV-005 endpoint: Centralized Founder Alert Hub.
 * REQUIRES: ADMIN_TOKEN authentication (Bearer token in Authorization header)
 *
 * Returns:
 * - 200 + summary: All active alerts from all DNA systems consolidated
 * - 401: Missing or invalid authentication token
 *
 * Includes alerts from:
 * - DNA-GOV-001: External blockers (GitHub Actions, Supabase)
 * - DNA-GOV-002: Production health (connectivity, latency)
 * - DNA-GOV-003: Deployment verification (code not live)
 * - DNA-GOV-004: Error rates (runtime failures)
 * - DNA-GOV-008: Security vulnerabilities (CVEs, npm advisories)
 *
 * Used by: Founder's monitoring dashboard, automated alerting
 */
export async function GET(req: NextRequest) {
  // Require authentication
  if (!requireAdminToken(req)) {
    return unauthorizedResponse();
  }

  try {
    // Cleanup old resolved alerts (older than 24 hours)
    cleanupResolvedAlerts(24 * 60);

    const report = getAlertHubReport();
    const formatted = formatAlertHubReport(report);

    // Log summary only (safe for production)
    if (report.alertCount > 0) {
      if (report.criticalCount > 0) {
        logger.error('Alert hub critical conditions detected', 'ALERTS_CRITICAL', {
          total: report.alertCount,
          critical: report.criticalCount,
        });
      } else if (report.warningCount > 0) {
        logger.warn('Alert hub warnings detected', 'ALERTS_WARNING', {
          total: report.alertCount,
          warnings: report.warningCount,
        });
      } else {
        logger.info('Alert hub status', 'ALERTS_OK', {
          total: report.alertCount,
        });
      }
    }

    return NextResponse.json(
      {
        ok: report.criticalCount === 0,
        timestamp: report.timestamp,
        summary: report.summary,
        alertCount: report.alertCount,
        criticalCount: report.criticalCount,
        warningCount: report.warningCount,
        infoCount: report.infoCount,
        alerts: report.alerts,
        formatted,
      },
      {
        status: 200,
        headers: {
          'X-Alert-Level': report.criticalCount > 0 ? 'critical' : report.warningCount > 0 ? 'warning' : 'info',
          'X-Alert-Count': String(report.alertCount),
          'X-Critical-Count': String(report.criticalCount),
        },
      }
    );
  } catch (error) {
    logger.error('Alert hub failed', 'ALERTS_ERROR', error);

    return NextResponse.json(
      {
        ok: false,
        error: 'Alert hub failed',
        message: 'Internal error processing alerts',
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
