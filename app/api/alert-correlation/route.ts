import { NextResponse } from 'next/server';
import {
  recordAlert,
  correlateAlerts,
  getNonSuppressedAlerts,
  getCorrelatedGroups,
  recordGroupAction,
  updatePatternSuppression,
  getCorrelationMetrics,
  getAllAlertPatterns,
  type AlertSource,
  type AlertSeverity,
} from '@/lib/alert-correlation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/alert-correlation
 *
 * DNS-022 endpoint: Alert correlation and fatigue reduction.
 *
 * Query params:
 * - alerts: Get non-suppressed alerts (alerts=true)
 * - groups: Get correlated alert groups (groups=true)
 * - metrics: Get correlation metrics (metrics=true)
 * - hours: Time window in hours for filtering (default 24)
 *
 * Returns:
 * - 200 + alerts: Non-suppressed alerts
 * - 200 + groups: Correlated groups sorted by score
 * - 200 + metrics: Alert correlation metrics
 * - 200 + patterns: All alert patterns (default)
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const getAlerts = url.searchParams.get('alerts') === 'true';
    const getGroups = url.searchParams.get('groups') === 'true';
    const getMetrics = url.searchParams.get('metrics') === 'true';
    const hours = parseInt(url.searchParams.get('hours') || '24', 10);

    // Get non-suppressed alerts
    if (getAlerts) {
      const alerts = getNonSuppressedAlerts();

      return NextResponse.json(
        {
          ok: true,
          alertCount: alerts.length,
          alerts,
          timestamp: new Date().toISOString(),
        },
        { status: 200 }
      );
    }

    // Get correlated groups
    if (getGroups) {
      const groups = getCorrelatedGroups(hours);

      return NextResponse.json(
        {
          ok: true,
          groupCount: groups.length,
          groups,
          timestamp: new Date().toISOString(),
        },
        { status: 200 }
      );
    }

    // Get correlation metrics
    if (getMetrics) {
      const metrics = getCorrelationMetrics(hours);

      return NextResponse.json(
        {
          ok: true,
          metrics,
          timestamp: new Date().toISOString(),
        },
        { status: 200 }
      );
    }

    // Get all alert patterns (default)
    const patterns = getAllAlertPatterns();

    return NextResponse.json(
      {
        ok: true,
        patternCount: patterns.length,
        patterns,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[alert-correlation] Failed:', message);

    return NextResponse.json(
      {
        ok: false,
        error: 'Alert correlation query failed',
        message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/alert-correlation
 *
 * Manage alert recording, correlation, and actions.
 *
 * Body:
 * {
 *   action: 'record' | 'correlate' | 'action' | 'update-pattern',
 *   source?: AlertSource (for record),
 *   severity?: AlertSeverity (for record),
 *   title?: string (for record),
 *   description?: string (for record),
 *   tags?: string[] (for record),
 *   metadata?: Record (for record),
 *   groupId?: string (for action),
 *   actionDescription?: string (for action),
 *   patternId?: string (for update-pattern),
 *   enabled?: boolean (for update-pattern)
 * }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action } = body;

    if (!action) {
      return NextResponse.json(
        { ok: false, error: 'Missing action' },
        { status: 400 }
      );
    }

    // Record incoming alert
    if (action === 'record') {
      const { source, severity, title, description, tags, metadata } = body;

      if (!source || !severity || !title || !description || !tags) {
        return NextResponse.json(
          { ok: false, error: 'Missing required fields: source, severity, title, description, tags' },
          { status: 400 }
        );
      }

      const alert = recordAlert(source as AlertSource, severity as AlertSeverity, title, description, tags, metadata);

      return NextResponse.json(
        {
          ok: true,
          message: 'Alert recorded',
          alert,
          timestamp: new Date().toISOString(),
        },
        { status: 200 }
      );
    }

    // Trigger alert correlation
    if (action === 'correlate') {
      const groups = correlateAlerts();

      return NextResponse.json(
        {
          ok: true,
          message: 'Alert correlation completed',
          groupsCreated: groups.length,
          groups,
          timestamp: new Date().toISOString(),
        },
        { status: 200 }
      );
    }

    // Record action on correlated group
    if (action === 'action') {
      const { groupId, actionDescription } = body;

      if (!groupId || !actionDescription) {
        return NextResponse.json(
          { ok: false, error: 'Missing groupId or actionDescription' },
          { status: 400 }
        );
      }

      const group = recordGroupAction(groupId, actionDescription);

      if (!group) {
        return NextResponse.json(
          { ok: false, error: 'Group not found', groupId },
          { status: 404 }
        );
      }

      return NextResponse.json(
        {
          ok: true,
          message: 'Action recorded',
          group,
          timestamp: new Date().toISOString(),
        },
        { status: 200 }
      );
    }

    // Update pattern suppression
    if (action === 'update-pattern') {
      const { patternId, enabled } = body;

      if (!patternId || enabled === undefined) {
        return NextResponse.json(
          { ok: false, error: 'Missing patternId or enabled' },
          { status: 400 }
        );
      }

      updatePatternSuppression(patternId, enabled);

      return NextResponse.json(
        {
          ok: true,
          message: 'Pattern suppression updated',
          patternId,
          enabled,
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
    console.error('[alert-correlation] Failed:', message);

    return NextResponse.json(
      {
        ok: false,
        error: 'Alert correlation operation failed',
        message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
