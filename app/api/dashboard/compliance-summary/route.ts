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

    // Fetch AI systems count
    const { data: aiSystems, error: aiError } = await supabase
      .from('ai_systems')
      .select('id, risk_level, status')
      .eq('workspace_id', workspaceId);

    if (aiError) {
      return NextResponse.json(
        { ok: false, error: aiError.message },
        { status: 500 }
      );
    }

    // Fetch obligations with status breakdown
    const { data: obligations, error: obligationError } = await supabase
      .from('obligations')
      .select('id, priority, status, category')
      .eq('workspace_id', workspaceId);

    if (obligationError) {
      return NextResponse.json(
        { ok: false, error: obligationError.message },
        { status: 500 }
      );
    }

    // Fetch remediations with status breakdown
    const { data: remediations, error: remediationError } = await supabase
      .from('remediations')
      .select('id, status, priority, completed_date')
      .eq('workspace_id', workspaceId);

    if (remediationError) {
      return NextResponse.json(
        { ok: false, error: remediationError.message },
        { status: 500 }
      );
    }

    // Fetch evidence count
    const { data: evidence, error: evidenceError } = await supabase
      .from('evidence')
      .select('id, status')
      .eq('workspace_id', workspaceId);

    if (evidenceError) {
      return NextResponse.json(
        { ok: false, error: evidenceError.message },
        { status: 500 }
      );
    }

    // Calculate summary metrics
    const systemsByRisk = {
      high: aiSystems?.filter((s) => s.risk_level === 'high').length || 0,
      medium: aiSystems?.filter((s) => s.risk_level === 'medium').length || 0,
      low: aiSystems?.filter((s) => s.risk_level === 'low').length || 0,
    };

    const obligationsByPriority = {
      critical:
        obligations?.filter((o) => o.priority === 'critical').length || 0,
      high: obligations?.filter((o) => o.priority === 'high').length || 0,
      medium: obligations?.filter((o) => o.priority === 'medium').length || 0,
      low: obligations?.filter((o) => o.priority === 'low').length || 0,
    };

    const obligationsByStatus = {
      identified:
        obligations?.filter((o) => o.status === 'identified').length || 0,
      in_progress:
        obligations?.filter((o) => o.status === 'in_progress').length || 0,
      completed:
        obligations?.filter((o) => o.status === 'completed').length || 0,
    };

    const remediationsByStatus = {
      open: remediations?.filter((r) => r.status === 'open').length || 0,
      in_progress:
        remediations?.filter((r) => r.status === 'in_progress').length || 0,
      completed:
        remediations?.filter((r) => r.status === 'completed').length || 0,
      blocked: remediations?.filter((r) => r.status === 'blocked').length || 0,
    };

    const evidenceApproved =
      evidence?.filter((e) => e.status === 'approved').length || 0;
    const evidenceTotal = evidence?.length || 0;
    const evidenceApprovalRate =
      evidenceTotal > 0
        ? Math.round((evidenceApproved / evidenceTotal) * 100)
        : 0;

    // Calculate overall compliance score
    const completeObligations = obligationsByStatus.completed;
    const totalObligations = obligations?.length || 0;
    const complianceScore =
      totalObligations > 0
        ? Math.round((completeObligations / totalObligations) * 100)
        : 0;

    return NextResponse.json({
      ok: true,
      summary: {
        workspace_id: workspaceId,
        ai_systems: {
          total: aiSystems?.length || 0,
          by_risk: systemsByRisk,
        },
        obligations: {
          total: totalObligations,
          by_priority: obligationsByPriority,
          by_status: obligationsByStatus,
        },
        remediations: {
          total: remediations?.length || 0,
          by_status: remediationsByStatus,
        },
        evidence: {
          total: evidenceTotal,
          approved: evidenceApproved,
          approval_rate: evidenceApprovalRate,
        },
        compliance_metrics: {
          overall_compliance_score: complianceScore,
          obligations_completed: completeObligations,
          obligations_total: totalObligations,
        },
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || 'Failed to fetch compliance summary',
      },
      { status: 500 }
    );
  }
}
