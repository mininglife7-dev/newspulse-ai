import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const workspaceId = req.nextUrl.searchParams.get('workspace_id');

    if (!workspaceId) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Missing required query parameter: workspace_id',
        },
        { status: 400 }
      );
    }

    // Get current authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { ok: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify user has access to this workspace
    const { data: member, error: memberError } = await supabase
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single();

    if (memberError || !member) {
      return NextResponse.json(
        { ok: false, error: 'Access denied to this workspace' },
        { status: 403 }
      );
    }

    // Fetch AI systems with their latest risk assessments
    const { data: aiSystems, error: aiError } = await supabase
      .from('ai_systems')
      .select('id, name, risk_level, status')
      .eq('workspace_id', workspaceId);

    if (aiError) {
      return NextResponse.json(
        { ok: false, error: aiError.message },
        { status: 500 }
      );
    }

    // Fetch latest risk assessment for each AI system
    const { data: riskAssessments, error: riskError } = await supabase
      .from('risk_assessments')
      .select('id, ai_system_id, risk_score, assessment_type, created_at')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (riskError) {
      return NextResponse.json(
        { ok: false, error: riskError.message },
        { status: 500 }
      );
    }

    // Group risk assessments by AI system and get latest
    const latestAssessmentsBySystem: Record<string, any> = {};
    riskAssessments?.forEach((assessment) => {
      if (!latestAssessmentsBySystem[assessment.ai_system_id]) {
        latestAssessmentsBySystem[assessment.ai_system_id] = assessment;
      }
    });

    // Fetch obligations linked to each AI system
    const { data: obligationsBySystem, error: obligationError } = await supabase
      .from('obligations')
      .select('id, ai_system_id, priority, status, category')
      .eq('workspace_id', workspaceId);

    if (obligationError) {
      return NextResponse.json(
        { ok: false, error: obligationError.message },
        { status: 500 }
      );
    }

    // Group obligations by AI system
    const obligationMap: Record<string, any[]> = {};
    obligationsBySystem?.forEach((obligation) => {
      if (!obligationMap[obligation.ai_system_id]) {
        obligationMap[obligation.ai_system_id] = [];
      }
      obligationMap[obligation.ai_system_id].push(obligation);
    });

    // Build heatmap data
    const heatmapData =
      aiSystems?.map((system) => {
        const assessment = latestAssessmentsBySystem[system.id];
        const systemObligations = obligationMap[system.id] || [];
        const incompleteObligations = systemObligations.filter(
          (o) => o.status !== 'completed'
        );
        const criticalObligations = systemObligations.filter(
          (o) => o.priority === 'critical' && o.status !== 'completed'
        );

        return {
          ai_system_id: system.id,
          ai_system_name: system.name,
          risk_level: system.risk_level,
          status: system.status,
          latest_risk_score: assessment?.risk_score || 0,
          latest_assessment_type: assessment?.assessment_type || null,
          obligations_total: systemObligations.length,
          obligations_incomplete: incompleteObligations.length,
          critical_obligations: criticalObligations.length,
          compliance_urgency:
            criticalObligations.length > 0
              ? 'critical'
              : incompleteObligations.length > 0
                ? 'high'
                : 'low',
        };
      }) || [];

    // Sort by risk/urgency
    heatmapData.sort((a, b) => {
      const urgencyOrder = { critical: 3, high: 2, low: 1 };
      const aUrgency =
        urgencyOrder[a.compliance_urgency as keyof typeof urgencyOrder] || 0;
      const bUrgency =
        urgencyOrder[b.compliance_urgency as keyof typeof urgencyOrder] || 0;
      return bUrgency - aUrgency || b.latest_risk_score - a.latest_risk_score;
    });

    return NextResponse.json({
      ok: true,
      heatmap: heatmapData,
      summary: {
        total_systems: heatmapData.length,
        critical_systems: heatmapData.filter(
          (s) => s.compliance_urgency === 'critical'
        ).length,
        high_risk_systems: heatmapData.filter(
          (s) => s.compliance_urgency === 'high'
        ).length,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || 'Failed to fetch risk heatmap',
      },
      { status: 500 }
    );
  }
}
