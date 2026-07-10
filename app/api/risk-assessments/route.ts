import { NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase-server';
import { assessRisk, type RiskAssessmentInput } from '@/lib/risk-assessment';
import { logAuditEvent } from '@/lib/audit-log';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface CreateAssessmentBody extends RiskAssessmentInput {
  aiSystemId: string;
}

/**
 * Resolve the caller's active workspace (and company) or explain why not.
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

/** GET /api/risk-assessments — list assessments for the workspace */
export async function GET() {
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
    .select(
      `id, ai_system_id, risk_level, risk_score, status, created_at,
       ai_systems (id, name, system_type)`
    )
    .eq('workspace_id', ctx.workspaceId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[api/risk-assessments] list failed:', error);
    return NextResponse.json(
      { ok: false, error: 'Could not load risk assessments' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    assessments: data || [],
  });
}

/** POST /api/risk-assessments — create a new risk assessment */
export async function POST(req: Request) {
  const supabase = createRouteClient();
  const ctx = await resolveContext(supabase);
  if (ctx.status !== 200) {
    return NextResponse.json(
      { ok: false, error: ctx.error },
      { status: ctx.status }
    );
  }

  let body: CreateAssessmentBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Invalid request body' },
      { status: 400 }
    );
  }

  // Validate required fields
  if (!body.aiSystemId || !body.systemType || !body.autonomyLevel) {
    return NextResponse.json(
      { ok: false, error: 'Missing required fields' },
      { status: 400 }
    );
  }

  // Verify AI system belongs to workspace
  const { data: aiSystem, error: aiError } = await supabase
    .from('ai_systems')
    .select('id')
    .eq('id', body.aiSystemId)
    .eq('workspace_id', ctx.workspaceId)
    .maybeSingle();

  if (aiError || !aiSystem) {
    return NextResponse.json(
      { ok: false, error: 'AI system not found or not accessible' },
      { status: 404 }
    );
  }

  // Perform risk assessment
  const input: RiskAssessmentInput = {
    systemType: body.systemType,
    dataCategories: body.dataCategories || [],
    useCases: body.useCases || [],
    autonomyLevel: body.autonomyLevel,
    affectsRights: body.affectsRights || false,
    publicFacing: body.publicFacing || false,
  };

  const assessment = assessRisk(input);

  // Create assessment record
  const { data, error } = await supabase
    .from('risk_assessments')
    .insert({
      ai_system_id: body.aiSystemId,
      company_id: ctx.companyId,
      workspace_id: ctx.workspaceId,
      risk_level: assessment.riskLevel,
      risk_score: assessment.riskScore,
      assessment_data: {
        input,
        result: assessment,
      },
      status: 'draft',
    })
    .select();

  if (error) {
    console.error('[api/risk-assessments] insert failed:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to save assessment' },
      { status: 500 }
    );
  }

  // Log audit event
  const createdAssessment = data?.[0];
  if (createdAssessment) {
    const user = (await supabase.auth.getUser()).data.user;
    await logAuditEvent(
      supabase,
      ctx.workspaceId,
      user?.id || '',
      'assessment_created',
      'risk_assessment',
      (createdAssessment as any).id,
      `Risk Assessment - ${(createdAssessment as any).risk_level}`,
      {
        ai_system_id: body.aiSystemId,
        risk_level: (createdAssessment as any).risk_level,
        risk_score: (createdAssessment as any).risk_score,
      }
    );
  }

  return NextResponse.json(
    {
      ok: true,
      assessment: data?.[0],
    },
    { status: 201 }
  );
}
