import { createRouteClient } from '@/lib/supabase-server';
import { detectThreats, RuntimeEvent, MonitoringAlert } from '@/lib/integrations/runtime-monitoring';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export interface DetectThreatsRequest {
  events: RuntimeEvent[];
  tags?: Record<string, string>;
}

export interface DetectThreatsResponse {
  alerts: MonitoringAlert[];
  summary: {
    totalEvents: number;
    totalAlerts: number;
    alertsByType: Record<string, number>;
    alertsBySeverity: Record<string, number>;
    criticalCount: number;
  };
}

/**
 * POST /api/runtime-events/detect
 *
 * Detect threats in runtime events (prompt injection, PII exposure, jailbreaks, etc.)
 *
 * Request body:
 * {
 *   events: [
 *     {
 *       systemId: "sys-1",
 *       timestamp: "2026-07-15T07:30:00Z",
 *       eventType: "prompt",
 *       input: "user prompt text",
 *       metadata: { userId: "user-123" }
 *     }
 *   ],
 *   tags: { environment: "production" }
 * }
 *
 * Returns: alerts array with threat detection results
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createRouteClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get workspace context
    const { data: workspaceData, error: workspaceError } = await supabase
      .from('workspaces')
      .select('id')
      .eq('owner_id', user.id)
      .single();

    if (workspaceError || !workspaceData) {
      return NextResponse.json(
        { error: 'Workspace not found' },
        { status: 404 }
      );
    }

    const workspaceId = workspaceData.id;

    // Parse request body
    let body: DetectThreatsRequest;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    // Validate input
    if (!body.events || !Array.isArray(body.events)) {
      return NextResponse.json(
        { error: 'events array is required' },
        { status: 400 }
      );
    }

    if (body.events.length === 0) {
      return NextResponse.json(
        { error: 'events array must not be empty' },
        { status: 400 }
      );
    }

    // Validate each event
    const validationErrors: string[] = [];
    body.events.forEach((event, idx) => {
      if (!event.systemId) {
        validationErrors.push(`Event ${idx}: systemId is required`);
      }
      if (!event.timestamp) {
        validationErrors.push(`Event ${idx}: timestamp is required`);
      }
      if (!event.eventType) {
        validationErrors.push(`Event ${idx}: eventType is required`);
      }
    });

    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationErrors },
        { status: 400 }
      );
    }

    // Process each event through threat detection
    const allAlerts: MonitoringAlert[] = [];
    const alertTypes: Record<string, number> = {};
    const alertSeverities: Record<string, number> = {};

    for (const event of body.events) {
      // Ensure event has workspace context
      const enrichedEvent: RuntimeEvent = {
        ...event,
        metadata: {
          ...event.metadata,
          workspaceId,
          tags: body.tags,
        },
      };

      // Run threat detection
      const threats = await detectThreats(enrichedEvent);

      for (const alert of threats) {
        allAlerts.push(alert);

        // Track alert type counts
        alertTypes[alert.alertType] = (alertTypes[alert.alertType] || 0) + 1;

        // Track severity counts
        alertSeverities[alert.severity] = (alertSeverities[alert.severity] || 0) + 1;
      }
    }

    // Store alerts in database (batch insert via RLS)
    if (allAlerts.length > 0) {
      const alertsToStore = allAlerts.map((alert) => ({
        id: alert.id,
        workspace_id: workspaceId,
        system_id: alert.systemId,
        alert_type: alert.alertType,
        severity: alert.severity,
        confidence: alert.confidence,
        message: alert.message,
        details: alert.details,
        metadata: alert.metadata,
        timestamp: alert.timestamp,
        created_at: new Date().toISOString(),
      }));

      // Use upsert to avoid duplicates (by alert id)
      const { error: storageError } = await supabase.from('monitoring_alerts').upsert(alertsToStore, {
        onConflict: 'id',
      });

      if (storageError) {
        console.error('Failed to store alerts:', storageError);
        // Don't fail the request - return detected alerts even if storage fails
      }
    }

    // Build response
    const criticalCount = (alertSeverities['critical'] || 0) + (alertSeverities['high'] || 0);

    const response: DetectThreatsResponse = {
      alerts: allAlerts,
      summary: {
        totalEvents: body.events.length,
        totalAlerts: allAlerts.length,
        alertsByType: alertTypes,
        alertsBySeverity: alertSeverities,
        criticalCount,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Runtime threat detection error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
