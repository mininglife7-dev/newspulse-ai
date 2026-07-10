import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const runtime = 'nodejs';

interface UpdateMemberRequest {
  workspace_id: string;
  member_id: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
}

export async function PUT(req: NextRequest) {
  try {
    const body: UpdateMemberRequest = await req.json();

    // Validate required fields
    if (!body.workspace_id || !body.member_id || !body.role) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Missing required fields: workspace_id, member_id, role',
        },
        { status: 400 }
      );
    }

    // Get current authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { ok: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify current user has admin access to this workspace
    const { data: currentMember, error: memberError } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', body.workspace_id)
      .eq('user_id', user.id)
      .single();

    if (memberError || !currentMember) {
      return NextResponse.json(
        { ok: false, error: 'Access denied to this workspace' },
        { status: 403 }
      );
    }

    // Only owners can change member roles
    if (currentMember.role !== 'owner') {
      return NextResponse.json(
        { ok: false, error: 'Only workspace owners can change member roles' },
        { status: 403 }
      );
    }

    // Verify target member exists in workspace
    const { data: targetMember, error: targetError } = await supabase
      .from('workspace_members')
      .select('id, role, user_id')
      .eq('id', body.member_id)
      .eq('workspace_id', body.workspace_id)
      .single();

    if (targetError || !targetMember) {
      return NextResponse.json(
        { ok: false, error: 'Member not found' },
        { status: 404 }
      );
    }

    // Prevent removing the last owner
    if (targetMember.role === 'owner' && body.role !== 'owner') {
      const { data: otherOwners } = await supabase
        .from('workspace_members')
        .select('id')
        .eq('workspace_id', body.workspace_id)
        .eq('role', 'owner')
        .neq('id', body.member_id);

      if (!otherOwners || otherOwners.length === 0) {
        return NextResponse.json(
          { ok: false, error: 'Cannot remove the last owner from a workspace' },
          { status: 400 }
        );
      }
    }

    // Update member role
    const { data: updated, error: updateError } = await supabase
      .from('workspace_members')
      .update({ role: body.role })
      .eq('id', body.member_id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { ok: false, error: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        member: {
          id: updated.id,
          email: updated.email,
          role: updated.role,
          updated_at: updated.updated_at,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || 'Failed to update member',
      },
      { status: 500 }
    );
  }
}
