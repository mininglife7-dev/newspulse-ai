import { NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase-server';
import { RISK_LEVELS, ASSESSMENT_STATUSES, calculateRiskLevel } from '@/lib/risk-assessments';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface CreateRiskAssessmentBody {
  aiSystemId: string;
  answers: Record<string, boolean>;
  status?: 'draft' | 'in_review' | 'finalized';
}

/**
 * Resolve the caller's active workspace (and company) or explain why not.
 * All queries run as the signed-in user, so RLS applies.
 */
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
      error: 'No workspace yet — complete company setup first',
    };
  }

  const { data: company } = await supabase
    .from('companies')
    .select('id')
    .eq('workspace_id', membership.workspace_id)
    .limit(1)
    .maybeSingle();

  return {
    status: 200 as const,
    workspaceId: membership.workspace_id as string,
    companyId: (company?.id as string) ?? null,
  };
}

/** GET /api/risk-assessments — list assessments for the caller's workspace. */
export async function GET(req: Request) {
  const supabase = createRouteClient();
  const ctx = await resolveContext(supabase);
  if (ctx.status !== 200) {
    return NextResponse.json(
      { ok: false, error: ctx.error },
      { status: ctx.status }
    );
  }

  const { data, error } = await supabase
    .from('risk_assessments')
    .select(`
      id,
      ai_system_id,
      risk_level,
      risk_score,
      status,
      created_at,
      ai_systems(id, name, system_type)
    `)
    .eq('workspace_id', ctx.workspaceId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[api/risk-assessments] list failed:', error);
    return NextResponse.json(
      { ok: false, error: 'Could not load risk assessments' },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, assessments: data ?? [] });
}

/** POST /api/risk-assessments — create a new risk assessment. */
export async function POST(req: Request) {
  let body: CreateRiskAssessmentBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  const aiSystemId = body.aiSystemId?.trim();
  if (!aiSystemId) {
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

  const status = body.status ?? 'draft';
  if (!ASSESSMENT_STATUSES.includes(status as any)) {
    return NextResponse.json(
      { ok: false, error: 'status must be draft, in_review, or finalized' },
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

  if (!ctx.companyId) {
    return NextResponse.json(
      { ok: false, error: 'No company profile — complete company setup first' },
      { status: 409 }
    );
  }

  // Verify the AI system exists and belongs to this workspace
  const { data: aiSystem } = await supabase
    .from('ai_systems')
    .select('id, workspace_id')
    .eq('id', aiSystemId)
    .eq('workspace_id', ctx.workspaceId)
    .single();

  if (!aiSystem) {
    return NextResponse.json(
      { ok: false, error: 'AI system not found in your workspace' },
      { status: 404 }
    );
  }

  // Calculate risk level
  const { level, score, reasoning } = calculateRiskLevel(body.answers);

  // Create the assessment
  const { data, error } = await supabase
    .from('risk_assessments')
    .insert({
      workspace_id: ctx.workspaceId,
      company_id: ctx.companyId,
      ai_system_id: aiSystemId,
      risk_level: level,
      risk_score: score,
      assessment_data: {
        answers: body.answers,
        reasoning,
        assessedAt: new Date().toISOString(),
      },
      status,
    })
    .select(`
      id,
      ai_system_id,
      risk_level,
      risk_score,
      status,
      created_at,
      ai_systems(id, name)
    `)
    .single();

  if (error || !data) {
    console.error('[api/risk-assessments] insert failed:', error);
    return NextResponse.json(
      { ok: false, error: 'Could not save the risk assessment' },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, assessment: data });
}
