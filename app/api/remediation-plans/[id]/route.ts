import { NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface UpdateRemediationPlanBody {
  title?: string;
  description?: string;
  owner?: string;
  target_date?: string;
  status?: 'planned' | 'in_progress' | 'completed' | 'on_hold';
}

/**
 * Resolve the caller's active workspace.
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

/** GET /api/remediation-plans/[id] — fetch a single remediation plan */
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
    .from('remediation_plans')
    .select('*')
    .eq('id', params.id)
    .eq('workspace_id', ctx.workspaceId)
    .maybeSingle();

  if (error) {
    console.error('[api/remediation-plans/[id]] fetch failed:', error);
    return NextResponse.json(
      { ok: false, error: 'Could not load remediation plan' },
      { status: 500 }
    );
  }

  if (!data) {
    return NextResponse.json(
      { ok: false, error: 'Remediation plan not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    ok: true,
    plan: data,
  });
}

/** PATCH /api/remediation-plans/[id] — update a remediation plan */
export async function PATCH(
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

  let body: UpdateRemediationPlanBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Invalid request body' },
      { status: 400 }
    );
  }

  // Verify plan belongs to workspace
  const { data: existing, error: checkError } = await supabase
    .from('remediation_plans')
    .select('id')
    .eq('id', params.id)
    .eq('workspace_id', ctx.workspaceId)
    .maybeSingle();

  if (checkError || !existing) {
    return NextResponse.json(
      { ok: false, error: 'Remediation plan not found' },
      { status: 404 }
    );
  }

  // Update plan
  const { data, error } = await supabase
    .from('remediation_plans')
    .update({
      title: body.title,
      description: body.description,
      owner: body.owner,
      target_date: body.target_date,
      status: body.status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.id)
    .select();

  if (error) {
    console.error('[api/remediation-plans/[id]] update failed:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to update remediation plan' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    plan: data?.[0],
  });
}

/** DELETE /api/remediation-plans/[id] — delete a remediation plan */
export async function DELETE(
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

  // Verify plan belongs to workspace
  const { data: existing, error: checkError } = await supabase
    .from('remediation_plans')
    .select('id')
    .eq('id', params.id)
    .eq('workspace_id', ctx.workspaceId)
    .maybeSingle();

  if (checkError || !existing) {
    return NextResponse.json(
      { ok: false, error: 'Remediation plan not found' },
      { status: 404 }
    );
  }

  const { error } = await supabase
    .from('remediation_plans')
    .delete()
    .eq('id', params.id);

  if (error) {
    console.error('[api/remediation-plans/[id]] delete failed:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to delete remediation plan' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
  });
}
