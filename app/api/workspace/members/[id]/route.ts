import { NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase-server';
import { logAuditEvent } from '@/lib/audit-log';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface UpdateMemberBody {
  role?: 'viewer' | 'member' | 'admin' | 'owner';
}

/**
 * Resolve the caller's active workspace and role.
 */
async function resolveContext(supabase: ReturnType<typeof createRouteClient>) {
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
    return {
      status: 409 as const,
      error: 'No workspace yet — complete company setup first',
    };
  }

  return {
    status: 200 as const,
    user,
    workspaceId: membership.workspace_id as string,
    role: membership.role as string,
  };
}

/**
 * Check if user has required role
 */
function hasRole(userRole: string, requiredRoles: string[]): boolean {
  const roleHierarchy: Record<string, number> = {
    owner: 4,
    admin: 3,
    member: 2,
    viewer: 1,
  };

  const userLevel = roleHierarchy[userRole] || 0;
  const minRequired = Math.max(...requiredRoles.map((r) => roleHierarchy[r] || 0));

  return userLevel >= minRequired;
}

/** PATCH /api/workspace/members/[id] — update member role */
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

  // Only admin and owner can update members
  if (!hasRole(ctx.role, ['admin', 'owner'])) {
    return NextResponse.json(
      { ok: false, error: 'Only admins can manage members' },
      { status: 403 }
    );
  }

  let body: UpdateMemberBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Invalid request body' },
      { status: 400 }
    );
  }

  try {
    // Verify member exists in workspace
    const { data: member, error: checkError } = await supabase
      .from('workspace_members')
      .select('id, email, role')
      .eq('id', params.id)
      .eq('workspace_id', ctx.workspaceId)
      .limit(1)
      .maybeSingle();

    if (checkError || !member) {
      return NextResponse.json(
        { ok: false, error: 'Member not found' },
        { status: 404 }
      );
    }

    const previousRole = (member as any).role;
    const memberEmail = (member as any).email;

    // Update member
    const updateData: any = {};
    if (body.role) {
      updateData.role = body.role;
    }
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('workspace_members')
      .update(updateData)
      .eq('id', params.id)
      .select();

    if (error) {
      console.error('[api/workspace/members/[id]] update failed:', error);
      return NextResponse.json(
        { ok: false, error: 'Failed to update member' },
        { status: 500 }
      );
    }

    // Log audit event for role change
    if (body.role && body.role !== previousRole) {
      await logAuditEvent(
        supabase,
        ctx.workspaceId,
        ctx.user.id,
        'member_role_changed',
        'workspace_member',
        params.id,
        memberEmail,
        {
          previous_role: previousRole,
          new_role: body.role,
        }
      );
    }

    return NextResponse.json({
      ok: true,
      member: data?.[0],
    });
  } catch (err) {
    console.error('[api/workspace/members/[id]] error:', err);
    return NextResponse.json(
      { ok: false, error: 'Failed to update member' },
      { status: 500 }
    );
  }
}

/** DELETE /api/workspace/members/[id] — remove member from workspace */
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

  // Only admin and owner can remove members
  if (!hasRole(ctx.role, ['admin', 'owner'])) {
    return NextResponse.json(
      { ok: false, error: 'Only admins can manage members' },
      { status: 403 }
    );
  }

  try {
    // Verify member exists in workspace
    const { data: member, error: checkError } = await supabase
      .from('workspace_members')
      .select('id, user_id, email, role')
      .eq('id', params.id)
      .eq('workspace_id', ctx.workspaceId)
      .limit(1)
      .maybeSingle();

    if (checkError || !member) {
      return NextResponse.json(
        { ok: false, error: 'Member not found' },
        { status: 404 }
      );
    }

    const memberEmail = (member as any).email;

    // Prevent removing the last owner
    if ((member as any).role === 'owner') {
      const { count: ownerCount } = await supabase
        .from('workspace_members')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', ctx.workspaceId)
        .eq('role', 'owner')
        .eq('status', 'active');

      if (ownerCount === 1) {
        return NextResponse.json(
          { ok: false, error: 'Cannot remove the last owner' },
          { status: 400 }
        );
      }
    }

    // Mark as removed instead of deleting
    const { error } = await supabase
      .from('workspace_members')
      .update({ status: 'removed', updated_at: new Date().toISOString() })
      .eq('id', params.id);

    if (error) {
      console.error('[api/workspace/members/[id]] delete failed:', error);
      return NextResponse.json(
        { ok: false, error: 'Failed to remove member' },
        { status: 500 }
      );
    }

    // Log audit event for member removal
    await logAuditEvent(
      supabase,
      ctx.workspaceId,
      ctx.user.id,
      'member_removed',
      'workspace_member',
      params.id,
      memberEmail,
      {
        previous_status: 'active',
        new_status: 'removed',
      }
    );

    return NextResponse.json({
      ok: true,
    });
  } catch (err) {
    console.error('[api/workspace/members/[id]] error:', err);
    return NextResponse.json(
      { ok: false, error: 'Failed to remove member' },
      { status: 500 }
    );
  }
}
