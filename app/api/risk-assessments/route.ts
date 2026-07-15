import { NextResponse, NextRequest } from 'next/server';
import { createRouteClient } from '@/lib/supabase-server';
import { resolveContext, contextError } from '@/lib/api-context';
import { calculateRiskScore, AssessmentResponse } from '@/lib/risk-assessment';
import { apiLimiter } from '@/lib/rate-limit';

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

/** GET /api/risk-assessments?ai_system_id=X or ?assessment_id=Y — get or list assessments */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const aiSystemId = searchParams.get('ai_system_id');
  const assessmentId = searchParams.get('assessment_id');

  const supabase = createRouteClient();
  const ctx = await resolveContext(supabase);
  if (ctx.status !== 200) {
    return contextError(ctx);
  }

  if (assessmentId) {
    // Get a specific assessment by ID (for remediation page, etc.)
    const { data, error } = await supabase
      .from('risk_assessments')
      .select('id, ai_system_id, risk_level, risk_score, status, assessment_data, created_at, updated_at')
      .eq('id', assessmentId)
      .eq('workspace_id', ctx.workspaceId)
      .maybeSingle();

    if (error) {
      console.error('[api/risk-assessments] get by id failed:', error);
      return NextResponse.json(
        { ok: false, error: 'Could not load assessment' },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { ok: false, error: 'Assessment not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, assessment: data });
  } else if (aiSystemId) {
    // Verify AI system exists in this workspace
    const { data: system } = await supabase
      .from('ai_systems')
      .select('id')
      .eq('id', aiSystemId)
      .eq('workspace_id', ctx.workspaceId)
      .maybeSingle();

    if (!system) {
      return NextResponse.json(
        { ok: false, error: 'AI system not found' },
        { status: 404 }
      );
    }

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
  // Rate limit API operations (60 per minute per IP)
  const rateLimitResponse = await apiLimiter(req as NextRequest);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

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
  const ctx = await resolveContext(supabase);
  if (ctx.status !== 200) {
    return contextError(ctx);
  }

  // Verify access to AI system and get company_id
  const { data: system, error: systemError } = await supabase
    .from('ai_systems')
    .select('workspace_id, company_id')
    .eq('id', body.ai_system_id)
    .eq('workspace_id', ctx.workspaceId)
    .maybeSingle();

  if (systemError || !system) {
    return NextResponse.json(
      { ok: false, error: 'AI system not found' },
      { status: 404 }
    );
  }

  if (!system.company_id) {
    return NextResponse.json(
      { ok: false, error: 'System has no associated company' },
      { status: 400 }
    );
  }

  const { score, level } = calculateRiskScore(body.responses ?? []);

  const { data, error } = await supabase
    .from('risk_assessments')
    .insert({
      workspace_id: ctx.workspaceId,
      company_id: system.company_id,
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
  // Rate limit API operations (60 per minute per IP)
  const rateLimitResponse = await apiLimiter(req as NextRequest);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

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
    return contextError(ctx);
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
