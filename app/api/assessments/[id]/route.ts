import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase-server';
import { logger } from '@/lib/logger';
import { classifyRisk } from '@/lib/risk-assessment';
import { validators, validate } from '@/lib/input-validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface UpdateAssessmentRequest {
  status?: 'draft' | 'in_review' | 'finalized';
  answers?: Record<string, unknown>;
}

interface RouteContext {
  status: number;
  workspaceId?: string;
  error?: string;
}

async function resolveContext(
  supabase: Awaited<ReturnType<typeof createRouteClient>>
): Promise<RouteContext> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { status: 401, error: 'Authentication required' };
  }

  const { data: membership, error: memberError } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle();

  if (memberError) {
    logger.error(
      'Workspace membership lookup failed',
      'MEMBERSHIP_LOOKUP_ERROR',
      memberError
    );
    return { status: 500, error: 'Membership lookup failed' };
  }

  if (!membership) {
    return { status: 403, error: 'Not a workspace member' };
  }

  return {
    status: 200,
    workspaceId: membership.workspace_id as string,
  };
}

/**
 * PUT /api/assessments/:id — update an assessment's status and/or answers.
 *
 * The UI (assessment finalize / re-save) calls this dynamic path. Supports
 * partial updates: either new answers (triggering risk reclassification) or
 * status change (draft → in_review → finalized).
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Invalid JSON' },
      { status: 400 }
    );
  }

  const validationResult = validate(body, {
    status: validators.optional(
      validators.enum(['draft', 'in_review', 'finalized'])
    ),
    answers: validators.optional(
      validators.object({}, { allowExtraFields: true })
    ),
  });

  if (!validationResult.ok) {
    return NextResponse.json(
      { ok: false, error: 'Invalid input', errors: validationResult.errors },
      { status: 400 }
    );
  }

  const validated = validationResult.value as UpdateAssessmentRequest;

  const supabase = await createRouteClient();
  const ctx = await resolveContext(supabase);
  if (ctx.status !== 200) {
    return NextResponse.json(
      { ok: false, error: ctx.error },
      { status: ctx.status }
    );
  }

  const updateData: Record<string, unknown> = {};

  if (validated.answers) {
    const result = classifyRisk(new Map(Object.entries(validated.answers)));
    updateData.assessment_data = {
      answers: validated.answers,
      classification: result,
      completedAt: new Date().toISOString(),
    };
    updateData.risk_level = result.riskLevel;
    updateData.risk_score = result.riskScore;
  }

  if (validated.status) {
    updateData.status = validated.status;
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
    logger.error('Assessment update failed', 'ASSESSMENT_UPDATE_ERROR', error);
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
