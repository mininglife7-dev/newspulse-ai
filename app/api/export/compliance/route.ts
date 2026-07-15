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

    // Fetch all needed data for compliance assessment
    const [detectionsRes, bomRes, alertsRes] = await Promise.all([
      supabase
        .from('ai_system_detections')
        .select('count')
        .eq('workspace_id', workspaceId)
        .eq('status', 'detected'),
      supabase
        .from('ai_bom_records')
        .select('system_id, requires_ai_act_assessment, critical_risk_count')
        .eq('workspace_id', workspaceId),
      supabase
        .from('monitoring_alerts')
        .select('severity')
        .eq('workspace_id', workspaceId),
    ]);

    const systemCount = detectionsRes.count || 0;
    const bomRecords = bomRes.data || [];
    const alerts = alertsRes.data || [];

    // Calculate scores (same logic as /api/compliance/assessment)
    let discoveryScore = 0;
    if (systemCount === 0) {
      discoveryScore = 0;
    } else if (systemCount < 5) {
      discoveryScore = 10;
    } else {
      discoveryScore = 20;
    }

    let documentationScore = 0;
    const bomsWithAssessment = bomRecords.filter((b) => !b.requires_ai_act_assessment).length;
    if (bomRecords.length === 0) {
      documentationScore = 0;
    } else if (bomsWithAssessment < bomRecords.length / 2) {
      documentationScore = 15;
    } else {
      documentationScore = 30;
    }

    let securityScore = 0;
    const criticalAlerts = alerts.filter((a) => a.severity === 'critical').length;
    const highAlerts = alerts.filter((a) => a.severity === 'high').length;
    const totalThreats = alerts.length;

    if (totalThreats === 0) {
      securityScore = 40;
    } else if (criticalAlerts > 0) {
      securityScore = 20;
    } else if (highAlerts > 0) {
      securityScore = 30;
    } else {
      securityScore = 40;
    }

    const overallScore = discoveryScore + documentationScore + securityScore;
    const exportData = {
      exportedAt: new Date().toISOString(),
      workspace: {
        id: workspaceId,
      },
      compliance: {
        overallScore,
        sections: {
          discovery: { score: discoveryScore, weight: 20 },
          documentation: { score: documentationScore, weight: 30 },
          security: { score: securityScore, weight: 50 },
        },
        summary: {
          systemsDiscovered: systemCount,
          systemsWithBom: bomRecords.length,
          systemsNeedingAssessment: bomRecords.filter((b) => b.requires_ai_act_assessment).length,
          criticalThreats: criticalAlerts,
          highThreats: highAlerts,
          totalThreats,
        },
      },
    };

    if (body.format === 'csv') {
      // Return CSV format
      const csvContent = `Compliance Assessment Export
Generated: ${new Date().toISOString()}
Workspace ID: ${workspaceId}

Overall Score,${overallScore}/100
Discovery Score,${discoveryScore}/20
Documentation Score,${documentationScore}/30
Security Score,${securityScore}/50

AI Systems Discovered,${systemCount}
Systems with BOM,${bomRecords.length}
Systems Needing Assessment,${bomRecords.filter((b) => b.requires_ai_act_assessment).length}

Critical Threats,${criticalAlerts}
High Threats,${highAlerts}
Total Threats,${totalThreats}`;

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="compliance-assessment-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    }

    // Return JSON format
    return NextResponse.json(exportData, {
      headers: {
        'Content-Disposition': `attachment; filename="compliance-assessment-${new Date().toISOString().split('T')[0]}.json"`,
      },
    });
  } catch (error) {
    console.error('Compliance export error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
