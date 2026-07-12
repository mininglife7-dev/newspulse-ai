import { NextRequest, NextResponse } from 'next/server';
import { getProductionMetrics } from '@/lib/production-monitoring';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/metrics
 *
 * Returns current production metrics snapshot for dashboard visualization.
 * Used during pilot launch to monitor incident response performance.
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const format = searchParams.get('format') || 'json';

    const metrics = getProductionMetrics();

    if (format === 'text') {
      return new NextResponse(metrics.generateReport(), {
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    const snapshot = metrics.getSnapshot();
    const sla = metrics.getSLACompliance();

    return NextResponse.json({
      timestamp: snapshot.timestamp,
      metrics: {
        incidentCount: snapshot.incidentCount,
        successRate: Number((snapshot.orchestrationSuccessRate * 100).toFixed(1)),
        mttdMs: Math.round(snapshot.avgMTTD),
        mttrMs: Math.round(snapshot.avgMTTR),
        alertDeliveryRate: Number((snapshot.alertDeliveryRate * 100).toFixed(1)),
        falsePositiveRate: Number((snapshot.falsePositiveRate * 100).toFixed(1)),
        gitHubIssuesCreated: snapshot.gitHubIssuesCreated,
      },
      sla: {
        mttdTarget: 30000,
        mttrTarget: 120000,
        mttdCompliant: sla.mttdCompliant,
        mttrCompliant: sla.mttrCompliant,
        overallCompliant: sla.overallCompliant,
      },
      message: sla.overallCompliant
        ? 'All SLAs met - system performing nominally'
        : 'SLA violations detected - review incidents',
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to generate metrics', message: String(error) },
      { status: 500 }
    );
  }
}
