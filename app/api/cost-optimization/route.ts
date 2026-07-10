import { NextResponse } from 'next/server';
import {
  recordCostDataPoint,
  detectAnomalies,
  checkThresholdsAndEscalate,
  markEscalationNotified,
  updateThreshold,
  generateCostReport,
  getRecentEscalations,
  getEscalation,
  formatCostReportAsMarkdown,
  type CostProvider,
  type CostMetric,
  type EscalationSeverity,
  type CostThreshold,
} from '@/lib/cost-optimization';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/cost-optimization
 *
 * DNS-020 endpoint: Cost optimization escalation for cloud resource monitoring.
 *
 * Query params:
 * - report: Generate cost report (report=true)
 * - hours: Escalation lookback window (default 24)
 * - format: Response format (json or markdown)
 *
 * Returns:
 * - 200 + escalations: Recent escalation events
 * - 200 + report: Cost report if report=true
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const reportParam = url.searchParams.get('report') === 'true';
    const hours = parseInt(url.searchParams.get('hours') || '24', 10);
    const format = url.searchParams.get('format') || 'json';

    // Get cost report if requested
    if (reportParam) {
      const periodEnd = new Date();
      const periodStart = new Date(periodEnd.getTime() - 24 * 60 * 60 * 1000);

      const report = generateCostReport(periodStart, periodEnd);

      if (format === 'markdown') {
        const markdown = formatCostReportAsMarkdown(report);
        return new NextResponse(markdown, {
          status: 200,
          headers: { 'content-type': 'text/markdown; charset=utf-8' },
        });
      }

      return NextResponse.json(
        {
          ok: true,
          report,
          timestamp: new Date().toISOString(),
        },
        { status: 200 }
      );
    }

    // Get recent escalations
    const escalations = getRecentEscalations(hours);

    return NextResponse.json(
      {
        ok: true,
        timestamp: new Date().toISOString(),
        escalationCount: escalations.length,
        criticalCount: escalations.filter((e) => e.severity === 'critical').length,
        warningCount: escalations.filter((e) => e.severity === 'warning').length,
        escalations,
      },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[cost-optimization] Failed:', message);

    return NextResponse.json(
      {
        ok: false,
        error: 'Cost optimization query failed',
        message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/cost-optimization
 *
 * Record costs, detect anomalies, and manage escalations.
 *
 * Body:
 * {
 *   action: 'record' | 'detect' | 'escalate' | 'notify' | 'update-threshold',
 *   provider?: CostProvider (for record),
 *   metric?: CostMetric (for record),
 *   cost?: number (for record),
 *   escalationId?: string (for notify),
 *   threshold?: CostThreshold (for update-threshold)
 * }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action } = body;

    if (!action) {
      return NextResponse.json(
        { ok: false, error: 'Missing action field' },
        { status: 400 }
      );
    }

    // Record cost data point
    if (action === 'record') {
      const { provider, metric, cost, currency, unit, metadata } = body;

      if (!provider || !metric || typeof cost !== 'number') {
        return NextResponse.json(
          { ok: false, error: 'Missing or invalid provider, metric, or cost' },
          { status: 400 }
        );
      }

      const dataPoint = recordCostDataPoint(
        provider as CostProvider,
        metric as CostMetric,
        cost,
        currency || 'USD',
        unit,
        metadata
      );

      return NextResponse.json(
        {
          ok: true,
          dataPoint,
          timestamp: new Date().toISOString(),
        },
        { status: 201 }
      );
    }

    // Detect anomalies
    if (action === 'detect') {
      const anomalies = detectAnomalies();

      return NextResponse.json(
        {
          ok: true,
          anomaliesDetected: anomalies.length,
          anomalies,
          timestamp: new Date().toISOString(),
        },
        { status: 200 }
      );
    }

    // Check thresholds and generate escalations
    if (action === 'escalate') {
      const escalations = checkThresholdsAndEscalate();

      return NextResponse.json(
        {
          ok: true,
          escalationsTriggered: escalations.length,
          criticalCount: escalations.filter((e) => e.severity === 'critical').length,
          warningCount: escalations.filter((e) => e.severity === 'warning').length,
          escalations,
          timestamp: new Date().toISOString(),
        },
        { status: 201 }
      );
    }

    // Mark escalation as notified to Founder
    if (action === 'notify') {
      const { escalationId } = body;

      if (!escalationId) {
        return NextResponse.json(
          { ok: false, error: 'Missing escalationId' },
          { status: 400 }
        );
      }

      const escalation = markEscalationNotified(escalationId);

      if (!escalation) {
        return NextResponse.json(
          { ok: false, error: 'Escalation not found', escalationId },
          { status: 404 }
        );
      }

      return NextResponse.json(
        {
          ok: true,
          message: 'Escalation marked as notified',
          escalationId,
          timestamp: new Date().toISOString(),
        },
        { status: 200 }
      );
    }

    // Update cost threshold
    if (action === 'update-threshold') {
      const { provider, metric, threshold } = body;

      if (!provider || !metric || !threshold) {
        return NextResponse.json(
          { ok: false, error: 'Missing provider, metric, or threshold data' },
          { status: 400 }
        );
      }

      updateThreshold(
        provider as CostProvider,
        metric as CostMetric,
        threshold as CostThreshold
      );

      return NextResponse.json(
        {
          ok: true,
          message: `Threshold updated for ${provider}/${metric}`,
          timestamp: new Date().toISOString(),
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { ok: false, error: 'Unknown action', action },
      { status: 400 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[cost-optimization] Failed:', message);

    return NextResponse.json(
      {
        ok: false,
        error: 'Cost optimization operation failed',
        message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
