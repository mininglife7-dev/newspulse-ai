import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase-server';
import { classifyRisk, getAssessmentQuestions } from '@/lib/risk-assessment';
import { withLogging } from '@/lib/middleware-logging';

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

async function resolveContext(supabase: Awaited<ReturnType<typeof createRouteClient>>) {
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
  const supabase = await createRouteClient();
  const ctx = await resolveContext(supabase);

  let userId: string | undefined;
  let workspaceId: string | undefined;

  if (ctx.status === 200) {
    userId = ctx.userId;
    workspaceId = ctx.workspaceId;
  }

  return withLogging(
    request,
    async () => {
      const systemId = request.nextUrl.searchParams.get('systemId');
      const assessmentId = request.nextUrl.searchParams.get('assessmentId');

      if (!systemId && !assessmentId) {
        return NextResponse.json(
          { ok: false, error: 'systemId or assessmentId required' },
          { status: 400 }
        );
      }

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
    },
    {
      endpoint: '/api/assessments',
      method: 'GET',
      userId,
      workspaceId,
    }
  );
}

/** POST /api/assessments — create or update assessment */
export async function POST(request: NextRequest) {
  const supabase = await createRouteClient();
  const ctx = await resolveContext(supabase);

  let userId: string | undefined;
  let workspaceId: string | undefined;

  if (ctx.status === 200) {
    userId = ctx.userId;
    workspaceId = ctx.workspaceId;
  }

  return withLogging(
    request,
    async () => {
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

      // Auto-generate obligations based on risk level and recommendations
      if (response && response.id) {
        try {
          const priorityMap: Record<string, string> = {
            unacceptable: 'critical',
            high: 'high',
            medium: 'medium',
            low: 'low',
          };
          const priority = priorityMap[result.riskLevel] || 'medium';

          // Generate obligation texts from recommendations and categories
          const obligationTexts: string[] = [];
          if (result.recommendations && result.recommendations.length > 0) {
            obligationTexts.push(...result.recommendations);
          }

          for (const obligationText of obligationTexts) {
            // Check if obligation already exists for this company
            const { data: existing } = await supabase
              .from('obligations')
              .select('id')
              .eq('company_id', system.company_id)
              .eq('workspace_id', ctx.workspaceId)
              .ilike('title', obligationText.substring(0, 100))
              .limit(1)
              .maybeSingle();

            let obligationId: string;

            if (existing) {
              obligationId = existing.id;
            } else {
              // Create new obligation
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
                console.warn('[api/assessments] failed to create obligation:', createError);
                continue;
              }
              obligationId = created.id;
            }

            // Link obligation to assessment
            const { error: linkError } = await supabase.from('assessment_obligations').insert({
              assessment_id: response.id,
              obligation_id: obligationId,
            });

            if (linkError) {
              console.warn('[api/assessments] failed to link obligation:', linkError);
            }
          }
        } catch (err) {
          console.warn('[api/assessments] obligation auto-generation failed:', err);
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
    },
    {
      endpoint: '/api/assessments',
      method: 'POST',
      userId,
      workspaceId,
    }
  );
}

/** PUT /api/assessments/:id — update assessment status */
export async function PUT(request: NextRequest) {
  const supabase = await createRouteClient();
  const ctx = await resolveContext(supabase);

  let userId: string | undefined;
  let workspaceId: string | undefined;

  if (ctx.status === 200) {
    userId = ctx.userId;
    workspaceId = ctx.workspaceId;
  }

  return withLogging(
    request,
    async () => {
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
    },
    {
      endpoint: '/api/assessments',
      method: 'PUT',
      userId,
      workspaceId,
    }
  );
}
