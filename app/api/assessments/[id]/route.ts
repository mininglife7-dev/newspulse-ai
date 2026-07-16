import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase-server';
import { classifyRisk } from '@/lib/risk-assessment';

export const dynamic = 'force-dynamic';

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
    return { status: 401 as const, error: 'Not a workspace member' };
  }

  return {
    status: 200 as const,
    workspaceId: membership.workspace_id as string,
  };
}

/**
 * PUT /api/assessments/:id — update an assessment's status and/or answers.
 *
 * The UI (assessment finalize / re-save) calls this dynamic path. The handler
 * previously lived on the collection route and read the id from
 * `pathname.split('/').pop()` — which on /api/assessments is the literal
 * "assessments" — so it never routed here and every update 404'd. This route
 * lives at the correct segment and reads the id from async params (Next 15+).
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json(
      { ok: false, error: 'Assessment ID required' },
      { status: 400 }
    );
  }

  let body: { status?: string; answers?: Record<string, unknown> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Invalid JSON' },
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

  const updateData: Record<string, unknown> = {};
  if (body.answers) {
    const result = classifyRisk(new Map(Object.entries(body.answers)));
    updateData.assessment_data = {
      answers: body.answers,
      classification: result,
      completedAt: new Date().toISOString(),
    };
    updateData.risk_level = result.riskLevel;
    updateData.risk_score = result.riskScore;
  }
  if (body.status) {
    if (!['draft', 'in_review', 'finalized'].includes(body.status)) {
      return NextResponse.json(
        { ok: false, error: 'status must be draft, in_review, or finalized' },
        { status: 400 }
      );
    }
    updateData.status = body.status;
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json(
      { ok: false, error: 'No fields to update' },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from('risk_assessments')
    .update(updateData)
    .eq('id', id)
    .eq('workspace_id', ctx.workspaceId)
    .select('*')
    .maybeSingle();

  if (error) {
    console.error('[api/assessments/:id] PUT failed:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to update assessment' },
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
}
