import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase-server';
import { logger } from '@/lib/structured-logger';

interface InviteMemberBody {
  email: string;
  role?: 'owner' | 'admin' | 'member' | 'viewer';
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  const { id } = await params;
  const supabase = await createRouteClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    logger.warn(
      'Team members list requested without authentication',
      'WORKSPACE_MEMBERS_AUTH_REQUIRED',
      { workspace_id: id },
      Date.now() - startTime
    );
    return NextResponse.json(
      { ok: false, error: 'Authentication required' },
      { status: 401 }
    );
  }

  try {
    // Verify user has access to this workspace
    const { data: membership } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('workspace_id', id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (!membership) {
      logger.warn(
        'Unauthorized access to workspace members',
        'WORKSPACE_MEMBERS_ACCESS_DENIED',
        { workspace_id: id, user_id: user.id },
        Date.now() - startTime
      );
      return NextResponse.json(
        { ok: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    // Fetch all members in workspace
    const { data: members, error } = await supabase
      .from('workspace_members')
      .select('id, user_id, email, role, status, joined_at, invited_at')
      .eq('workspace_id', id)
      .order('joined_at', { ascending: false, nullsFirst: true });

    if (error) throw error;

    logger.info(
      `Fetched ${members?.length || 0} team members`,
      'WORKSPACE_MEMBERS_RETRIEVED',
      {
        workspace_id: id,
        member_count: members?.length || 0,
      },
      Date.now() - startTime
    );

    return NextResponse.json({
      ok: true,
      members: members || [],
    });
  } catch (error) {
    logger.error(
      'Failed to fetch team members',
      'WORKSPACE_MEMBERS_ERROR',
      error,
      { workspace_id: id }
    );
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch members' },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  const { id } = await params;
  let body: InviteMemberBody;
  try {
    body = await req.json();
  } catch {
    logger.warn(
      'Member invitation request with invalid JSON',
      'WORKSPACE_INVITE_INVALID_JSON',
      { workspace_id: id },
      Date.now() - startTime
    );
    return NextResponse.json(
      { ok: false, error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  const supabase = await createRouteClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    logger.warn(
      'Member invitation requested without authentication',
      'WORKSPACE_INVITE_AUTH_REQUIRED',
      { workspace_id: id },
      Date.now() - startTime
    );
    return NextResponse.json(
      { ok: false, error: 'Authentication required' },
      { status: 401 }
    );
  }

  // Validate email
  if (!body.email || typeof body.email !== 'string' || !body.email.includes('@')) {
    logger.warn(
      'Member invitation with invalid email',
      'WORKSPACE_INVITE_INVALID_EMAIL',
      { workspace_id: id, email: body.email },
      Date.now() - startTime
    );
    return NextResponse.json(
      { ok: false, error: 'Valid email is required' },
      { status: 400 }
    );
  }

  try {
    // Verify user is owner/admin of this workspace
    const { data: userMembership } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (!userMembership || !['owner', 'admin'].includes(userMembership.role)) {
      logger.warn(
        'Unauthorized member invitation attempt',
        'WORKSPACE_INVITE_PERMISSION_DENIED',
        {
          workspace_id: id,
          user_id: user.id,
          user_role: userMembership?.role,
        },
        Date.now() - startTime
      );
      return NextResponse.json(
        { ok: false, error: 'Only workspace owners/admins can invite members' },
        { status: 403 }
      );
    }

    // Check if member already exists
    const { data: existing } = await supabase
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', id)
      .eq('email', body.email.toLowerCase())
      .single();

    if (existing) {
      logger.warn(
        'Member invitation for already-existing member',
        'WORKSPACE_INVITE_ALREADY_MEMBER',
        {
          workspace_id: id,
          email: body.email,
        },
        Date.now() - startTime
      );
      return NextResponse.json(
        { ok: false, error: 'This email is already a member of this workspace' },
        { status: 409 }
      );
    }

    // Create invitation (pending status)
    const { data: invitation, error: inviteError } = await supabase
      .from('workspace_members')
      .insert({
        workspace_id: id,
        email: body.email.toLowerCase(),
        role: body.role || 'member',
        status: 'pending',
        invited_at: new Date().toISOString(),
      })
      .select('*')
      .single();

    if (inviteError) throw inviteError;

    logger.info(
      'Team member invited successfully',
      'WORKSPACE_MEMBER_INVITED',
      {
        workspace_id: id,
        invited_by: user.id,
        invited_email: body.email,
        role: body.role || 'member',
      },
      Date.now() - startTime
    );

    // TODO: Send invitation email with acceptance link
    // For now, return the invitation record

    return NextResponse.json({
      ok: true,
      invitation,
      message: 'Invitation created. User will need to accept it to join the workspace.',
    });
  } catch (error) {
    logger.error(
      'Failed to invite team member',
      'WORKSPACE_INVITE_ERROR',
      error,
      { workspace_id: id }
    );
    return NextResponse.json(
      { ok: false, error: 'Failed to invite member' },
      { status: 500 }
    );
  }
}
