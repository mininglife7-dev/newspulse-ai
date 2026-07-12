import { NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase-server';
import {
  calculateComplianceMetrics,
  calculateObligationMetrics,
  identifyComplianceGaps,
  estimateComplianceTimeline,
  calculateComplianceScore,
} from '@/lib/compliance-metrics';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/gap-analysis
 * Analyze compliance gaps for a company
 *
 * Query params:
 * - company_id: Company to analyze (required)
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const companyId = url.searchParams.get('company_id');

  if (!companyId) {
    return NextResponse.json(
      { ok: false, error: 'company_id is required' },
      { status: 400 }
    );
  }

  const supabase = await createRouteClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: 'Authentication required' }, { status: 401 });
  }

  // Verify user has access to this company
  const { data: company, error: companyError } = await supabase
    .from('companies')
    .select('id, workspace_id')
    .eq('id', companyId)
    .maybeSingle();

  if (companyError || !company) {
    return NextResponse.json(
      { ok: false, error: 'Company not found' },
      { status: 404 }
    );
  }

  // Verify user is member of workspace
  const { data: membership } = await supabase
    .from('workspace_members')
    .select('id')
    .eq('workspace_id', company.workspace_id)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle();

  if (!membership) {
    return NextResponse.json({ ok: false, error: 'Access denied' }, { status: 403 });
  }

  try {
    // Fetch obligations
    const { data: obligations, error: obligationsError } = await supabase
      .from('obligations')
      .select('id, title, status, priority, due_date, description')
      .eq('company_id', companyId);

    if (obligationsError) {
      throw new Error(`Failed to fetch obligations: ${obligationsError.message}`);
    }

    // Fetch evidence
    const { data: evidence, error: evidenceError } = await supabase
      .from('evidence')
      .select('id, obligation_id, status')
      .eq('company_id', companyId);

    if (evidenceError) {
      throw new Error(`Failed to fetch evidence: ${evidenceError.message}`);
    }

    if (!obligations || !evidence) {
      return NextResponse.json({
        ok: true,
        companyId,
        metrics: {
          totalObligations: 0,
          identifiedObligations: 0,
          inProgressObligations: 0,
          completedObligations: 0,
          notApplicableObligations: 0,
          compliancePercentage: 0,
          urgentObligations: 0,
          overallStatus: 'unknown',
        },
        gaps: [],
        timeline: {
          projectedComplianceDate: null,
          weeksToCompliance: null,
          criticalDeadlines: [],
        },
        complianceScore: 0,
        obligationMetrics: [],
        recommendations: ['No obligations found. Create AI systems and run risk assessments to begin.'],
      });
    }

    // Calculate metrics
    const metrics = calculateComplianceMetrics(obligations);
    const gaps = identifyComplianceGaps(obligations, evidence);
    const timeline = estimateComplianceTimeline(obligations);
    const complianceScore = calculateComplianceScore(metrics, gaps, evidence);

    // Calculate per-obligation metrics
    const obligationMetrics = obligations.map(obl =>
      calculateObligationMetrics(obl, evidence)
    );

    // Generate recommendations
    const recommendations: string[] = [];

    if (metrics.compliancePercentage === 0) {
      recommendations.push('No compliance progress. Start with identified obligations.');
    }

    if (metrics.urgentObligations > 0) {
      recommendations.push(
        `${metrics.urgentObligations} critical/high priority obligations need attention.`
      );
    }

    if (gaps.length > 0) {
      const criticalGaps = gaps.filter(g => g.priority === 'critical');
      if (criticalGaps.length > 0) {
        recommendations.push(
          `Address ${criticalGaps.length} critical gaps immediately for regulatory compliance.`
        );
      }
    }

    if (timeline.weeksToCompliance && timeline.weeksToCompliance < 4) {
      recommendations.push('Compliance deadline is approaching. Accelerate evidence submission.');
    }

    if (obligationMetrics.some(m => m.daysOverdue && m.daysOverdue > 0)) {
      recommendations.push('Some obligations are overdue. Prioritize these immediately.');
    }

    if (complianceScore < 50) {
      recommendations.push(
        'Compliance score is low. Develop a remediation plan to close critical gaps.'
      );
    }

    if (recommendations.length === 0) {
      recommendations.push('Compliance tracking is on schedule. Continue submitting evidence.');
    }

    return NextResponse.json({
      ok: true,
      companyId,
      timestamp: new Date().toISOString(),
      metrics,
      gaps,
      timeline,
      complianceScore,
      obligationMetrics,
      recommendations,
      summary: {
        totalObligation: obligations.length,
        totalGaps: gaps.length,
        criticalGaps: gaps.filter(g => g.priority === 'critical').length,
        overallStatus: metrics.overallStatus,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[api/gap-analysis] analysis failed:', message);

    return NextResponse.json(
      {
        ok: false,
        error: 'Gap analysis failed',
        message,
      },
      { status: 500 }
    );
  }
}
