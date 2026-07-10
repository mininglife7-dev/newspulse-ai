import { SupabaseClient } from '@supabase/supabase-js';

export interface DashboardMetrics {
  totalSystems: number;
  totalAssessments: number;
  completedPlans: number;
  approvedEvidence: number;
  pendingReviews: number;
  overduePlans: number;
  compliancePercentage: number;
  riskDistribution: {
    unacceptable: number;
    high: number;
    limited: number;
    minimal: number;
  };
}

export async function getDashboardMetrics(
  supabase: SupabaseClient,
  workspaceId: string
): Promise<DashboardMetrics> {
  try {
    const [systems, assessments, plans, evidence, pendingEvidence, riskData] =
      await Promise.all([
        supabase
          .from('ai_systems')
          .select('id', { count: 'exact', head: true })
          .eq('workspace_id', workspaceId),

        supabase
          .from('risk_assessments')
          .select('id', { count: 'exact', head: true })
          .eq('workspace_id', workspaceId),

        supabase
          .from('remediation_plans')
          .select('id, status, target_date')
          .eq('workspace_id', workspaceId),

        supabase
          .from('evidence')
          .select('id, status')
          .eq('workspace_id', workspaceId),

        supabase
          .from('evidence')
          .select('id', { count: 'exact', head: true })
          .eq('workspace_id', workspaceId)
          .eq('status', 'submitted'),

        supabase
          .from('risk_assessments')
          .select('risk_level')
          .eq('workspace_id', workspaceId),
      ]);

    const totalSystems = systems.count || 0;
    const totalAssessments = assessments.count || 0;

    // Calculate plan metrics
    const plansData = (plans.data || []) as any[];
    const completedPlans = plansData.filter(p => p.status === 'completed').length;
    const overduePlans = plansData.filter(p => {
      if (p.status === 'completed') return false;
      return new Date(p.target_date) < new Date();
    }).length;

    // Calculate evidence metrics
    const evidenceData = (evidence.data || []) as any[];
    const approvedEvidence = evidenceData.filter(e => e.status === 'approved').length;
    const pendingReviews = pendingEvidence.count || 0;

    // Calculate risk distribution
    const riskDataArray = (riskData.data || []) as any[];
    const riskDistribution = {
      unacceptable: 0,
      high: 0,
      limited: 0,
      minimal: 0,
    };

    riskDataArray.forEach(r => {
      const level = r.risk_level as keyof typeof riskDistribution;
      if (level in riskDistribution) {
        riskDistribution[level]++;
      }
    });

    // Calculate compliance percentage
    const totalObligations = riskDataArray.length;
    const completedObligations = totalAssessments > 0 ? (completedPlans * 100) / totalAssessments : 0;

    return {
      totalSystems,
      totalAssessments,
      completedPlans,
      approvedEvidence,
      pendingReviews,
      overduePlans,
      compliancePercentage: Math.round(completedObligations),
      riskDistribution,
    };
  } catch (error) {
    console.error('[getDashboardMetrics] error:', error);
    return {
      totalSystems: 0,
      totalAssessments: 0,
      completedPlans: 0,
      approvedEvidence: 0,
      pendingReviews: 0,
      overduePlans: 0,
      compliancePercentage: 0,
      riskDistribution: {
        unacceptable: 0,
        high: 0,
        limited: 0,
        minimal: 0,
      },
    };
  }
}
