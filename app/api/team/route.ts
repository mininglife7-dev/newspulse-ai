import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

interface InviteMemberRequest {
  email: string;
  role: 'admin' | 'member' | 'viewer';
}

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
    userId: user.id,
    userRole: membership.role as string,
  };
}

/** GET /api/team — list workspace members */
export async function GET(request: NextRequest) {
  const supabase = await createRouteClient();
  const ctx = await resolveContext(supabase);
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
}

/** POST /api/team — invite a member to workspace */
export async function POST(request: NextRequest) {
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

  const supabase = await createRouteClient();
  const ctx = await resolveContext(supabase);
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
}
