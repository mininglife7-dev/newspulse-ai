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
    .select('workspace_id, role')
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
    userRole: membership.role as string,
  };
}

/**
 * PUT /api/team/:id — update a member's role/status.
 * DELETE /api/team/:id — remove a member (soft delete → status 'removed').
 *
 * The team UI calls these dynamic paths. The handlers previously lived on the
 * collection route with `pathname.split('/').pop()` id extraction (yielding the
 * literal "team"), so member management never worked. Relocated here with async
 * params (Next 15+); the owner/admin authorization and owner-protection are
 * preserved unchanged.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json(
      { ok: false, error: 'Member ID required' },
      { status: 400 }
    );
  }

  let body: { role?: string; status?: string };
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

  if (!['owner', 'admin'].includes(ctx.userRole)) {
    return NextResponse.json(
      { ok: false, error: 'Only admins can modify members' },
      { status: 403 }
    );
  }

  const updateData: Record<string, unknown> = {};
  if (body.role && ['admin', 'member', 'viewer'].includes(body.role)) {
    updateData.role = body.role;
  }
  if (body.status && ['active', 'pending', 'removed'].includes(body.status)) {
    updateData.status = body.status;
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json(
      { ok: false, error: 'No valid fields to update' },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from('workspace_members')
    .update(updateData)
    .eq('id', id)
    .eq('workspace_id', ctx.workspaceId)
    .select('*')
    .maybeSingle();

  if (error) {
    console.error('[api/team/:id] PUT failed:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to update member' },
      { status: 500 }
    );
  }
  if (!data) {
    return NextResponse.json(
      { ok: false, error: 'Member not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true, member: data });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json(
      { ok: false, error: 'Member ID required' },
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

  if (!['owner', 'admin'].includes(ctx.userRole)) {
    return NextResponse.json(
      { ok: false, error: 'Only admins can remove members' },
      { status: 403 }
    );
  }

  // Never remove the workspace owner.
  const { data: member } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('id', id)
    .eq('workspace_id', ctx.workspaceId)
    .limit(1)
    .maybeSingle();

  if (!member) {
    return NextResponse.json(
      { ok: false, error: 'Member not found' },
      { status: 404 }
    );
  }
  if (member.role === 'owner') {
    return NextResponse.json(
      { ok: false, error: 'Cannot remove workspace owner' },
      { status: 403 }
    );
  }

  const { error } = await supabase
    .from('workspace_members')
    .update({ status: 'removed' })
    .eq('id', id)
    .eq('workspace_id', ctx.workspaceId);

  if (error) {
    console.error('[api/team/:id] DELETE failed:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to remove member' },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
