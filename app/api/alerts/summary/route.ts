import { createRouteClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface AlertFilter {
  severity?: 'critical' | 'high' | 'medium' | 'low';
  alertType?: string;
  systemId?: string;
  hoursBack?: number;
}

export async function GET(request: NextRequest) {
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

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const filters: AlertFilter = {
      severity: (searchParams.get('severity') as any) || undefined,
      alertType: searchParams.get('alertType') || undefined,
      systemId: searchParams.get('systemId') || undefined,
      hoursBack: searchParams.get('hoursBack') ? parseInt(searchParams.get('hoursBack')!) : 24,
    };

    // Build query
    let query = supabase
      .from('monitoring_alerts')
      .select('*')
      .eq('workspace_id', workspaceId);

    // Apply filters
    if (filters.severity) {
      query = query.eq('severity', filters.severity);
    }

    if (filters.alertType) {
      query = query.eq('alert_type', filters.alertType);
    }

    if (filters.systemId) {
      query = query.eq('system_id', filters.systemId);
    }

    // Time filter
    const hoursAgo = new Date(Date.now() - filters.hoursBack! * 60 * 60 * 1000).toISOString();
    query = query.gte('timestamp', hoursAgo);

    // Execute query
    const { data: alerts, error: alertsError } = await query.order('timestamp', { ascending: false }).limit(1000);

    if (alertsError) {
      console.error('Failed to fetch alerts:', alertsError);
      return NextResponse.json({ error: 'Failed to fetch alerts' }, { status: 500 });
    }

    // Aggregate statistics
    const stats = {
      totalAlerts: alerts?.length || 0,
      bySeverity: {
        critical: alerts?.filter((a) => a.severity === 'critical').length || 0,
        high: alerts?.filter((a) => a.severity === 'high').length || 0,
        medium: alerts?.filter((a) => a.severity === 'medium').length || 0,
        low: alerts?.filter((a) => a.severity === 'low').length || 0,
      },
      byAlertType: alerts?.reduce(
        (acc, a) => {
          acc[a.alert_type] = (acc[a.alert_type] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      ) || {},
      topSystems: (alerts || [])
        .reduce(
          (acc: Array<{ systemId: string; count: number }>, a) => {
            const existing = acc.find((item) => item.systemId === a.system_id);
            if (existing) {
              existing.count++;
            } else {
              acc.push({ systemId: a.system_id, count: 1 });
            }
            return acc;
          },
          []
        )
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      timeRange: {
        from: hoursAgo,
        to: new Date().toISOString(),
        hoursBack: filters.hoursBack,
      },
    };

    return NextResponse.json({
      alerts: (alerts || []).slice(0, 100), // Return first 100 for UI
      stats,
      filters: {
        applied: filters,
        available: {
          severities: ['critical', 'high', 'medium', 'low'],
          alertTypes: [
            'prompt-injection',
            'hallucination',
            'pii-exposure',
            'jailbreak',
            'token-abuse',
            'anomaly',
          ],
        },
      },
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Alert summary error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
