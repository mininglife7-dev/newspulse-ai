import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase-server';

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
 * PUT/DELETE /api/evidence/:id — update or delete an evidence record.
 *
 * The evidence UI calls this dynamic path. The handlers previously lived on the
 * collection route with `pathname.split('/').pop()` id extraction (yielding the
 * literal "evidence"), so they never routed here. Now at the correct segment
 * with async params (Next 15+), workspace-scoped.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json(
      { ok: false, error: 'Evidence ID required' },
      { status: 400 }
    );
  }

  let body: { title?: string; description?: string; status?: string };
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
  if (body.title) updateData.title = body.title.trim();
  if (body.description) updateData.description = body.description.trim();
  if (body.status) updateData.status = body.status;

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json(
      { ok: false, error: 'No fields to update' },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from('evidence')
    .update(updateData)
    .eq('id', id)
    .eq('workspace_id', ctx.workspaceId)
    .select('*')
    .maybeSingle();

  if (error) {
    console.error('[api/evidence/:id] PUT failed:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to update evidence' },
      { status: 500 }
    );
  }
  if (!data) {
    return NextResponse.json(
      { ok: false, error: 'Evidence not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true, evidence: data });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json(
      { ok: false, error: 'Evidence ID required' },
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

  const { error } = await supabase
    .from('evidence')
    .delete()
    .eq('id', id)
    .eq('workspace_id', ctx.workspaceId);

  if (error) {
    console.error('[api/evidence/:id] DELETE failed:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to delete evidence' },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
