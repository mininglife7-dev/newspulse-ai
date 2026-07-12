import { NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase-server';
import {
  classifyRiskLevel,
  getRiskAssessmentQuestionnaire,
  type RiskAssessmentAnswers,
} from '@/lib/risk-classifier';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/risk-assessment/questionnaire
 * Returns the risk classification questionnaire
 */
export async function GET(req: Request) {
  const url = new URL(req.url);

  // Check if requesting questionnaire
  if (url.searchParams.get('action') === 'questionnaire') {
    const questionnaire = getRiskAssessmentQuestionnaire();
    return NextResponse.json({ ok: true, questionnaire });
  }

  // Otherwise, list assessments for the user's workspace
  const supabase = await createRouteClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: 'Authentication required' }, { status: 401 });
  }

  // Get user's workspace
  const { data: membership } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle();

  if (!membership) {
    return NextResponse.json(
      { ok: false, error: 'No workspace found' },
      { status: 409 }
    );
  }

  // List risk assessments
  const { data: assessments, error } = await supabase
    .from('risk_assessments')
    .select(
      `id, ai_system_id, risk_level, risk_score, status, created_at, updated_at,
       ai_systems(id, name, vendor, purpose)`
    )
    .eq('workspace_id', membership.workspace_id)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('[api/risk-assessment] list failed:', error);
    return NextResponse.json(
      { ok: false, error: 'Could not load assessments' },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, assessments: assessments ?? [] });
}

/**
 * POST /api/risk-assessment
 * Create or update a risk assessment for an AI system
 *
 * Request body:
 * {
 *   "aiSystemId": "uuid",
 *   "answers": { ...RiskAssessmentAnswers }
 * }
 */
export async function POST(req: Request) {
  let body: { aiSystemId: string; answers: RiskAssessmentAnswers };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  // Validate input
  if (!body.aiSystemId) {
    return NextResponse.json({ ok: false, error: 'aiSystemId is required' }, { status: 400 });
  }

  if (!body.answers) {
    return NextResponse.json({ ok: false, error: 'answers object is required' }, { status: 400 });
  }

  // Validate answers structure
  const answers = body.answers;
  if (!answers.useCaseCategory) {
    return NextResponse.json(
      { ok: false, error: 'useCaseCategory is required' },
      { status: 400 }
    );
  }

  // Authenticate
  const supabase = await createRouteClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: 'Authentication required' }, { status: 401 });
  }

  // Verify user has access to this AI system
  const { data: system, error: systemError } = await supabase
    .from('ai_systems')
    .select('id, company_id, workspace_id')
    .eq('id', body.aiSystemId)
    .maybeSingle();

  if (systemError || !system) {
    return NextResponse.json(
      { ok: false, error: 'AI system not found' },
      { status: 404 }
    );
  }

  // Verify user is member of workspace
  const { data: membership } = await supabase
    .from('workspace_members')
    .select('id')
    .eq('workspace_id', system.workspace_id)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle();

  if (!membership) {
    return NextResponse.json(
      { ok: false, error: 'Access denied' },
      { status: 403 }
    );
  }

  // Classify the risk
  const result = classifyRiskLevel(answers);

  // Save assessment to database
  const { data: assessment, error: insertError } = await supabase
    .from('risk_assessments')
    .upsert(
      {
        ai_system_id: body.aiSystemId,
        company_id: system.company_id,
        workspace_id: system.workspace_id,
        risk_level: result.riskLevel,
        risk_score: result.riskScore,
        status: 'finalized',
        assessment_data: {
          answers,
          result: {
            rationale: result.rationale,
            obligations: result.obligations,
            controlsRequired: result.controlsRequired,
            reviewSchedule: result.reviewSchedule,
            applicableArticles: result.applicableArticles,
          },
          classifiedAt: new Date().toISOString(),
        },
      },
      { onConflict: 'ai_system_id' }
    )
    .select();

  if (insertError || !assessment || assessment.length === 0) {
    console.error('[api/risk-assessment] insert failed:', insertError);
    return NextResponse.json(
      { ok: false, error: 'Could not save assessment' },
      { status: 500 }
    );
  }

  // Create obligations from the classification result
  if (result.obligations.length > 0) {
    const obligationRecords = result.obligations.map((title) => ({
      company_id: system.company_id,
      workspace_id: system.workspace_id,
      title,
      description: `Obligation required for ${result.riskLevel}-risk AI system`,
      source: 'EU_AI_ACT',
      priority: result.riskLevel === 'prohibited' ? 'critical' : result.riskLevel === 'high' ? 'high' : 'medium',
      status: 'identified',
    }));

    // Insert obligations (avoid duplicates by title + company)
    await supabase.from('obligations').upsert(obligationRecords, {
      onConflict: 'company_id,title',
    });
  }

  return NextResponse.json({
    ok: true,
    assessment: assessment[0],
    classification: result,
  });
}
