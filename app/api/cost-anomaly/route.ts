import { NextResponse } from 'next/server';
import {
  detectCostAnomalies,
  anomaliesToAlerts,
  type CostAnomalyReport,
} from '@/lib/cost-anomaly-detector';
import { recordAlert } from '@/lib/alert-hub';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/cost-anomaly
 *
 * DNA-GOV-011 endpoint: Cost Anomaly Detection.
 *
 * Monitors Vercel and Supabase spending for unusual patterns.
 * Compares current costs against 30-day rolling average.
 * Alerts if spending exceeds baseline by 1.5x (high) or 3x+ (critical).
 *
 * Returns:
 * - 200 + report: Cost data, anomalies detected, severity levels
 *
 * Requires:
 * - VERCEL_TOKEN: Bearer token for Vercel API (optional, cost check disabled if missing)
 * - SUPABASE_API_TOKEN + SUPABASE_PROJECT_ID: For Supabase API (optional)
 *
 * Used by: DNA-005 (Alert Hub), GitHub Actions daily monitor, Founder dashboard
 */
export async function GET(req: Request) {
  try {
    const report = await detectCostAnomalies();

    // Convert anomalies to alert hub format and record
    const alerts = anomaliesToAlerts(report);
    for (const alert of alerts) {
      recordAlert(
        'security', // Using 'security' as closest source type for cost anomalies
        alert.severity as 'critical' | 'warning' | 'info',
        alert.title,
        alert.message,
        'Monitor cost trends and adjust resource allocation if anomaly persists'
      );
    }

    // Determine response status based on severity
    const hasCritical = report.anomalies.some((a) => a.severity === 'critical');
    const hasHigh = report.anomalies.some((a) => a.severity === 'high');
    const status = hasCritical ? 503 : 200;
    const alertLevel = hasCritical ? 'critical' : hasHigh ? 'warning' : 'ok';

    // Log anomalies (safe for production)
    if (report.anomalies.length > 0) {
      const hasCritical = report.anomalies.some((a) => a.severity === 'critical');
      if (hasCritical) {
        logger.error('Cost anomalies detected: critical', 'COST_ANOMALY_CRITICAL', {
          anomalyCount: report.anomalies.length,
        });
      } else {
        logger.warn('Cost anomalies detected: high severity', 'COST_ANOMALY_WARNING', {
          anomalyCount: report.anomalies.length,
        });
      }
    }

    return NextResponse.json(
      {
        ok: alertLevel === 'ok',
        timestamp: report.timestamp,
        alertLevel,
        summary: report.summary,
        vercel: report.vercel,
        supabase: report.supabase,
        anomalies: report.anomalies,
        alertsRecorded: alerts.length,
      },
      {
        status,
        headers: {
          'X-Alert-Level': alertLevel,
          'X-Anomaly-Count': String(report.anomalies.length),
        },
      }
    );
  } catch (error) {
    logger.error('Cost anomaly detection failed', 'COST_ANOMALY_ERROR', error);

    return NextResponse.json(
      {
        ok: false,
        error: 'Cost anomaly detection failed',
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
