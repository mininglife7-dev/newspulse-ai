import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase-server';
import { logger } from '@/lib/logger';
import { classifyRisk } from '@/lib/risk-assessment';
import { validators, validate } from '@/lib/input-validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface AssessmentAnswer {
  [questionId: string]: string | number | boolean;
}

interface CreateAssessmentRequest {
  aiSystemId: string;
  answers: AssessmentAnswer;
  status?: 'draft' | 'in_review' | 'finalized';
}

interface RouteContext {
  status: number;
  workspaceId?: string;
  userId?: string;
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
    logger.error('Workspace membership lookup failed', 'WORKSPACE_LOOKUP_ERROR', memberError);
    return { status: 500, error: 'Workspace lookup failed' };
  }

  if (!membership) {
    return { status: 403, error: 'Not a workspace member' };
  }

  return {
    status: 200,
    workspaceId: membership.workspace_id as string,
    userId: user.id,
  };
}

/** GET /api/assessments — fetch assessment for a system */
export async function GET(request: NextRequest) {
  const systemId = request.nextUrl.searchParams.get('systemId');
  const assessmentId = request.nextUrl.searchParams.get('assessmentId');

  if (!systemId && !assessmentId) {
    return NextResponse.json(
      { ok: false, error: 'systemId or assessmentId required' },
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

  let query = supabase
    .from('risk_assessments')
    .select('*')
    .eq('workspace_id', ctx.workspaceId!);

  if (systemId) {
    query = query.eq('ai_system_id', systemId);
  }
  if (assessmentId) {
    query = query.eq('id', assessmentId);
  }

  const { data, error } = await query.limit(1).maybeSingle();

  if (error) {
    logger.error('Assessment fetch failed', 'ASSESSMENT_FETCH_ERROR', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch assessment' },
      { status: 500 }
    );
  }

  if (!data) {
    return NextResponse.json({ ok: true, assessment: null }, { status: 200 });
  }

  return NextResponse.json({ ok: true, assessment: data });
}

/** POST /api/assessments — create or update assessment */
export async function POST(request: NextRequest) {
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
    aiSystemId: validators.string({ minLength: 1 }),
    answers: validators.object(),
    status: validators.optional(validators.enum(['draft', 'in_review', 'finalized'])),
  });

  if (!validationResult.ok) {
    return NextResponse.json(
      { ok: false, error: 'Invalid input', errors: validationResult.errors },
      { status: 400 }
    );
  }

  const validated = validationResult.value as CreateAssessmentRequest;

  const supabase = await createRouteClient();
  const ctx = await resolveContext(supabase);
  if (ctx.status !== 200) {
    return NextResponse.json(
      { ok: false, error: ctx.error },
      { status: ctx.status }
    );
  }

  // Verify system exists and user has access
  const { data: system, error: systemError } = await supabase
    .from('ai_systems')
    .select('id, company_id, workspace_id')
    .eq('id', validated.aiSystemId)
    .eq('workspace_id', ctx.workspaceId)
    .limit(1)
    .maybeSingle();

  if (systemError) {
    logger.error('AI system lookup failed', 'SYSTEM_LOOKUP_ERROR', systemError);
    return NextResponse.json(
      { ok: false, error: 'Failed to verify AI system' },
      { status: 500 }
    );
  }

  if (!system) {
    return NextResponse.json(
      { ok: false, error: 'AI system not found' },
      { status: 404 }
    );
  }

  // Classify risk based on answers
  const answersMap = new Map(Object.entries(validated.answers));
  const result = classifyRisk(answersMap);

  // Check if assessment already exists
  const { data: existing, error: existingError } = await supabase
    .from('risk_assessments')
    .select('id')
    .eq('ai_system_id', validated.aiSystemId)
    .limit(1)
    .maybeSingle();

  if (existingError) {
    logger.error('Assessment existence check failed', 'ASSESSMENT_QUERY_ERROR', existingError);
    return NextResponse.json(
      { ok: false, error: 'Failed to check assessment status' },
      { status: 500 }
    );
  }

  const insertData = {
    ai_system_id: validated.aiSystemId,
    company_id: system.company_id,
    workspace_id: ctx.workspaceId,
    risk_level: result.riskLevel,
    risk_score: result.riskScore,
    assessment_data: {
      answers: validated.answers,
      classification: result,
      completedAt: new Date().toISOString(),
    },
    status: validated.status || 'draft',
  };

  let response: unknown;

  if (existing) {
    const { data, error } = await supabase
      .from('risk_assessments')
      .update(insertData)
      .eq('id', existing.id)
      .select('*')
      .single();

    if (error) {
      logger.error('Assessment update failed', 'ASSESSMENT_UPDATE_ERROR', error);
      return NextResponse.json(
        { ok: false, error: 'Failed to update assessment' },
        { status: 500 }
      );
    }

    response = data;
  } else {
    const { data, error } = await supabase
      .from('risk_assessments')
      .insert(insertData)
      .select('*')
      .single();

    if (error) {
      logger.error('Assessment creation failed', 'ASSESSMENT_INSERT_ERROR', error);
      return NextResponse.json(
        { ok: false, error: 'Failed to create assessment' },
        { status: 500 }
      );
    }

    response = data;
  }

  // Auto-generate obligations based on risk level and recommendations
  const assessmentId = (response as Record<string, unknown>)?.id as string | undefined;
  if (assessmentId) {
    try {
      const priorityMap: Record<string, string> = {
        unacceptable: 'critical',
        high: 'high',
        medium: 'medium',
        low: 'low',
      };
      const priority = priorityMap[result.riskLevel] || 'medium';

      const obligationTexts: string[] = [];
      if (result.recommendations && Array.isArray(result.recommendations)) {
        obligationTexts.push(...(result.recommendations as string[]));
      }

      for (const obligationText of obligationTexts) {
        const { data: existing, error: existingError } = await supabase
          .from('obligations')
          .select('id')
          .eq('company_id', system.company_id)
          .eq('workspace_id', ctx.workspaceId)
          .ilike('title', obligationText.substring(0, 100))
          .limit(1)
          .maybeSingle();

        if (existingError) {
          logger.error('Obligation lookup failed', 'OBLIGATION_LOOKUP_ERROR', existingError);
          continue;
        }

        let obligationId: string;

        if (existing) {
          obligationId = existing.id;
        } else {
          const { data: created, error: createError } = await supabase
            .from('obligations')
            .insert({
              company_id: system.company_id,
              workspace_id: ctx.workspaceId,
              title: obligationText.substring(0, 200),
              description: obligationText,
              source: 'EU_AI_ACT',
              status: 'identified',
              priority,
            })
            .select('id')
            .single();

          if (createError || !created) {
            logger.error('Obligation creation failed', 'OBLIGATION_CREATE_ERROR', createError);
            continue;
          }
          obligationId = created.id;
        }

        const { error: linkError } = await supabase
          .from('assessment_obligations')
          .insert({
            assessment_id: assessmentId,
            obligation_id: obligationId,
          });

        if (linkError) {
          logger.error('Obligation linking failed', 'OBLIGATION_LINK_ERROR', linkError);
        }
      }
    } catch (err) {
      logger.error('Obligation auto-generation failed', 'OBLIGATION_GEN_ERROR', err);
    }
  }

  return NextResponse.json(
    {
      ok: true,
      assessment: response,
      classification: result,
    },
    { status: 200 }
  );
}
