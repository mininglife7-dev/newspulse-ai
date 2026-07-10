import { NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase-server';
import { calculateRiskScore, AssessmentResponse } from '@/lib/risk-assessment';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface CreateAssessmentBody {
  ai_system_id: string;
  responses?: AssessmentResponse[];
}

interface UpdateAssessmentBody {
  responses?: AssessmentResponse[];
  status?: 'draft' | 'in_review' | 'finalized';
}

/**
 * Resolve the caller's workspace and verify access to AI system.
 */
async function resolveContext(
  supabase: ReturnType<typeof createRouteClient>,
  ai_system_id?: string
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
      error: 'No workspace — complete company setup first',
    };
  }

  // If AI system specified, verify user has access
  if (ai_system_id) {
    const { data: system } = await supabase
      .from('ai_systems')
      .select('workspace_id, company_id')
      .eq('id', ai_system_id)
      .eq('workspace_id', membership.workspace_id)
      .maybeSingle();

    if (!system) {
      return {
        status: 404 as const,
        error: 'AI system not found',
      };
    }

    return {
      status: 200 as const,
      workspaceId: membership.workspace_id as string,
      aiSystemId: ai_system_id,
      companyId: system.company_id as string,
    };
  }

  return {
    status: 200 as const,
    workspaceId: membership.workspace_id as string,
  };
}

/** GET /api/risk-assessments?ai_system_id=X — get or list assessments */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const aiSystemId = searchParams.get('ai_system_id');

  const supabase = createRouteClient();
  const ctx = await resolveContext(supabase, aiSystemId ?? undefined);
  if (ctx.status !== 200) {
    return NextResponse.json(
      { ok: false, error: ctx.error },
      { status: ctx.status }
    );
  }

  if (aiSystemId) {
    // Get assessment for a specific AI system
    const { data, error } = await supabase
      .from('risk_assessments')
      .select('id, ai_system_id, risk_level, risk_score, status, assessment_data, created_at, updated_at')
      .eq('ai_system_id', aiSystemId)
      .eq('workspace_id', ctx.workspaceId)
      .maybeSingle();

    if (error) {
      console.error('[api/risk-assessments] get failed:', error);
      return NextResponse.json(
        { ok: false, error: 'Could not load assessment' },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, assessment: data ?? null });
  } else {
    // List all assessments in workspace
    const { data, error } = await supabase
      .from('risk_assessments')
      .select('id, ai_system_id, risk_level, risk_score, status, created_at')
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
}

/** POST /api/risk-assessments — create a new assessment */
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

  if (!body.ai_system_id?.trim()) {
    return NextResponse.json(
      { ok: false, error: 'ai_system_id is required' },
      { status: 400 }
    );
  }

  const supabase = createRouteClient();
  const ctx = await resolveContext(supabase, body.ai_system_id);
  if (ctx.status !== 200) {
    return NextResponse.json(
      { ok: false, error: ctx.error },
      { status: ctx.status }
    );
  }

  const { score, level } = calculateRiskScore(body.responses ?? []);

  const { data, error } = await supabase
    .from('risk_assessments')
    .insert({
      workspace_id: ctx.workspaceId,
      company_id: ctx.companyId,
      ai_system_id: body.ai_system_id,
      risk_score: score,
      risk_level: level,
      assessment_data: { responses: body.responses ?? [], version: 1 },
      status: 'draft',
    })
    .select('id, ai_system_id, risk_level, risk_score, status, created_at')
    .single();

  if (error || !data) {
    console.error('[api/risk-assessments] insert failed:', error);
    return NextResponse.json(
      { ok: false, error: 'Could not create assessment' },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, assessment: data });
}

/** PATCH /api/risk-assessments/:id — update assessment responses */
export async function PATCH(req: Request) {
  const url = new URL(req.url);
  const assessmentId = url.pathname.split('/').pop();

  if (!assessmentId) {
    return NextResponse.json(
      { ok: false, error: 'Assessment ID required' },
      { status: 400 }
    );
  }

  let body: UpdateAssessmentBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Invalid JSON body' },
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

  // Verify user has access to this assessment
  const { data: existing } = await supabase
    .from('risk_assessments')
    .select('assessment_data')
    .eq('id', assessmentId)
    .eq('workspace_id', ctx.workspaceId)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json(
      { ok: false, error: 'Assessment not found' },
      { status: 404 }
    );
  }

  const responses = body.responses ?? (existing.assessment_data?.responses ?? []);
  const { score, level } = calculateRiskScore(responses);

  const { data, error } = await supabase
    .from('risk_assessments')
    .update({
      assessment_data: { responses, version: 1 },
      risk_score: score,
      risk_level: level,
      status: body.status ?? 'draft',
      updated_at: new Date().toISOString(),
    })
    .eq('id', assessmentId)
    .select('id, ai_system_id, risk_level, risk_score, status, updated_at')
    .single();

  if (error || !data) {
    console.error('[api/risk-assessments] update failed:', error);
    return NextResponse.json(
      { ok: false, error: 'Could not update assessment' },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, assessment: data });
}
