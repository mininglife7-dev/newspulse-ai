import { createRouteClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface ExportRequest {
  format: 'json' | 'csv';
  severity?: string;
  alertType?: string;
  systemId?: string;
  hoursBack?: number;
}

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
    let body: ExportRequest = { format: 'json', hoursBack: 24 };
    try {
      body = await request.json();
    } catch {
      body = { format: 'json', hoursBack: 24 };
    }

    // Build query
    let query = supabase
      .from('monitoring_alerts')
      .select('*')
      .eq('workspace_id', workspaceId);

    // Apply filters
    if (body.severity) {
      query = query.eq('severity', body.severity);
    }

    if (body.alertType) {
      query = query.eq('alert_type', body.alertType);
    }

    if (body.systemId) {
      query = query.eq('system_id', body.systemId);
    }

    // Time filter
    const hoursAgo = new Date(Date.now() - (body.hoursBack || 24) * 60 * 60 * 1000).toISOString();
    query = query.gte('timestamp', hoursAgo);

    // Execute query
    const { data: alerts, error: alertsError } = await query.order('timestamp', { ascending: false });

    if (alertsError) {
      console.error('Failed to fetch alerts:', alertsError);
      return NextResponse.json({ error: 'Failed to fetch alerts' }, { status: 500 });
    }

    if (body.format === 'csv') {
      // Return CSV format
      const csvHeaders = ['Timestamp', 'Severity', 'Alert Type', 'System ID', 'Confidence', 'Message'];
      const csvRows = (alerts || []).map((alert: any) => [
        new Date(alert.timestamp).toISOString(),
        alert.severity,
        alert.alert_type,
        alert.system_id,
        alert.confidence,
        `"${alert.message.replace(/"/g, '""')}"`,
      ]);

      const csvContent = [csvHeaders, ...csvRows].map((row) => row.join(',')).join('\n');

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="alerts-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    }

    // Return JSON format
    const exportData = {
      exportedAt: new Date().toISOString(),
      workspace: {
        id: workspaceId,
      },
      filters: {
        severity: body.severity,
        alertType: body.alertType,
        systemId: body.systemId,
        hoursBack: body.hoursBack,
      },
      alerts: alerts || [],
      summary: {
        totalAlerts: (alerts || []).length,
        bySeverity: {
          critical: (alerts || []).filter((a: any) => a.severity === 'critical').length,
          high: (alerts || []).filter((a: any) => a.severity === 'high').length,
          medium: (alerts || []).filter((a: any) => a.severity === 'medium').length,
          low: (alerts || []).filter((a: any) => a.severity === 'low').length,
        },
      },
    };

    return NextResponse.json(exportData, {
      headers: {
        'Content-Disposition': `attachment; filename="alerts-${new Date().toISOString().split('T')[0]}.json"`,
      },
    });
  } catch (error) {
    console.error('Alerts export error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
