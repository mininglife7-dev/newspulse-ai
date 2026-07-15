import { createRouteClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface WebhookEvent {
  systemId: string;
  systemName?: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  alertType: string;
  message: string;
  details?: Record<string, any>;
  timestamp?: string;
  source?: string;
}

interface WebhookPayload {
  events: WebhookEvent[];
  source?: string;
  timestamp?: string;
}

function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expected = createHmac('sha256', secret).update(payload).digest('hex');
  return signature === `sha256=${expected}`;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createRouteClient();

    // Get authenticated user or use webhook secret
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get workspace context
    const { data: membership } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle();

    if (!membership) {
      return NextResponse.json(
        { error: 'No active workspace — complete company setup first' },
        { status: 409 }
      );
    }

    const workspaceId = membership.workspace_id as string;

    // Parse request body
    let body: WebhookPayload;
    const rawBody = await request.text();
    try {
      body = JSON.parse(rawBody);
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
      if (!event.severity || !['critical', 'high', 'medium', 'low'].includes(event.severity)) {
        validationErrors.push(`Event ${idx}: valid severity is required`);
      }
      if (!event.alertType) {
        validationErrors.push(`Event ${idx}: alertType is required`);
      }
      if (!event.message) {
        validationErrors.push(`Event ${idx}: message is required`);
      }
    });

    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: 'Event validation failed', details: validationErrors },
        { status: 400 }
      );
    }

    // Create alerts from webhook events
    const alerts = body.events.map((event) => ({
      workspace_id: workspaceId,
      system_id: event.systemId,
      alert_type: event.alertType,
      severity: event.severity,
      confidence: 85, // Webhook events have higher confidence
      message: event.message,
      details: {
        ...event.details,
        source: event.source || body.source || 'webhook',
        webhookSystemName: event.systemName,
      },
      metadata: {
        external: true,
        webhookSource: event.source || body.source || 'external-system',
        originalTimestamp: event.timestamp || new Date().toISOString(),
      },
      timestamp: event.timestamp || new Date().toISOString(),
      created_at: new Date().toISOString(),
    }));

    // Upsert alerts to database
    const { error: upsertError, data: createdAlerts } = await supabase
      .from('monitoring_alerts')
      .insert(alerts)
      .select();

    if (upsertError) {
      console.error('Failed to store webhook alerts:', upsertError);
      return NextResponse.json(
        { error: 'Failed to store alerts' },
        { status: 500 }
      );
    }

    // Aggregate response
    const alertsBySystem = (createdAlerts || []).reduce(
      (acc: Record<string, number>, alert: any) => {
        acc[alert.system_id] = (acc[alert.system_id] || 0) + 1;
        return acc;
      },
      {}
    );

    const alertsBySeverity = (createdAlerts || []).reduce(
      (acc: Record<string, number>, alert: any) => {
        acc[alert.severity] = (acc[alert.severity] || 0) + 1;
        return acc;
      },
      {}
    );

    return NextResponse.json({
      success: true,
      processed: (createdAlerts || []).length,
      alerts: createdAlerts || [],
      summary: {
        totalProcessed: (createdAlerts || []).length,
        bySystem: alertsBySystem,
        bySeverity: alertsBySeverity,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
