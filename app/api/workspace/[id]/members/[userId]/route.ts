import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase-server';
import { logMemberOperation, getClientIp } from '@/lib/audit-logger';

interface UpdateMemberBody {
  action?: 'accept' | 'reject' | 'remove' | 'change_role';
  role?: 'owner' | 'admin' | 'member' | 'viewer';
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const { id, userId } = await params;
  let body: UpdateMemberBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  const supabase = await createRouteClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { ok: false, error: 'Authentication required' },
      { status: 401 }
    );
  }

  try {
    // Get the member being updated
    const { data: targetMember } = await supabase
      .from('workspace_members')
      .select('*')
      .eq('workspace_id', id)
      .eq('id', userId)
      .single();

    if (!targetMember) {
      return NextResponse.json(
        { ok: false, error: 'Member not found' },
        { status: 404 }
      );
    }

    // Get current user's membership (for permission checks)
    const { data: userMembership } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    // Handle accept action (member accepting invitation)
    if (body.action === 'accept') {
      // Only the invited user can accept
      const { data: invitedUser } = await supabase
        .from('workspace_members')
        .select('id')
        .eq('workspace_id', id)
        .eq('id', userId)
        .eq('user_id', user.id)
        .single();

      if (!invitedUser) {
        return NextResponse.json(
          { ok: false, error: 'Access denied' },
          { status: 403 }
        );
      }

      if (targetMember.status !== 'pending') {
        return NextResponse.json(
          { ok: false, error: 'Only pending invitations can be accepted' },
          { status: 409 }
        );
      }

      // Accept invitation: set status to active and store join time
      const { data: updated, error: updateError } = await supabase
        .from('workspace_members')
        .update({
          status: 'active',
          joined_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .select('*')
        .single();

      if (updateError) throw updateError;

      // Log member addition acceptance (GDPR Article 30)
      await logMemberOperation(
        id,
        'member_add',
        user.id,
        userId,
        { action: 'accept', role: updated.role },
        getClientIp(req),
        req.headers.get('user-agent') || undefined
      );

      return NextResponse.json({
        ok: true,
        member: updated,
        message: 'Invitation accepted. You are now a member of the workspace.',
      });
    }

    // Handle reject action
    if (body.action === 'reject') {
      // Only the invited user can reject, or owner/admin
      if (
        targetMember.user_id !== user.id &&
        !['owner', 'admin'].includes(userMembership?.role || '')
      ) {
        return NextResponse.json(
          { ok: false, error: 'Access denied' },
          { status: 403 }
        );
      }

      // Delete the invitation
      const { error: deleteError } = await supabase
        .from('workspace_members')
        .delete()
        .eq('id', userId);

      if (deleteError) throw deleteError;

      // Log member removal via rejection (GDPR Article 30)
      await logMemberOperation(
        id,
        'member_remove',
        user.id,
        userId,
        { action: 'reject', role: targetMember.role },
        getClientIp(req),
        req.headers.get('user-agent') || undefined
      );

      return NextResponse.json({
        ok: true,
        message: 'Invitation rejected or removed.',
      });
    }

    // Handle remove action
    if (body.action === 'remove') {
      // Only owner/admin can remove
      if (
        !userMembership ||
        !['owner', 'admin'].includes(userMembership.role)
      ) {
        return NextResponse.json(
          {
            ok: false,
            error: 'Only workspace owners/admins can remove members',
          },
          { status: 403 }
        );
      }

      // Cannot remove self
      if (targetMember.user_id === user.id) {
        return NextResponse.json(
          {
            ok: false,
            error: 'Cannot remove yourself. Transfer ownership first.',
          },
          { status: 409 }
        );
      }

      const { error: deleteError } = await supabase
        .from('workspace_members')
        .delete()
        .eq('id', userId);

      if (deleteError) throw deleteError;

      // Log member removal (GDPR Article 30)
      await logMemberOperation(
        id,
        'member_remove',
        user.id,
        userId,
        { action: 'remove', role: targetMember.role },
        getClientIp(req),
        req.headers.get('user-agent') || undefined
      );

      return NextResponse.json({
        ok: true,
        message: 'Member removed from workspace.',
      });
    }

    // Handle change_role action
    if (body.action === 'change_role') {
      // Only owner can change roles
      if (!userMembership || userMembership.role !== 'owner') {
        return NextResponse.json(
          { ok: false, error: 'Only workspace owners can change member roles' },
          { status: 403 }
        );
      }

      if (!body.role || !['admin', 'member', 'viewer'].includes(body.role)) {
        return NextResponse.json(
          {
            ok: false,
            error: 'Valid role is required (admin, member, or viewer)',
          },
          { status: 400 }
        );
      }

      // Cannot remove owner role (only owner exists)
      if (targetMember.role === 'owner') {
        return NextResponse.json(
          { ok: false, error: 'Cannot change the owner role' },
          { status: 409 }
        );
      }

      const { data: updated, error: updateError } = await supabase
        .from('workspace_members')
        .update({ role: body.role })
        .eq('id', userId)
        .select('*')
        .single();

      if (updateError) throw updateError;

      // Log permission change (GDPR Article 30)
      await logMemberOperation(
        id,
        'permission_change',
        user.id,
        userId,
        {
          action: 'change_role',
          oldRole: targetMember.role,
          newRole: body.role,
        },
        getClientIp(req),
        req.headers.get('user-agent') || undefined
      );

      return NextResponse.json({
        ok: true,
        member: updated,
        message: 'Member role updated.',
      });
    }

    return NextResponse.json(
      {
        ok: false,
        error: 'action is required (accept, reject, remove, or change_role)',
      },
      { status: 400 }
    );
  } catch (error) {
    console.error('[api/workspace/[id]/members/[userId]] PATCH failed:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to update member' },
      { status: 500 }
    );
  }
}
