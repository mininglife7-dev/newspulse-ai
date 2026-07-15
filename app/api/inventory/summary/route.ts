import { createRouteClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface InventorySystemSummary {
  id: string;
  name: string;
  source: 'github' | 'aws' | 'azure' | 'gcp';
  url: string;
  confidence: number;
  topics: string[];
  bom?: {
    componentCount: number;
    criticalRiskCount: number;
    requiresAiActAssessment: boolean;
  };
  threats?: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  complianceStatus: 'not-assessed' | 'in-progress' | 'compliant' | 'needs-attention';
  lastDiscovered: string;
}

export async function GET(request: Request) {
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
    alerts?.forEach((alert) => {
      if (!threatMap.has(alert.system_id)) {
        threatMap.set(alert.system_id, { critical: 0, high: 0, medium: 0, low: 0 });
      }
      const counts = threatMap.get(alert.system_id)!;
      counts[alert.severity as keyof typeof counts]++;
    });

    // Build inventory summary
    const systems: InventorySystemSummary[] = detections!.map((detection) => {
      const bom = bomMap.get(detection.ai_system_id);
      const threats = threatMap.get(detection.system_id);

      // Determine compliance status
      let complianceStatus: InventorySystemSummary['complianceStatus'] = 'not-assessed';
      if (bom) {
        if (bom.requires_ai_act_assessment) {
          complianceStatus = 'in-progress';
        } else {
          complianceStatus = 'compliant';
        }
      }
      if (threats && (threats.critical > 0 || threats.high > 0)) {
        complianceStatus = 'needs-attention';
      }

      return {
        id: detection.ai_system_id,
        name: detection.name,
        source: detection.detection_source as 'github' | 'aws' | 'azure' | 'gcp',
        url: detection.url,
        confidence: detection.confidence,
        topics: detection.topics || [],
        bom: bom
          ? {
              componentCount: bom.component_count,
              criticalRiskCount: bom.critical_risk_count,
              requiresAiActAssessment: bom.requires_ai_act_assessment,
            }
          : undefined,
        threats: threats
          ? {
              critical: threats.critical,
              high: threats.high,
              medium: threats.medium,
              low: threats.low,
            }
          : undefined,
        complianceStatus,
        lastDiscovered: detection.created_at,
      };
    });

    // Aggregate statistics
    const stats = {
      totalSystems: systems.length,
      bySource: systems.reduce(
        (acc, s) => {
          acc[s.source] = (acc[s.source] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      ),
      complianceStatus: systems.reduce(
        (acc, s) => {
          acc[s.complianceStatus] = (acc[s.complianceStatus] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      ),
      threatSummary: {
        systemsWithThreats: systems.filter((s) => s.threats && (s.threats.critical > 0 || s.threats.high > 0)).length,
        totalAlerts: alerts?.length || 0,
        criticalAlerts: alerts?.filter((a) => a.severity === 'critical').length || 0,
        highAlerts: alerts?.filter((a) => a.severity === 'high').length || 0,
      },
      bomCoverage: {
        systemsWithBom: systems.filter((s) => s.bom).length,
        systemsNeedingAssessment: systems.filter((s) => s.bom?.requiresAiActAssessment).length,
      },
    };

    return NextResponse.json({
      systems,
      stats,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Inventory summary error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
