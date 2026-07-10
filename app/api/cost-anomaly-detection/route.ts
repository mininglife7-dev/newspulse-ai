import { NextResponse } from 'next/server';
import {
  generateCostAnomalyReport,
  formatCostAnomalyReport,
} from '@/lib/cost-anomaly-detection';
import { recordAlert } from '@/lib/alert-hub';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/cost-anomaly-detection
 *
 * Analyze current Vercel and Supabase usage for cost anomalies.
 * Compares against baseline to detect unexpected spikes.
 *
 * Returns structured report with detected anomalies and recommendations.
 * Usage: Call periodically (weekly/monthly) to monitor spending.
 */
export async function GET() {
  try {
    const report = await generateCostAnomalyReport();

    // Alert if critical anomalies detected
    if (report.criticalCount > 0) {
      recordAlert(
        'production-health',
        'critical',
        '💰 Critical Cost Anomaly Detected',
        `${report.criticalCount} critical cost anomaly/anomalies detected. Estimated annual impact: $${Math.abs(report.estimatedMonthlyImpact * 12).toFixed(2)}`,
        'Review cost anomaly report immediately and investigate root causes'
      );
    } else if (report.highCount > 0) {
      recordAlert(
        'production-health',
        'warning',
        '⚠️ High Cost Anomaly Detected',
        `${report.highCount} high-severity cost anomaly/anomalies detected. Estimated annual impact: $${Math.abs(report.estimatedMonthlyImpact * 12).toFixed(2)}`,
        'Review recommendations and implement cost optimization measures'
      );
    }

    return NextResponse.json({
      ok: true,
      timestamp: new Date().toISOString(),
      report,
      summary: formatCostAnomalyReport(report),
    });
  } catch (err) {
    console.error('[api/cost-anomaly-detection] error:', err);
    return NextResponse.json(
      {
        ok: false,
        error: 'Failed to analyze cost anomalies',
        message: (err as any).message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
