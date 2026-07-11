import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase-server';
import { withLogging } from '@/lib/middleware-logging';

export const dynamic = 'force-dynamic';

interface InviteMemberRequest {
  email: string;
  role: 'admin' | 'member' | 'viewer';
}

async function resolveContext(supabase: Awaited<ReturnType<typeof createRouteClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
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
    userId: user.id,
    userRole: membership.role as string,
  };
}

/** GET /api/team — list workspace members */
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
      if (ctx.status !== 200) {
        return NextResponse.json(
          { ok: false, error: ctx.error },
          { status: ctx.status }
        );
      }

      const { data, error } = await supabase
        .from('workspace_members')
        .select('id, email, role, status, joined_at, invited_at')
        .eq('workspace_id', ctx.workspaceId)
        .order('joined_at', { ascending: false, nullsFirst: false });

      if (error) {
        console.error('[api/team] GET failed:', error);
        return NextResponse.json(
          { ok: false, error: 'Failed to fetch team members' },
          { status: 500 }
        );
      }

      return NextResponse.json({ ok: true, members: data ?? [] });
    },
    {
      endpoint: '/api/team',
      method: 'GET',
      userId,
      workspaceId,
    }
  );
}

/** POST /api/team — invite a member to workspace */
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
      let body: InviteMemberRequest;
      try {
        body = await request.json();
      } catch {
        return NextResponse.json(
          { ok: false, error: 'Invalid JSON' },
          { status: 400 }
        );
      }

      if (!body.email?.trim()) {
        return NextResponse.json(
          { ok: false, error: 'email is required' },
          { status: 400 }
        );
      }

      if (!['admin', 'member', 'viewer'].includes(body.role)) {
        return NextResponse.json(
          { ok: false, error: 'role must be admin, member, or viewer' },
          { status: 400 }
        );
      }

      if (ctx.status !== 200) {
        return NextResponse.json(
          { ok: false, error: ctx.error },
          { status: ctx.status }
        );
      }

      // Only admins and owners can invite members
      if (!['owner', 'admin'].includes(ctx.userRole)) {
        return NextResponse.json(
          { ok: false, error: 'Only admins can invite members' },
          { status: 403 }
        );
      }

      // Check if member already exists
      const { data: existing } = await supabase
        .from('workspace_members')
        .select('id')
        .eq('workspace_id', ctx.workspaceId)
        .eq('email', body.email.toLowerCase())
        .limit(1)
        .maybeSingle();

      if (existing) {
        return NextResponse.json(
          { ok: false, error: 'Member already invited to this workspace' },
          { status: 409 }
        );
      }

      // Create invitation
      const { data, error } = await supabase
        .from('workspace_members')
        .insert({
          workspace_id: ctx.workspaceId,
          user_id: null, // Will be populated when user joins
          email: body.email.toLowerCase(),
          role: body.role,
          status: 'pending',
        })
        .select('id, email, role, status, invited_at')
        .single();

      if (error) {
        console.error('[api/team] POST failed:', error);
        return NextResponse.json(
          { ok: false, error: 'Failed to send invitation' },
          { status: 500 }
        );
      }

      return NextResponse.json({ ok: true, member: data });
    },
    {
      endpoint: '/api/team',
      method: 'POST',
      userId,
      workspaceId,
    }
  );
}

/** PUT /api/team/:id — update member role or status */
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
      const memberId = pathname.split('/').pop();

      if (!memberId) {
        return NextResponse.json(
          { ok: false, error: 'Member ID required' },
          { status: 400 }
        );
      }

      let body: any;
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

      // Only admins and owners can modify members
      if (!['owner', 'admin'].includes(ctx.userRole)) {
        return NextResponse.json(
          { ok: false, error: 'Only admins can modify members' },
          { status: 403 }
        );
      }

      const updateData: any = {};
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
        .eq('id', memberId)
        .eq('workspace_id', ctx.workspaceId)
        .select('*')
        .single();

      if (error) {
        console.error('[api/team] PUT failed:', error);
        return NextResponse.json(
          { ok: false, error: 'Failed to update member' },
          { status: 500 }
        );
      }

      return NextResponse.json({ ok: true, member: data });
    },
    {
      endpoint: '/api/team',
      method: 'PUT',
      userId,
      workspaceId,
    }
  );
}

/** DELETE /api/team/:id — remove member from workspace */
export async function DELETE(request: NextRequest) {
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
      const memberId = pathname.split('/').pop();

      if (!memberId) {
        return NextResponse.json(
          { ok: false, error: 'Member ID required' },
          { status: 400 }
        );
      }

      if (ctx.status !== 200) {
        return NextResponse.json(
          { ok: false, error: ctx.error },
          { status: ctx.status }
        );
      }

      // Only admins and owners can remove members
      if (!['owner', 'admin'].includes(ctx.userRole)) {
        return NextResponse.json(
          { ok: false, error: 'Only admins can remove members' },
          { status: 403 }
        );
      }

      // Prevent removing the workspace owner
      const { data: member } = await supabase
        .from('workspace_members')
        .select('role')
        .eq('id', memberId)
        .eq('workspace_id', ctx.workspaceId)
        .limit(1)
        .maybeSingle();

      if (member?.role === 'owner') {
        return NextResponse.json(
          { ok: false, error: 'Cannot remove workspace owner' },
          { status: 403 }
        );
      }

      const { error } = await supabase
        .from('workspace_members')
        .update({ status: 'removed' })
        .eq('id', memberId)
        .eq('workspace_id', ctx.workspaceId);

      if (error) {
        console.error('[api/team] DELETE failed:', error);
        return NextResponse.json(
          { ok: false, error: 'Failed to remove member' },
          { status: 500 }
        );
      }

      return NextResponse.json({ ok: true });
    },
    {
      endpoint: '/api/team',
      method: 'DELETE',
      userId,
      workspaceId,
    }
  );
}
