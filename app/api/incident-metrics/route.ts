import { NextResponse } from 'next/server';
import {
  createIncident,
  getIncident,
  getIncidentMetrics,
  resolveIncident,
  updateSystemHealth,
  getSystemHealth,
  getIncidentEvents,
  getAllIncidents,
  recordIncidentEvent,
  type IncidentLifecycleMetrics,
} from '@/lib/incident-metrics';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/incident-metrics
 *
 * DNS-023 endpoint: Incident response system observability and metrics.
 *
 * Query params:
 * - incident: Get specific incident by ID
 * - metrics: Get incident metrics (metrics=true)
 * - health: Get system health status (health=true)
 * - all: Get all incidents (all=true)
 * - hours: Time window in hours for metrics (default 24)
 *
 * Returns:
 * - 200 + incident: Specific incident lifecycle data
 * - 200 + metrics: Incident response metrics (MTTR, MTTD, success rate, etc.)
 * - 200 + health: System health status
 * - 200 + incidents: All incidents sorted by creation time
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const incidentId = url.searchParams.get('incident');
    const getMetrics = url.searchParams.get('metrics') === 'true';
    const getHealth = url.searchParams.get('health') === 'true';
    const getAll = url.searchParams.get('all') === 'true';
    const hours = parseInt(url.searchParams.get('hours') || '24', 10);

    // Get specific incident
    if (incidentId) {
      const incident = getIncident(incidentId);

      if (!incident) {
        return NextResponse.json(
          { ok: false, error: 'Incident not found', incidentId },
          { status: 404 }
        );
      }

      return NextResponse.json(
        {
          ok: true,
          incident,
          timestamp: new Date().toISOString(),
        },
        { status: 200 }
      );
    }

    // Get incident metrics
    if (getMetrics) {
      const metrics = getIncidentMetrics(hours);

      return NextResponse.json(
        {
          ok: true,
          metrics,
          timeWindow: hours,
          timestamp: new Date().toISOString(),
        },
        { status: 200 }
      );
    }

    // Get system health
    if (getHealth) {
      const health = getSystemHealth();

      return NextResponse.json(
        {
          ok: true,
          health,
          timestamp: new Date().toISOString(),
        },
        { status: 200 }
      );
    }

    // Get all incidents
    if (getAll) {
      const incidents = getAllIncidents();

      return NextResponse.json(
        {
          ok: true,
          incidentCount: incidents.length,
          incidents,
          timestamp: new Date().toISOString(),
        },
        { status: 200 }
      );
    }

    // Default: return overview
    const metrics = getIncidentMetrics();
    const health = getSystemHealth();
    const incidents = getAllIncidents();

    return NextResponse.json(
      {
        ok: true,
        overview: {
          totalIncidents: metrics.totalIncidents,
          resolvedIncidents: metrics.resolvedIncidents,
          unresolvedIncidents: metrics.unresolvedIncidents,
          averageMTTR: metrics.averageMTTR,
          averageMTTD: metrics.averageMTTD,
          successRate: metrics.successRate,
          systemHealthy:
            health.detectionSystemHealthy &&
            health.correlationSystemHealthy &&
            health.incidentCommandHealthy &&
            health.communicationSystemHealthy &&
            health.remediationSystemHealthy &&
            health.postmortemSystemHealthy,
        },
        recentIncidents: incidents.slice(0, 10),
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[incident-metrics] Failed:', message);

    return NextResponse.json(
      {
        ok: false,
        error: 'Incident metrics query failed',
        message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/incident-metrics
 *
 * Manage incident lifecycle and metrics recording.
 *
 * Body:
 * {
 *   action: 'create' | 'event' | 'resolve' | 'health',
 *   incidentId?: string,
 *   category?: string (for create),
 *   customerImpact?: 'critical' | 'high' | 'medium' | 'low' (for create),
 *   eventType?: string (for event),
 *   source?: string (for event),
 *   details?: object (for event),
 *   successful?: boolean (for resolve),
 *   playbookUsed?: string (for resolve),
 *   system?: string (for health),
 *   healthy?: boolean (for health)
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

    // Create incident
    if (action === 'create') {
      const { incidentId, category, customerImpact } = body;

      if (!incidentId || !category) {
        return NextResponse.json(
          { ok: false, error: 'Missing incidentId or category' },
          { status: 400 }
        );
      }

      const incident = createIncident(incidentId, category, customerImpact || 'medium');

      return NextResponse.json(
        {
          ok: true,
          message: 'Incident created',
          incident,
          timestamp: new Date().toISOString(),
        },
        { status: 200 }
      );
    }

    // Record incident event
    if (action === 'event') {
      const { incidentId, eventType, source, details } = body;

      if (!incidentId || !eventType || !source) {
        return NextResponse.json(
          { ok: false, error: 'Missing incidentId, eventType, or source' },
          { status: 400 }
        );
      }

      const event = recordIncidentEvent(incidentId, eventType, source, details);

      return NextResponse.json(
        {
          ok: true,
          message: 'Incident event recorded',
          event,
          timestamp: new Date().toISOString(),
        },
        { status: 200 }
      );
    }

    // Resolve incident
    if (action === 'resolve') {
      const { incidentId, successful, playbookUsed } = body;

      if (!incidentId || successful === undefined) {
        return NextResponse.json(
          { ok: false, error: 'Missing incidentId or successful' },
          { status: 400 }
        );
      }

      const incident = resolveIncident(incidentId, successful, playbookUsed);

      if (!incident) {
        return NextResponse.json(
          { ok: false, error: 'Incident not found', incidentId },
          { status: 404 }
        );
      }

      return NextResponse.json(
        {
          ok: true,
          message: 'Incident resolved',
          incident,
          timestamp: new Date().toISOString(),
        },
        { status: 200 }
      );
    }

    // Update system health
    if (action === 'health') {
      const { system, healthy } = body;

      if (!system || healthy === undefined) {
        return NextResponse.json(
          { ok: false, error: 'Missing system or healthy' },
          { status: 400 }
        );
      }

      updateSystemHealth(system, healthy);
      const health = getSystemHealth();

      return NextResponse.json(
        {
          ok: true,
          message: 'System health updated',
          health,
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
    console.error('[incident-metrics] Failed:', message);

    return NextResponse.json(
      {
        ok: false,
        error: 'Incident metrics operation failed',
        message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
