import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

interface ComplianceSummary {
  totalSystems: number;
  assessedSystems: number;
  unassessedSystems: number;
  riskDistribution: {
    unacceptable: number;
    high: number;
    medium: number;
    low: number;
  };
  assessmentStatus: {
    draft: number;
    in_review: number;
    finalized: number;
  };
  evidenceMetrics: {
    submitted: number;
    under_review: number;
    approved: number;
    rejected: number;
  };
  obligationMetrics: {
    total: number;
    identified: number;
    in_progress: number;
    completed: number;
    not_applicable: number;
    high_priority: number;
    critical_priority: number;
  };
  complianceHealth: 'critical' | 'warning' | 'good' | 'excellent';
  readinessPercentage: number;
}

async function resolveContext(supabase: Awaited<ReturnType<typeof createRouteClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { status: 401 as const, error: 'Authentication required' };

  const { data: membership } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle();

  if (!membership) {
    return { status: 401 as const, error: 'Not a workspace member' };
  }

  return {
    status: 200 as const,
    workspaceId: membership.workspace_id as string,
    userId: user.id,
  };
}

/** GET /api/compliance-dashboard — fetch compliance status summary */
export async function GET(request: NextRequest) {
  const supabase = await createRouteClient();
  const ctx = await resolveContext(supabase);
  if (ctx.status !== 200) {
    return NextResponse.json(
      { ok: false, error: ctx.error },
      { status: ctx.status }
    );
  }

  try {
    // Fetch all AI systems
    const { data: systems } = await supabase
      .from('ai_systems')
      .select('id')
      .eq('workspace_id', ctx.workspaceId);

    const totalSystems = systems?.length ?? 0;

    // Fetch all assessments
    const { data: assessments } = await supabase
      .from('risk_assessments')
      .select('id, risk_level, status')
      .eq('workspace_id', ctx.workspaceId);

    const assessedSystems = assessments?.length ?? 0;
    const unassessedSystems = Math.max(0, totalSystems - assessedSystems);

    // Calculate risk distribution
    const riskDistribution = {
      unacceptable: assessments?.filter((a) => a.risk_level === 'unacceptable').length ?? 0,
      high: assessments?.filter((a) => a.risk_level === 'high').length ?? 0,
      medium: assessments?.filter((a) => a.risk_level === 'medium').length ?? 0,
      low: assessments?.filter((a) => a.risk_level === 'low').length ?? 0,
    };

    // Calculate assessment status
    const assessmentStatus = {
      draft: assessments?.filter((a) => a.status === 'draft').length ?? 0,
      in_review: assessments?.filter((a) => a.status === 'in_review').length ?? 0,
      finalized: assessments?.filter((a) => a.status === 'finalized').length ?? 0,
    };

    // Fetch evidence metrics
    const { data: evidence } = await supabase
      .from('evidence')
      .select('status')
      .eq('workspace_id', ctx.workspaceId);

    const evidenceMetrics = {
      submitted: evidence?.filter((e) => e.status === 'submitted').length ?? 0,
      under_review: evidence?.filter((e) => e.status === 'under_review').length ?? 0,
      approved: evidence?.filter((e) => e.status === 'approved').length ?? 0,
      rejected: evidence?.filter((e) => e.status === 'rejected').length ?? 0,
    };

    // Fetch obligation metrics
    const { data: obligations } = await supabase
      .from('obligations')
      .select('status, priority')
      .eq('workspace_id', ctx.workspaceId);

    const obligationMetrics = {
      total: obligations?.length ?? 0,
      identified: obligations?.filter((o) => o.status === 'identified').length ?? 0,
      in_progress: obligations?.filter((o) => o.status === 'in_progress').length ?? 0,
      completed: obligations?.filter((o) => o.status === 'completed').length ?? 0,
      not_applicable: obligations?.filter((o) => o.status === 'not_applicable').length ?? 0,
      high_priority: obligations?.filter((o) => o.priority === 'high').length ?? 0,
      critical_priority: obligations?.filter((o) => o.priority === 'critical').length ?? 0,
    };

    // Calculate compliance health
    let complianceHealth: 'critical' | 'warning' | 'good' | 'excellent';
    if (riskDistribution.unacceptable > 0) {
      complianceHealth = 'critical';
    } else if (riskDistribution.high > 0 && (unassessedSystems > 0 || evidenceMetrics.submitted > 0)) {
      complianceHealth = 'warning';
    } else if (assessedSystems === totalSystems && evidenceMetrics.under_review === 0 && evidenceMetrics.submitted === 0) {
      complianceHealth = 'excellent';
    } else {
      complianceHealth = 'good';
    }

    // Calculate readiness percentage
    const assessmentReadiness = totalSystems > 0 ? (assessedSystems / totalSystems) * 100 : 0;
    const evidenceReadiness = assessedSystems > 0 ? ((evidenceMetrics.approved + assessedSystems - unassessedSystems) / assessedSystems) * 100 : 0;
    const finalizationReadiness = assessedSystems > 0 ? (assessmentStatus.finalized / assessedSystems) * 100 : 0;
    const readinessPercentage = (assessmentReadiness + Math.min(evidenceReadiness, 100) + finalizationReadiness) / 3;

    const summary: ComplianceSummary = {
      totalSystems,
      assessedSystems,
      unassessedSystems,
      riskDistribution,
      assessmentStatus,
      evidenceMetrics,
      obligationMetrics,
      complianceHealth,
      readinessPercentage: Math.round(readinessPercentage),
    };

    return NextResponse.json({ ok: true, summary });
  } catch (err: any) {
    console.error('[api/compliance-dashboard] GET failed:', err);
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch compliance dashboard' },
      { status: 500 }
    );
  }
}
