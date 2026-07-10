import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase-server';
import { classifyRisk, getAssessmentQuestions } from '@/lib/risk-assessment';

export const dynamic = 'force-dynamic';

interface CreateAssessmentRequest {
  aiSystemId: string;
  answers: Record<string, any>;
  status?: 'draft' | 'in_review' | 'finalized';
}

interface UpdateAssessmentRequest {
  status?: 'draft' | 'in_review' | 'finalized';
  answers?: Record<string, any>;
}

async function resolveContext(supabase: ReturnType<typeof createRouteClient>) {
  const { data: { user } } = await supabase.auth.getUser();
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

  const supabase = createRouteClient();
  const ctx = await resolveContext(supabase);
  if (ctx.status !== 200) {
    return NextResponse.json(
      { ok: false, error: ctx.error },
      { status: ctx.status }
    );
  }

  let query = supabase.from('risk_assessments').select('*');

  if (systemId) {
    query = query.eq('ai_system_id', systemId);
  }
  if (assessmentId) {
    query = query.eq('id', assessmentId);
  }

  // Ensure user has access to the assessment's workspace
  query = query.eq('workspace_id', ctx.workspaceId);

  const { data, error } = await query.limit(1).maybeSingle();

  if (error) {
    console.error('[api/assessments] GET failed:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch assessment' },
      { status: 500 }
    );
  }

  if (!data) {
    return NextResponse.json(
      { ok: true, assessment: null },
      { status: 200 }
    );
  }

  return NextResponse.json({ ok: true, assessment: data });
}

/** POST /api/assessments — create or update assessment */
export async function POST(request: NextRequest) {
  let body: CreateAssessmentRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Invalid JSON' },
      { status: 400 }
    );
  }

  if (!body.aiSystemId) {
    return NextResponse.json(
      { ok: false, error: 'aiSystemId required' },
      { status: 400 }
    );
  }

  if (!body.answers || typeof body.answers !== 'object') {
    return NextResponse.json(
      { ok: false, error: 'answers object required' },
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

  // Verify system exists and user has access
  const { data: system, error: systemError } = await supabase
    .from('ai_systems')
    .select('id, company_id, workspace_id')
    .eq('id', body.aiSystemId)
    .eq('workspace_id', ctx.workspaceId)
    .limit(1)
    .maybeSingle();

  if (systemError || !system) {
    console.error('[api/assessments] system lookup failed:', systemError);
    return NextResponse.json(
      { ok: false, error: 'AI system not found' },
      { status: 404 }
    );
  }

  // Classify risk based on answers
  const answersMap = new Map(Object.entries(body.answers));
  const result = classifyRisk(answersMap);

  // Check if assessment already exists
  const { data: existing } = await supabase
    .from('risk_assessments')
    .select('id')
    .eq('ai_system_id', body.aiSystemId)
    .limit(1)
    .maybeSingle();

  let insertData = {
    ai_system_id: body.aiSystemId,
    company_id: system.company_id,
    workspace_id: ctx.workspaceId,
    risk_level: result.riskLevel,
    risk_score: result.riskScore,
    assessment_data: {
      answers: body.answers,
      classification: result,
      completedAt: new Date().toISOString(),
    },
    status: body.status || 'draft',
  };

  let response;

  if (existing) {
    // Update existing assessment
    const { data, error } = await supabase
      .from('risk_assessments')
      .update(insertData)
      .eq('id', existing.id)
      .select('*')
      .single();

    if (error) {
      console.error('[api/assessments] update failed:', error);
      return NextResponse.json(
        { ok: false, error: 'Failed to update assessment' },
        { status: 500 }
      );
    }

    response = data;
  } else {
    // Create new assessment
    const { data, error } = await supabase
      .from('risk_assessments')
      .insert(insertData)
      .select('*')
      .single();

    if (error) {
      console.error('[api/assessments] insert failed:', error);
      return NextResponse.json(
        { ok: false, error: 'Failed to create assessment' },
        { status: 500 }
      );
    }

    response = data;
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

/** PUT /api/assessments/:id — update assessment status */
export async function PUT(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const assessmentId = pathname.split('/').pop();

  if (!assessmentId) {
    return NextResponse.json(
      { ok: false, error: 'Assessment ID required' },
      { status: 400 }
    );
  }

  let body: UpdateAssessmentRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Invalid JSON' },
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

  // Re-classify if answers updated
  let updateData: any = {};
  if (body.answers) {
    const answersMap = new Map(Object.entries(body.answers));
    const result = classifyRisk(answersMap);
    updateData.assessment_data = {
      answers: body.answers,
      classification: result,
      completedAt: new Date().toISOString(),
    };
    updateData.risk_level = result.riskLevel;
    updateData.risk_score = result.riskScore;
  }
  if (body.status) {
    updateData.status = body.status;
  }

  const { data, error } = await supabase
    .from('risk_assessments')
    .update(updateData)
    .eq('id', assessmentId)
    .eq('workspace_id', ctx.workspaceId)
    .select('*')
    .single();

  if (error) {
    console.error('[api/assessments] PUT failed:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to update assessment' },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, assessment: data });
}
