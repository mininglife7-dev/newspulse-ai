import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase-server';
import { logger } from '@/lib/logger';
import { validators, validate } from '@/lib/input-validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface InviteMemberRequest {
  email: string;
  role: 'admin' | 'member' | 'viewer';
}

interface RouteContext {
  status: number;
  workspaceId?: string;
  userId?: string;
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
    logger.error('Workspace membership lookup failed', 'MEMBERSHIP_LOOKUP_ERROR', memberError);
    return { status: 500, error: 'Membership lookup failed' };
  }

  if (!membership) {
    return { status: 403, error: 'Not a workspace member' };
  }

  return {
    status: 200,
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
    logger.error('Team members list failed', 'TEAM_LIST_ERROR', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch team members' },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, members: data ?? [] });
}

/** POST /api/team — invite a member to workspace */
export async function POST(request: NextRequest) {
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
    email: validators.string({ minLength: 1 }),
    role: validators.enum(['admin', 'member', 'viewer']),
  });

  if (!validationResult.ok) {
    return NextResponse.json(
      { ok: false, error: 'Invalid input', errors: validationResult.errors },
      { status: 400 }
    );
  }

  const validated = validationResult.value as InviteMemberRequest;
  const normalizedEmail = validated.email.toLowerCase();

  const supabase = await createRouteClient();
  const ctx = await resolveContext(supabase);
  if (ctx.status !== 200) {
    return NextResponse.json(
      { ok: false, error: ctx.error },
      { status: ctx.status }
    );
  }

  // Only admins and owners can invite members
  if (!['owner', 'admin'].includes(ctx.userRole || '')) {
    return NextResponse.json(
      { ok: false, error: 'Only admins can invite members' },
      { status: 403 }
    );
  }

  // Check if member already exists
  const { data: existing, error: existingError } = await supabase
    .from('workspace_members')
    .select('id')
    .eq('workspace_id', ctx.workspaceId)
    .eq('email', normalizedEmail)
    .limit(1)
    .maybeSingle();

  if (existingError) {
    logger.error('Member existence check failed', 'MEMBER_LOOKUP_ERROR', existingError);
    return NextResponse.json(
      { ok: false, error: 'Failed to check member status' },
      { status: 500 }
    );
  }

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
      user_id: null,
      email: normalizedEmail,
      role: validated.role,
      status: 'pending',
    })
    .select('id, email, role, status, invited_at')
    .single();

  if (error) {
    logger.error('Team member invitation failed', 'TEAM_INVITE_ERROR', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to send invitation' },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, member: data });
}
