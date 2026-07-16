import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase-server';
import { logger } from '@/lib/structured-logger';

export interface AssessmentBody {
  ai_system_id: string;
  risk_level: 'unacceptable' | 'high' | 'medium' | 'low';
  risk_score?: number;
  assessment_data?: Record<string, unknown>;
  status?: 'draft' | 'in_review' | 'finalized';
}

function resolveContext(supabase: any) {
  return new Promise<{ workspace_id?: string; error?: { status: number; message: string } }>(async (resolve) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      resolve({ error: { status: 401, message: 'Authentication required' } });
      return;
    }

    const { data: membership } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle();

    if (!membership) {
      resolve({ error: { status: 409, message: 'No workspace yet — complete company setup first' } });
      return;
    }

    resolve({ workspace_id: membership.workspace_id });
  });
}

export async function GET(req: NextRequest) {
  const startTime = Date.now();
  const supabase = await createRouteClient();
  const context = await resolveContext(supabase);

  if (context.error) {
    logger.warn(
      'Assessment list request failed auth check',
      'ASSESSMENT_LIST_AUTH_FAILED',
      { error_message: context.error.message },
      Date.now() - startTime
    );
    return NextResponse.json(
      { ok: false, error: context.error.message },
      { status: context.error.status }
    );
  }

  try {
    const queryStart = Date.now();
    const { data: assessments, error } = await supabase
      .from('risk_assessments')
      .select('*')
      .eq('workspace_id', context.workspace_id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const queryDuration = Date.now() - queryStart;
    const totalDuration = Date.now() - startTime;

    logger.info(
      `Fetched ${assessments?.length || 0} assessments`,
      'ASSESSMENT_LIST_RETRIEVED',
      {
        workspace_id: context.workspace_id,
        count: assessments?.length || 0,
        query_ms: queryDuration,
      },
      totalDuration
    );

    return NextResponse.json({
      ok: true,
      assessments: assessments || [],
    });
  } catch (error) {
    logger.error(
      'Failed to fetch assessments',
      'ASSESSMENT_LIST_ERROR',
      error,
      {
        workspace_id: context.workspace_id,
      }
    );
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch assessments' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  let body: AssessmentBody;
  try {
    body = await req.json();
  } catch {
    logger.warn(
      'Assessment creation request with invalid JSON',
      'ASSESSMENT_CREATE_INVALID_JSON',
      {},
      Date.now() - startTime
    );
    return NextResponse.json(
      { ok: false, error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  const supabase = await createRouteClient();
  const context = await resolveContext(supabase);

  if (context.error) {
    logger.warn(
      'Assessment creation request failed auth check',
      'ASSESSMENT_CREATE_AUTH_FAILED',
      { error_message: context.error.message },
      Date.now() - startTime
    );
    return NextResponse.json(
      { ok: false, error: context.error.message },
      { status: context.error.status }
    );
  }

  if (!body.ai_system_id) {
    logger.warn(
      'Assessment creation missing ai_system_id',
      'ASSESSMENT_CREATE_MISSING_FIELD',
      { missing_field: 'ai_system_id' },
      Date.now() - startTime
    );
    return NextResponse.json(
      { ok: false, error: 'ai_system_id is required' },
      { status: 400 }
    );
  }

  if (!body.risk_level || !['unacceptable', 'high', 'medium', 'low'].includes(body.risk_level)) {
    logger.warn(
      'Assessment creation with invalid risk_level',
      'ASSESSMENT_CREATE_INVALID_RISK',
      { risk_level: body.risk_level },
      Date.now() - startTime
    );
    return NextResponse.json(
      { ok: false, error: 'risk_level must be one of: unacceptable, high, medium, low' },
      { status: 400 }
    );
  }

  try {
    const queryStart = Date.now();
    // Verify the AI system belongs to this workspace
    const { data: system, error: sysError } = await supabase
      .from('ai_systems')
      .select('id, company_id')
      .eq('id', body.ai_system_id)
      .eq('workspace_id', context.workspace_id)
      .single();

    if (sysError || !system) {
      logger.warn(
        'Assessment creation - AI system not found',
        'ASSESSMENT_CREATE_SYSTEM_NOT_FOUND',
        { ai_system_id: body.ai_system_id, workspace_id: context.workspace_id },
        Date.now() - startTime
      );
      return NextResponse.json(
        { ok: false, error: 'AI system not found in this workspace' },
        { status: 404 }
      );
    }

    const { data: assessment, error: insertError } = await supabase
      .from('risk_assessments')
      .insert({
        ai_system_id: body.ai_system_id,
        company_id: system.company_id,
        workspace_id: context.workspace_id,
        risk_level: body.risk_level,
        risk_score: body.risk_score ?? null,
        assessment_data: body.assessment_data ?? {},
        status: body.status ?? 'draft',
      })
      .select('*')
      .single();

    if (insertError) throw insertError;

    const totalDuration = Date.now() - startTime;
    logger.info(
      'Assessment created successfully',
      'ASSESSMENT_CREATED',
      {
        assessment_id: assessment.id,
        ai_system_id: body.ai_system_id,
        workspace_id: context.workspace_id,
        risk_level: body.risk_level,
      },
      totalDuration
    );

    return NextResponse.json({
      ok: true,
      assessment,
    });
  } catch (error) {
    logger.error(
      'Failed to create assessment',
      'ASSESSMENT_CREATE_ERROR',
      error,
      {
        ai_system_id: body.ai_system_id,
        workspace_id: context.workspace_id,
      }
    );
    return NextResponse.json(
      { ok: false, error: 'Failed to create assessment' },
      { status: 500 }
    );
  }
}
