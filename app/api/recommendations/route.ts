import { NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase-server';
import { generateRecommendations, getRecommendationsByCategory } from '@/lib/compliance-recommendations';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface AssessmentResponse {
  question_id: string;
  answer: string | number | boolean;
}

interface AssessmentData {
  responses: AssessmentResponse[];
}

interface RiskAssessment {
  id: string;
  risk_score: number;
  assessment_data: AssessmentData;
}

interface WorkspaceMembership {
  workspace_id: string;
}

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
      error: 'No workspace — complete company setup first',
    };
  }

  return {
    status: 200 as const,
    workspaceId: (membership as WorkspaceMembership).workspace_id,
  };
}

/**
 * GET /api/recommendations?ai_system_id=X
 * Generate compliance recommendations based on assessment
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const aiSystemId = searchParams.get('ai_system_id');

  if (!aiSystemId?.trim()) {
    return NextResponse.json(
      { ok: false, error: 'ai_system_id is required' },
      { status: 400 }
    );
  }

  const supabase = createRouteClient();
  const ctx = await resolveContext(supabase);
  if (ctx.status !== 200) {
    return NextResponse.json(
      { ok: false, error: ctx.error },
      { status: ctx.status }
    );
  }

  try {
    // Verify user has access to this AI system
    const { data: aiSystem } = await supabase
      .from('ai_systems')
      .select('id, workspace_id')
      .eq('id', aiSystemId)
      .eq('workspace_id', ctx.workspaceId)
      .maybeSingle();

    if (!aiSystem) {
      return NextResponse.json(
        { ok: false, error: 'AI system not found' },
        { status: 404 }
      );
    }

    // Fetch assessment for the system
    const { data: assessment } = await supabase
      .from('risk_assessments')
      .select('id, risk_score, assessment_data')
      .eq('ai_system_id', aiSystemId)
      .eq('status', 'finalized')
      .maybeSingle();

    if (!assessment) {
      return NextResponse.json(
        { ok: false, error: 'No finalized assessment found for this system' },
        { status: 404 }
      );
    }

    // Generate recommendations
    const typedAssessment = assessment as RiskAssessment;
    const assessmentData = typedAssessment.assessment_data || { responses: [] };
    const responses = (assessmentData.responses || []).map((r) => ({
      question_id: r.question_id,
      answer: r.answer,
    }));

    const result = generateRecommendations(typedAssessment.risk_score, responses);
    const byCategory = getRecommendationsByCategory(result.recommendations);

    return NextResponse.json({
      ok: true,
      recommendations: result.recommendations,
      byCategory,
      summary: result.summary,
      timeline: result.timeline,
      riskScore: typedAssessment.risk_score,
    });
  } catch (err: any) {
    console.error('[api/recommendations] GET failed:', err);
    return NextResponse.json(
      { ok: false, error: 'Failed to generate recommendations' },
      { status: 500 }
    );
  }
}
