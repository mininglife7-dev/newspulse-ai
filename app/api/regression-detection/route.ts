import { NextResponse } from 'next/server';
import {
  detectRegressions,
  shouldCreateAlert,
  formatRegressionIssue,
  getBaselineMetrics,
} from '@/lib/regression-detection';
import { getIncidentMetrics } from '@/lib/incident-metrics';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/regression-detection
 *
 * DNS-025 endpoint: Automated regression alerting for incident response metrics.
 *
 * Query params:
 * - hours: Time window in hours for current metrics (default 24)
 * - baseline_hours: Time window for baseline comparison (default 24)
 * - check: Trigger regression check (check=true)
 *
 * Returns:
 * - 200 + alert: Regression alert status
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const hours = parseInt(url.searchParams.get('hours') || '24', 10);
    const baselineHours = parseInt(url.searchParams.get('baseline_hours') || '24', 10);
    const check = url.searchParams.get('check') === 'true';

    // Get current metrics
    const currentMetrics = getIncidentMetrics(hours);

    // Get baseline metrics (simulated - would use historical data in production)
    const baselineMetrics = getBaselineMetrics(baselineHours);

    // Detect regressions
    const alert = detectRegressions(currentMetrics, baselineMetrics);

    // Determine if we should create an alert
    const shouldAlert = shouldCreateAlert(alert);

    return NextResponse.json(
      {
        ok: true,
        alert,
        shouldCreateAlert: shouldAlert,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[regression-detection] Failed:', message);

    return NextResponse.json(
      {
        ok: false,
        error: 'Regression detection failed',
        message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/regression-detection
 *
 * Trigger regression check and create alert if needed.
 *
 * Body:
 * {
 *   action: 'check' | 'create-alert',
 *   hours?: number (default 24),
 *   baseline_hours?: number (default 24)
 * }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, hours = 24, baseline_hours = 24 } = body;

    if (!action) {
      return NextResponse.json({ ok: false, error: 'Missing action' }, { status: 400 });
    }

    // Get current and baseline metrics
    const currentMetrics = getIncidentMetrics(hours);
    const baselineMetrics = getBaselineMetrics(baseline_hours);

    // Detect regressions
    const alert = detectRegressions(currentMetrics, baselineMetrics);

    if (action === 'check') {
      return NextResponse.json(
        {
          ok: true,
          action: 'check',
          alert,
          shouldCreateAlert: shouldCreateAlert(alert),
          timestamp: new Date().toISOString(),
        },
        { status: 200 }
      );
    }

    if (action === 'create-alert') {
      if (!shouldCreateAlert(alert)) {
        return NextResponse.json(
          {
            ok: true,
            action: 'create-alert',
            message: 'No significant regression detected - alert not created',
            alert,
            timestamp: new Date().toISOString(),
          },
          { status: 200 }
        );
      }

      // Format issue for GitHub
      const issueData = formatRegressionIssue(alert);

      // In production, would create GitHub issue here using GitHub API
      // For now, return formatted data
      return NextResponse.json(
        {
          ok: true,
          action: 'create-alert',
          message: 'Regression alert formatted (would create GitHub issue in production)',
          alert,
          issueData,
          timestamp: new Date().toISOString(),
        },
        { status: 200 }
      );
    }

    return NextResponse.json({ ok: false, error: 'Unknown action', action }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[regression-detection] Failed:', message);

    return NextResponse.json(
      {
        ok: false,
        error: 'Regression detection operation failed',
        message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
