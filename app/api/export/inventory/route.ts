import { createRouteClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface ExportRequest {
  format: 'json' | 'csv';
}

export async function POST(request: Request) {
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
    let body: ExportRequest = { format: 'json' };
    try {
      body = await request.json();
    } catch {
      body = { format: 'json' };
    }

    // Fetch all detected AI systems
    const { data: detections, error: detectionsError } = await supabase
      .from('ai_system_detections')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('status', 'detected')
      .order('created_at', { ascending: false });

    if (detectionsError) {
      console.error('Failed to fetch detections:', detectionsError);
      return NextResponse.json({ error: 'Failed to fetch inventory' }, { status: 500 });
    }

    // Fetch AI-BOM records
    const { data: bomRecords } = await supabase
      .from('ai_bom_records')
      .select('system_id, component_count, critical_risk_count, requires_ai_act_assessment')
      .eq('workspace_id', workspaceId);

    const bomMap = new Map(bomRecords?.map((r) => [r.system_id, r]) || []);

    // Fetch threat alerts
    const { data: alerts } = await supabase
      .from('monitoring_alerts')
      .select('system_id, severity')
      .eq('workspace_id', workspaceId);

    const threatMap = new Map<string, { critical: number; high: number; medium: number; low: number }>();
    alerts?.forEach((alert: any) => {
      if (!threatMap.has(alert.system_id)) {
        threatMap.set(alert.system_id, { critical: 0, high: 0, medium: 0, low: 0 });
      }
      const counts = threatMap.get(alert.system_id)!;
      counts[alert.severity as keyof typeof counts]++;
    });

    // Build inventory
    const systems = (detections || []).map((detection: any) => ({
      id: detection.ai_system_id,
      name: detection.name,
      source: detection.detection_source,
      url: detection.url,
      confidence: detection.confidence,
      topics: detection.topics || [],
      hasAssessment: !!bomMap.get(detection.ai_system_id),
      componentCount: bomMap.get(detection.ai_system_id)?.component_count || 0,
      criticalRisks: bomMap.get(detection.ai_system_id)?.critical_risk_count || 0,
      requiresAssessment: bomMap.get(detection.ai_system_id)?.requires_ai_act_assessment || false,
      threats: threatMap.get(detection.system_id) || { critical: 0, high: 0, medium: 0, low: 0 },
      lastDiscovered: detection.created_at,
    }));

    if (body.format === 'csv') {
      // Return CSV format
      const csvHeaders = [
        'System ID',
        'Name',
        'Source',
        'Confidence',
        'URL',
        'Has BOM',
        'Components',
        'Critical Risks',
        'Needs Assessment',
        'Critical Threats',
        'High Threats',
        'Last Discovered',
      ];

      const csvRows = systems.map((sys: any) => [
        sys.id,
        `"${sys.name}"`,
        sys.source,
        sys.confidence,
        `"${sys.url}"`,
        sys.hasAssessment ? 'Yes' : 'No',
        sys.componentCount,
        sys.criticalRisks,
        sys.requiresAssessment ? 'Yes' : 'No',
        sys.threats.critical,
        sys.threats.high,
        new Date(sys.lastDiscovered).toISOString(),
      ]);

      const csvContent = [csvHeaders, ...csvRows].map((row) => row.join(',')).join('\n');

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="inventory-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    }

    // Return JSON format
    const exportData = {
      exportedAt: new Date().toISOString(),
      workspace: {
        id: workspaceId,
      },
      systems,
      summary: {
        totalSystems: systems.length,
        bySource: systems.reduce(
          (acc: any, s: any) => {
            acc[s.source] = (acc[s.source] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>
        ),
        systemsWithBom: systems.filter((s: any) => s.hasAssessment).length,
        systemsNeedingAssessment: systems.filter((s: any) => s.requiresAssessment).length,
        totalAlerts: alerts?.length || 0,
        criticalAlerts: alerts?.filter((a: any) => a.severity === 'critical').length || 0,
      },
    };

    return NextResponse.json(exportData, {
      headers: {
        'Content-Disposition': `attachment; filename="inventory-${new Date().toISOString().split('T')[0]}.json"`,
      },
    });
  } catch (error) {
    console.error('Inventory export error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
