import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { sendEmail } from '@/lib/email';
import { teamMemberInvited } from '@/lib/email-templates';

export const runtime = 'nodejs';

interface InviteMemberRequest {
  workspace_id: string;
  email: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
}

export async function POST(req: NextRequest) {
  try {
    const body: InviteMemberRequest = await req.json();

    // Validate required fields
    if (!body.workspace_id || !body.email || !body.role) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Missing required fields: workspace_id, email, role',
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

    // Verify user has admin access to this workspace
    const { data: member, error: memberError } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', body.workspace_id)
      .eq('user_id', user.id)
      .single();

    if (memberError || !member) {
      return NextResponse.json(
        { ok: false, error: 'Access denied to this workspace' },
        { status: 403 }
      );
    }

    // Check if current user has permission to add members (owner or admin)
    if (!['owner', 'admin'].includes(member.role)) {
      return NextResponse.json(
        { ok: false, error: 'Insufficient permissions to add members' },
        { status: 403 }
      );
    }

    // Check if user already exists in workspace
    const { data: existingMember } = await supabase
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', body.workspace_id)
      .eq('email', body.email)
      .single();

    if (existingMember) {
      return NextResponse.json(
        {
          ok: false,
          error: 'User is already a member of this workspace',
        },
        { status: 409 }
      );
    }

    // Create workspace member invitation
    const { data: invitation, error: createError } = await supabase
      .from('workspace_members')
      .insert([
        {
          workspace_id: body.workspace_id,
          email: body.email,
          role: body.role,
          invited_by: user.id,
          status: 'invited',
        },
      ])
      .select()
      .single();

    if (createError) {
      return NextResponse.json(
        { ok: false, error: createError.message },
        { status: 500 }
      );
    }

    // Send invitation email
    try {
      const { data: workspace } = await supabase
        .from('workspaces')
        .select('name')
        .eq('id', body.workspace_id)
        .single();

      const { html, text } = teamMemberInvited(
        invitation.id,
        workspace?.name || 'Your Workspace',
        user.email || 'A team member'
      );

      await sendEmail({
        to: body.email,
        subject: `You're Invited to ${workspace?.name || 'EURO AI'}`,
        html,
        text,
        categories: ['euro-ai-team-invitation'],
      }).catch((err) => {
        console.warn('Failed to send team invitation email', {
          error: err.message,
        });
      });
    } catch (emailError: any) {
      console.warn('Email notification failed for team invitation', {
        error: emailError.message,
      });
    }

    return NextResponse.json(
      {
        ok: true,
        invitation: {
          id: invitation.id,
          email: invitation.email,
          role: invitation.role,
          status: invitation.status,
          created_at: invitation.created_at,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || 'Failed to invite member',
      },
      { status: 500 }
    );
  }
}
