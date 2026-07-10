import { NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase-server';
import { classify, QUESTION_IDS } from '@/lib/risk-assessment';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface CreateAssessmentBody {
  aiSystemId: string;
  answers: Record<string, boolean>;
}

async function resolveContext(
  supabase: Awaited<ReturnType<typeof createRouteClient>>
) {
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
  return {
    status: 200 as const,
    workspaceId: membership.workspace_id as string,
  };
}

/** GET /api/risk-assessments — latest assessment per system in the workspace. */
export async function GET() {
  const supabase = await createRouteClient();
  const ctx = await resolveContext(supabase);
  if (ctx.status !== 200) {
    return NextResponse.json(
      { ok: false, error: ctx.error },
      { status: ctx.status }
    );
  }

  const { data, error } = await supabase
    .from('risk_assessments')
    .select('id, ai_system_id, risk_level, risk_score, assessment_data, status, created_at')
    .eq('workspace_id', ctx.workspaceId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[api/risk-assessments] list failed:', error);
    return NextResponse.json(
      { ok: false, error: 'Could not load assessments' },
      { status: 500 }
    );
  }
  return NextResponse.json({ ok: true, assessments: data ?? [] });
}

/**
 * POST /api/risk-assessments — classify an AI system from screening answers
 * and persist the result. Classification happens server-side so the stored
 * risk level always matches the stored answers.
 */
export async function POST(req: Request) {
  let body: CreateAssessmentBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  if (!body.aiSystemId || typeof body.aiSystemId !== 'string') {
    return NextResponse.json(
      { ok: false, error: 'aiSystemId is required' },
      { status: 400 }
    );
  }
  if (!body.answers || typeof body.answers !== 'object') {
    return NextResponse.json(
      { ok: false, error: 'answers object is required' },
      { status: 400 }
    );
  }
  const unknown = Object.keys(body.answers).filter(
    (k) => !QUESTION_IDS.includes(k)
  );
  if (unknown.length > 0) {
    return NextResponse.json(
      { ok: false, error: `Unknown question ids: ${unknown.join(', ')}` },
      { status: 400 }
    );
  }

  const supabase = await createRouteClient();
  const ctx = await resolveContext(supabase);
  if (ctx.status !== 200) {
    return NextResponse.json(
      { ok: false, error: ctx.error },
      { status: ctx.status }
    );
  }

  // The system must belong to the caller's workspace (RLS enforces this on
  // read; checking explicitly gives an honest 404 instead of a silent miss).
  const { data: system } = await supabase
    .from('ai_systems')
    .select('id, company_id, name')
    .eq('id', body.aiSystemId)
    .eq('workspace_id', ctx.workspaceId)
    .maybeSingle();

  if (!system) {
    return NextResponse.json(
      { ok: false, error: 'AI system not found in your workspace' },
      { status: 404 }
    );
  }

  const result = classify(body.answers);

  const { data: saved, error } = await supabase
    .from('risk_assessments')
    .insert({
      ai_system_id: system.id,
      company_id: system.company_id,
      workspace_id: ctx.workspaceId,
      risk_level: result.riskLevel,
      risk_score: result.riskScore,
      assessment_data: {
        answers: body.answers,
        matched: result.matched,
        obligations: result.obligations,
        rationale: result.rationale,
        method: 'eu-ai-act-screening-v1',
      },
      status: 'draft',
    })
    .select('id, risk_level, risk_score, status, created_at')
    .single();

  if (error || !saved) {
    console.error('[api/risk-assessments] insert failed:', error);
    return NextResponse.json(
      { ok: false, error: 'Could not save the assessment' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    assessment: saved,
    classification: result,
  });
}
