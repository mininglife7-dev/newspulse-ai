import { NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

  return {
    status: 200 as const,
    workspaceId: membership.workspace_id as string,
  };
}

/** GET /api/risk-assessments/[id] — fetch a single assessment */
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
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
      `id, ai_system_id, risk_level, risk_score, status, created_at, assessment_data,
       ai_systems (id, name, system_type)`
    )
    .eq('id', params.id)
    .eq('workspace_id', ctx.workspaceId)
    .maybeSingle();

  if (error) {
    console.error('[api/risk-assessments/[id]] fetch failed:', error);
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

  return NextResponse.json({
    ok: true,
    assessment: data,
  });
}
