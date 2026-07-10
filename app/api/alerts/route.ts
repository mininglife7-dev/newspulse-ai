import { NextResponse } from 'next/server';
import {
  getAlertHubReport,
  formatAlertHubReport,
  cleanupResolvedAlerts,
} from '@/lib/alert-hub';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/alerts
 *
 * DNA-GOV-005 endpoint: Centralized Founder Alert Hub.
 *
 * Returns:
 * - 200 + summary: All active alerts from all DNA systems consolidated
 *
 * Includes alerts from:
 * - DNA-GOV-001: External blockers (GitHub Actions, Supabase)
 * - DNA-GOV-002: Production health (connectivity, latency)
 * - DNA-GOV-003: Deployment verification (code not live)
 * - DNA-GOV-004: Error rates (runtime failures)
 * - DNA-GOV-008: Security vulnerabilities (CVEs, npm advisories)
 * - DNA-GOV-009: Performance regressions (build time, bundle size, latency)
 * - DNA-GOV-012: Deployment recovery (incident detection, auto-rollback)
 *
 * Used by: Founder's monitoring dashboard, automated alerting
 */
export async function GET(req: Request) {
  try {
    // Cleanup old resolved alerts (older than 24 hours)
    cleanupResolvedAlerts(24 * 60);

    const report = getAlertHubReport();
    const formatted = formatAlertHubReport(report);

    // Log for Founder visibility
    if (report.alertCount > 0) {
      if (report.criticalCount > 0) {
        console.error('[alerts] CRITICAL:\n', formatted);
      } else if (report.warningCount > 0) {
        console.warn('[alerts] WARNINGS:\n', formatted);
      } else {
        console.log('[alerts] INFO:\n', formatted);
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
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[alerts] Hub failed:', message);

    return NextResponse.json(
      {
        ok: false,
        error: 'Alert hub failed',
        message,
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
