import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase-server';

interface InviteMemberBody {
  email: string;
  role?: 'owner' | 'admin' | 'member' | 'viewer';
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createRouteClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
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
      .eq('workspace_id', params.id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (!membership) {
      return NextResponse.json(
        { ok: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    // Fetch all members in workspace
    const { data: members, error } = await supabase
      .from('workspace_members')
      .select('id, user_id, email, role, status, joined_at, invited_at')
      .eq('workspace_id', params.id)
      .order('joined_at', { ascending: false, nullsFirst: true });

    if (error) throw error;

    return NextResponse.json({
      ok: true,
      members: members || [],
    });
  } catch (error) {
    console.error('[api/workspace/[id]/members] GET failed:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch members' },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  let body: InviteMemberBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  const supabase = await createRouteClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { ok: false, error: 'Authentication required' },
      { status: 401 }
    );
  }

  // Validate email
  if (!body.email || typeof body.email !== 'string' || !body.email.includes('@')) {
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
      .eq('workspace_id', params.id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (!userMembership || !['owner', 'admin'].includes(userMembership.role)) {
      return NextResponse.json(
        { ok: false, error: 'Only workspace owners/admins can invite members' },
        { status: 403 }
      );
    }

    // Check if member already exists
    const { data: existing } = await supabase
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', params.id)
      .eq('email', body.email.toLowerCase())
      .single();

    if (existing) {
      return NextResponse.json(
        { ok: false, error: 'This email is already a member of this workspace' },
        { status: 409 }
      );
    }

    // Create invitation (pending status)
    const { data: invitation, error: inviteError } = await supabase
      .from('workspace_members')
      .insert({
        workspace_id: params.id,
        email: body.email.toLowerCase(),
        role: body.role || 'member',
        status: 'pending',
        invited_at: new Date().toISOString(),
      })
      .select('*')
      .single();

    if (inviteError) throw inviteError;

    // TODO: Send invitation email with acceptance link
    // For now, return the invitation record

    return NextResponse.json({
      ok: true,
      invitation,
      message: 'Invitation created. User will need to accept it to join the workspace.',
    });
  } catch (error) {
    console.error('[api/workspace/[id]/members] POST failed:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to invite member' },
      { status: 500 }
    );
  }
}
