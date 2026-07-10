import { NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase-server';
import {
  calculateOverallStatus,
  identifyKeyRisks,
  generateNextSteps,
  type ComplianceReportData,
} from '@/lib/compliance-report';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Resolve the caller's active workspace.
 */
async function resolveContext(supabase: ReturnType<typeof createRouteClient>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: 401 as const, error: 'Authentication required' };

  const { data: membership } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle();

  if (!membership) {
    return {
      status: 409 as const,
      error: 'No workspace yet — complete company setup first',
    };
  }

  const { data: workspace } = await supabase
    .from('workspaces')
    .select('name')
    .eq('id', membership.workspace_id)
    .limit(1)
    .maybeSingle();

  return {
    status: 200 as const,
    workspaceId: membership.workspace_id as string,
    workspaceName: (workspace?.name as string) ?? 'Unknown Workspace',
  };
}

/** GET /api/compliance-report — generate compliance report */
export async function GET(req: Request) {
  const supabase = createRouteClient();
  const ctx = await resolveContext(supabase);
  if (ctx.status !== 200) {
    return NextResponse.json(
      { ok: false, error: ctx.error },
      { status: ctx.status }
    );
  }

  try {
    // Fetch assessment data
    const { data: assessments, error: assessmentError } = await supabase
      .from('risk_assessments')
      .select('risk_level')
      .eq('workspace_id', ctx.workspaceId);

    if (assessmentError) throw assessmentError;

    // Fetch systems data
    const { data: systems, error: systemsError } = await supabase
      .from('ai_systems')
      .select('id')
      .eq('workspace_id', ctx.workspaceId);

    if (systemsError) throw systemsError;

    // Fetch obligations data
    const { data: obligations, error: obligationError } = await supabase
      .from('obligations')
      .select('status')
      .eq('workspace_id', ctx.workspaceId);

    if (obligationError) throw obligationError;

    // Fetch remediation plans data
    const { data: plans, error: plansError } = await supabase
      .from('remediation_plans')
      .select('status, target_date')
      .eq('workspace_id', ctx.workspaceId);

    if (plansError) throw plansError;

    // Fetch evidence data
    const { data: evidence, error: evidenceError } = await supabase
      .from('evidence')
      .select('status')
      .eq('workspace_id', ctx.workspaceId);

    if (evidenceError) throw evidenceError;

    // Calculate metrics
    const totalSystems = systems?.length ?? 0;
    const assessedSystems = assessments?.length ?? 0;
    const assessmentCompletion = totalSystems > 0 ? (assessedSystems / totalSystems) * 100 : 0;

    const riskDistribution = {
      unacceptable: assessments?.filter((a: any) => a.risk_level === 'unacceptable').length ?? 0,
      high: assessments?.filter((a: any) => a.risk_level === 'high').length ?? 0,
      limited: assessments?.filter((a: any) => a.risk_level === 'limited').length ?? 0,
      minimal: assessments?.filter((a: any) => a.risk_level === 'minimal').length ?? 0,
    };

    const obligationStats = {
      total: obligations?.length ?? 0,
      identified: obligations?.filter((o: any) => o.status === 'identified').length ?? 0,
      in_progress: obligations?.filter((o: any) => o.status === 'in_progress').length ?? 0,
      completed: obligations?.filter((o: any) => o.status === 'completed').length ?? 0,
      not_applicable: obligations?.filter((o: any) => o.status === 'not_applicable').length ?? 0,
    };
    const obligationCompletion = obligationStats.total > 0 ? (obligationStats.completed / obligationStats.total) * 100 : 0;

    const planStats = {
      total: plans?.length ?? 0,
      planned: plans?.filter((p: any) => p.status === 'planned').length ?? 0,
      in_progress: plans?.filter((p: any) => p.status === 'in_progress').length ?? 0,
      completed: plans?.filter((p: any) => p.status === 'completed').length ?? 0,
      on_hold: plans?.filter((p: any) => p.status === 'on_hold').length ?? 0,
    };
    const remediationCompletion = planStats.total > 0 ? (planStats.completed / planStats.total) * 100 : 0;

    // Count overdue plans
    const now = new Date();
    const overdueCount = plans?.filter((p: any) => p.target_date && new Date(p.target_date) < now).length ?? 0;

    const evidenceStats = {
      total: evidence?.length ?? 0,
      submitted: evidence?.filter((e: any) => e.status === 'submitted').length ?? 0,
      under_review: evidence?.filter((e: any) => e.status === 'under_review').length ?? 0,
      approved: evidence?.filter((e: any) => e.status === 'approved').length ?? 0,
      rejected: evidence?.filter((e: any) => e.status === 'rejected').length ?? 0,
    };
    const approvalRate = evidenceStats.total > 0 ? (evidenceStats.approved / evidenceStats.total) * 100 : 0;

    // Calculate overall status
    const overallStatus = calculateOverallStatus(
      assessmentCompletion,
      obligationCompletion,
      remediationCompletion,
      approvalRate
    );

    const keyRisks = identifyKeyRisks(riskDistribution);
    const nextSteps = generateNextSteps(
      assessmentCompletion,
      obligationCompletion,
      remediationCompletion,
      overdueCount
    );

    const report: ComplianceReportData = {
      generatedAt: new Date().toISOString(),
      workspaceName: ctx.workspaceName,
      metrics: {
        compliance: {
          totalSystems,
          assessedSystems,
          assessmentCompletion: Math.round(assessmentCompletion),
          riskDistribution,
        },
        obligations: {
          totalObligations: obligationStats.total,
          byStatus: {
            identified: obligationStats.identified,
            in_progress: obligationStats.in_progress,
            completed: obligationStats.completed,
            not_applicable: obligationStats.not_applicable,
          },
          completionRate: Math.round(obligationCompletion),
        },
        remediation: {
          totalPlans: planStats.total,
          byStatus: {
            planned: planStats.planned,
            in_progress: planStats.in_progress,
            completed: planStats.completed,
            on_hold: planStats.on_hold,
          },
          completionRate: Math.round(remediationCompletion),
          overdue: overdueCount,
        },
        evidence: {
          totalEvidence: evidenceStats.total,
          byStatus: {
            submitted: evidenceStats.submitted,
            under_review: evidenceStats.under_review,
            approved: evidenceStats.approved,
            rejected: evidenceStats.rejected,
          },
          approvalRate: Math.round(approvalRate),
        },
      },
      summary: {
        overallStatus,
        keyRisks,
        nextSteps,
      },
    };

    return NextResponse.json({
      ok: true,
      report,
    });
  } catch (error) {
    console.error('[api/compliance-report] generation failed:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to generate compliance report' },
      { status: 500 }
    );
  }
}
