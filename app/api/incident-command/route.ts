import { NextResponse } from 'next/server';
import {
  createIncident,
  recordIncidentAction,
  markAutoRecoveryAttempted,
  escalateIncident,
  resolveIncident,
  getIncident,
  getActiveIncidents,
  getIncidentsByStatus,
  generateIncidentStats,
  generateIncidentReport,
  formatIncidentReport,
  type IncidentCategory,
  type IncidentSeverity,
  type IncidentStatus,
} from '@/lib/incident-command';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/incident-command
 *
 * DNS-017 endpoint: Retrieve incident command data.
 *
 * Query params:
 * - status: Filter by status (open, investigating, remediating, resolved, escalated, mitigated)
 * - id: Get specific incident by ID
 * - report: Return full incident report (report=true)
 * - format: Response format (json or markdown)
 *
 * Returns:
 * - 200 + incidents: Active incidents or filtered results
 * - 200 + report: Full incident report if report=true
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const status = url.searchParams.get('status') as IncidentStatus | null;
    const incidentId = url.searchParams.get('id');
    const reportParam = url.searchParams.get('report') === 'true';
    const format = url.searchParams.get('format') || 'json';

    // Get specific incident by ID
    if (incidentId) {
      const incident = getIncident(incidentId);
      if (!incident) {
        return NextResponse.json(
          { ok: false, error: 'Incident not found', incidentId },
          { status: 404 }
        );
      }

      return NextResponse.json(
        { ok: true, incident, timestamp: new Date().toISOString() },
        { status: 200 }
      );
    }

    // Get full incident report
    if (reportParam) {
      const report = generateIncidentReport();
      const formatted = formatIncidentReport(report);

      if (format === 'markdown') {
        return new NextResponse(formatted, {
          status: 200,
          headers: { 'content-type': 'text/markdown; charset=utf-8' },
        });
      }

      return NextResponse.json(
        {
          ok: true,
          timestamp: report.timestamp,
          statistics: report.statistics,
          activeIncidents: report.activeIncidents,
          escalatedIncidents: report.escalatedIncidents,
          recentlyResolved: report.recentlyResolved,
          timeline: report.timeline,
          formatted,
        },
        { status: 200 }
      );
    }

    // Get incidents by status or all active
    const incidents = status ? getIncidentsByStatus(status) : getActiveIncidents();
    const stats = generateIncidentStats();

    const statusCode = stats.escalatedIncidents > 0 ? 206 : 200;

    return NextResponse.json(
      {
        ok: true,
        timestamp: new Date().toISOString(),
        incidents,
        statistics: {
          totalIncidents: stats.totalIncidents,
          activeIncidents: stats.openIncidents + stats.investigatingIncidents + stats.remediatingIncidents,
          escalatedIncidents: stats.escalatedIncidents,
          resolvedIncidents: stats.resolvedIncidents,
          criticalCount: stats.criticalCount,
          warningCount: stats.warningCount,
          infoCount: stats.infoCount,
          autoResolvedCount: stats.autoResolvedCount,
          averageResolutionTime: stats.averageResolutionTime,
        },
      },
      {
        status: statusCode,
        headers: {
          'X-Active-Incidents': String(incidents.length),
          'X-Escalated-Incidents': String(stats.escalatedIncidents),
          'X-Critical-Count': String(stats.criticalCount),
        },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[incident-command] Failed:', message);

    return NextResponse.json(
      {
        ok: false,
        error: 'Incident command query failed',
        message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/incident-command
 *
 * Create new incident or record action on existing incident.
 *
 * Body for new incident:
 * {
 *   action: 'create-incident',
 *   category: 'deployment' | 'database' | 'api' | 'security' | 'performance' | 'infrastructure' | 'external-dependency' | 'customer-impact',
 *   severity: 'info' | 'warning' | 'critical',
 *   title: string,
 *   description: string,
 *   detectedBy: string (e.g. 'DNS-012'),
 *   affectedServices: string[],
 *   affectedUsers: number,
 *   customerImpact: string,
 *   relatedAlertIds?: string[]
 * }
 *
 * Body for recording action:
 * {
 *   action: 'record-action',
 *   incidentId: string,
 *   actor: 'governor-autonomous' | 'founder',
 *   action: string (e.g. 'rollback-initiated', 'investigation-started'),
 *   status: 'pending' | 'in-progress' | 'completed' | 'failed',
 *   result?: string,
 *   error?: string
 * }
 *
 * Body for auto-recovery:
 * {
 *   action: 'mark-auto-recovery',
 *   incidentId: string
 * }
 *
 * Body for escalation:
 * {
 *   action: 'escalate',
 *   incidentId: string,
 *   reason: string
 * }
 *
 * Body for resolution:
 * {
 *   action: 'resolve',
 *   incidentId: string,
 *   resolution: string
 * }
 *
 * Returns:
 * - 201 + incident: Incident created or action recorded
 * - 400: Invalid request
 * - 404: Incident not found
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, incidentId, ...payload } = body;

    if (!action) {
      return NextResponse.json(
        { ok: false, error: 'Missing action field' },
        { status: 400 }
      );
    }

    // Create new incident
    if (action === 'create-incident') {
      const { category, severity, title, description, detectedBy, affectedServices, affectedUsers, customerImpact, relatedAlertIds } = payload;

      if (!category || !severity || !title || !description || !detectedBy || !affectedServices || affectedUsers === undefined || !customerImpact) {
        return NextResponse.json(
          { ok: false, error: 'Missing required fields for incident creation' },
          { status: 400 }
        );
      }

      const incident = createIncident({
        category: category as IncidentCategory,
        severity: severity as IncidentSeverity,
        title,
        description,
        detectedBy,
        affectedServices,
        affectedUsers,
        customerImpact,
        relatedAlertIds,
      });

      return NextResponse.json(
        { ok: true, incident, timestamp: new Date().toISOString() },
        { status: 201 }
      );
    }

    // Record action on incident
    if (action === 'record-action') {
      if (!incidentId) {
        return NextResponse.json(
          { ok: false, error: 'Missing incidentId for record-action' },
          { status: 400 }
        );
      }

      const updated = recordIncidentAction(incidentId, {
        actor: payload.actor || 'governor-autonomous',
        action: payload.action,
        status: payload.status || 'in-progress',
        result: payload.result,
        error: payload.error,
      });

      if (!updated) {
        return NextResponse.json(
          { ok: false, error: 'Incident not found', incidentId },
          { status: 404 }
        );
      }

      return NextResponse.json(
        { ok: true, incident: updated, timestamp: new Date().toISOString() },
        { status: 201 }
      );
    }

    // Mark auto-recovery attempted
    if (action === 'mark-auto-recovery') {
      if (!incidentId) {
        return NextResponse.json(
          { ok: false, error: 'Missing incidentId for mark-auto-recovery' },
          { status: 400 }
        );
      }

      const updated = markAutoRecoveryAttempted(incidentId);

      if (!updated) {
        return NextResponse.json(
          { ok: false, error: 'Incident not found', incidentId },
          { status: 404 }
        );
      }

      return NextResponse.json(
        { ok: true, incident: updated, timestamp: new Date().toISOString() },
        { status: 201 }
      );
    }

    // Escalate incident
    if (action === 'escalate') {
      if (!incidentId) {
        return NextResponse.json(
          { ok: false, error: 'Missing incidentId for escalate' },
          { status: 400 }
        );
      }

      const escalated = escalateIncident(incidentId, payload.reason || 'Manual escalation to Founder');

      if (!escalated) {
        return NextResponse.json(
          { ok: false, error: 'Incident not found', incidentId },
          { status: 404 }
        );
      }

      return NextResponse.json(
        { ok: true, incident: escalated, timestamp: new Date().toISOString() },
        { status: 201 }
      );
    }

    // Resolve incident
    if (action === 'resolve') {
      if (!incidentId) {
        return NextResponse.json(
          { ok: false, error: 'Missing incidentId for resolve' },
          { status: 400 }
        );
      }

      const resolved = resolveIncident(incidentId, payload.resolution || 'Incident resolved');

      if (!resolved) {
        return NextResponse.json(
          { ok: false, error: 'Incident not found', incidentId },
          { status: 404 }
        );
      }

      return NextResponse.json(
        { ok: true, incident: resolved, timestamp: new Date().toISOString() },
        { status: 201 }
      );
    }

    return NextResponse.json(
      { ok: false, error: 'Unknown action', action },
      { status: 400 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[incident-command] Failed:', message);

    return NextResponse.json(
      {
        ok: false,
        error: 'Incident command operation failed',
        message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
