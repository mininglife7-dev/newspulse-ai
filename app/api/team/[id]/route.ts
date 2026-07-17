import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase-server';
import { logger } from '@/lib/logger';
import { validators, validate } from '@/lib/input-validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface UpdateMemberRequest {
  role?: 'admin' | 'member' | 'viewer';
  status?: 'active' | 'pending' | 'removed';
}

interface RouteContext {
  status: number;
  workspaceId?: string;
  userRole?: string;
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
    .select('workspace_id, role')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle();

  if (memberError) {
    logger.error(
      'Workspace membership lookup failed',
      'MEMBERSHIP_LOOKUP_ERROR',
      memberError
    );
    return { status: 500, error: 'Membership lookup failed' };
  }

  if (!membership) {
    return { status: 403, error: 'Not a workspace member' };
  }

  return {
    status: 200,
    workspaceId: membership.workspace_id as string,
    userRole: membership.role as string,
  };
}

/**
 * PUT /api/team/:id — update a member's role/status.
 *
 * Only admins/owners can modify members. Partial updates supported:
 * either role (admin/member/viewer) or status (active/pending/removed).
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
    role: validators.optional(validators.enum(['admin', 'member', 'viewer'])),
    status: validators.optional(
      validators.enum(['active', 'pending', 'removed'])
    ),
  });

  if (!validationResult.ok) {
    return NextResponse.json(
      { ok: false, error: 'Invalid input', errors: validationResult.errors },
      { status: 400 }
    );
  }

  const validated = validationResult.value as UpdateMemberRequest;

  const supabase = await createRouteClient();
  const ctx = await resolveContext(supabase);
  if (ctx.status !== 200) {
    return NextResponse.json(
      { ok: false, error: ctx.error },
      { status: ctx.status }
    );
  }

  if (!['owner', 'admin'].includes(ctx.userRole || '')) {
    return NextResponse.json(
      { ok: false, error: 'Only admins can modify members' },
      { status: 403 }
    );
  }

  const updateData: Record<string, unknown> = {};
  if (validated.role) {
    updateData.role = validated.role;
  }
  if (validated.status) {
    updateData.status = validated.status;
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json(
      { ok: false, error: 'No fields to update' },
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
    logger.error('Member update failed', 'MEMBER_UPDATE_ERROR', error);
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

/**
 * DELETE /api/team/:id — remove a member (soft delete → status 'removed').
 *
 * Only admins/owners can remove members. Cannot remove the workspace owner.
 */
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

  if (!['owner', 'admin'].includes(ctx.userRole || '')) {
    return NextResponse.json(
      { ok: false, error: 'Only admins can remove members' },
      { status: 403 }
    );
  }

  const { data: member, error: memberError } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('id', id)
    .eq('workspace_id', ctx.workspaceId)
    .limit(1)
    .maybeSingle();

  if (memberError) {
    logger.error('Member lookup failed', 'MEMBER_LOOKUP_ERROR', memberError);
    return NextResponse.json(
      { ok: false, error: 'Failed to lookup member' },
      { status: 500 }
    );
  }

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
    logger.error('Member removal failed', 'MEMBER_REMOVE_ERROR', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to remove member' },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
