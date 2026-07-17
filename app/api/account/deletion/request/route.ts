import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase-server';
import { createClient } from '@supabase/supabase-js';
import { getClientIp } from '@/lib/audit-logger';

/**
 * POST /api/account/deletion/request
 *
 * GDPR Article 17: Right to Erasure
 *
 * Request account deletion with:
 * 1. Reauthentication (password)
 * 2. Explicit typed confirmation
 * 3. Blocker check (owned workspaces with members)
 * 4. 30-day grace period before hard-delete
 *
 * Requires:
 * - password: string (verified against auth)
 * - confirmationCode: "DELETE_MY_ACCOUNT_PERMANENTLY" (typed confirmation)
 * - reason?: string (optional)
 */

export const dynamic = 'force-dynamic';

interface DeletionRequestBody {
  password: string;
  confirmationCode: string;
  reason?: string;
}

export async function POST(request: NextRequest) {
  const supabase = await createRouteClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    return NextResponse.json(
      { ok: false, error: 'Authentication required' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();

    // Validate input
    if (typeof body !== 'object' || body === null) {
      return NextResponse.json(
        { ok: false, error: 'Invalid request body' },
        { status: 400 }
      );
    }

    const req = body as Partial<DeletionRequestBody>;

    if (!req.password || typeof req.password !== 'string') {
      return NextResponse.json(
        { ok: false, error: 'Missing required field: password' },
        { status: 400 }
      );
    }

    if (!req.confirmationCode || typeof req.confirmationCode !== 'string') {
      return NextResponse.json(
        { ok: false, error: 'Missing required field: confirmationCode' },
        { status: 400 }
      );
    }

    // Explicit typed confirmation (not just a boolean)
    if (req.confirmationCode !== 'DELETE_MY_ACCOUNT_PERMANENTLY') {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Invalid confirmation code. Must be exactly: DELETE_MY_ACCOUNT_PERMANENTLY',
        },
        { status: 400 }
      );
    }

    // Reauthenticate with password
    // Use Supabase admin API to verify password
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || '',
      {
        auth: { persistSession: false },
      }
    );

    // Attempt to sign in with user's email and provided password
    const { data: authData, error: authError } =
      await adminClient.auth.signInWithPassword({
        email: user.email || '',
        password: req.password,
      });

    if (authError || !authData.user) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Password verification failed. Incorrect password.',
        },
        { status: 401 }
      );
    }

    // Check for blockers: user owns workspaces with other members
    const { data: ownedWorkspaces, error: wsError } = await supabase
      .from('workspaces')
      .select(
        `
        id,
        name,
        workspace_members(
          id
        )
      `
      )
      .eq('owner_id', user.id);

    if (wsError) {
      console.error('Error checking workspaces:', wsError);
      return NextResponse.json(
        { ok: false, error: 'Failed to validate deletion request' },
        { status: 500 }
      );
    }

    const blockers: string[] = [];
    const ownedWithMembers = (ownedWorkspaces || []).filter((ws) => {
      const memberCount = (ws.workspace_members?.length as number) || 1;
      if (memberCount > 1) {
        blockers.push(
          `Cannot delete: You own "${ws.name}" with ${memberCount - 1} other member(s).`
        );
        return true;
      }
      return false;
    });

    if (blockers.length > 0) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Cannot delete account while owning workspaces with active members.',
          details: blockers,
          instruction:
            'Transfer ownership or delete these workspaces separately before deleting your account.',
        },
        { status: 403 }
      );
    }

    // Create deletion request with 30-day grace period
    const scheduledAt = new Date();
    scheduledAt.setDate(scheduledAt.getDate() + 30);

    const ipAddress = getClientIp(request);
    const userAgent = request.headers.get('user-agent') || undefined;

    const { data: deletionRequest, error: insertError } = await supabase
      .from('account_deletion_request')
      .insert({
        user_id: user.id,
        requested_at: new Date().toISOString(),
        scheduled_deletion_at: scheduledAt.toISOString(),
        reason: req.reason || 'User requested account deletion',
        status: 'pending',
        ip_address: ipAddress,
        user_agent: userAgent,
        password_verified_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating deletion request:', insertError);
      return NextResponse.json(
        { ok: false, error: 'Failed to process deletion request' },
        { status: 500 }
      );
    }

    // Log to audit trail
    await supabase.from('audit_log').insert({
      workspace_id: null, // User-level action, not workspace-specific
      user_id: user.id,
      action: 'delete',
      resource_type: 'account_deletion_request',
      resource_id: deletionRequest.id,
      details: {
        gdpr_article: '17',
        reason: req.reason || 'User requested account deletion',
        scheduled_deletion_at: deletionRequest.scheduled_deletion_at,
      },
      ip_address: ipAddress,
      user_agent: userAgent,
    });

    return NextResponse.json({
      ok: true,
      message: 'Account deletion scheduled',
      deletion_request: {
        id: deletionRequest.id,
        requested_at: deletionRequest.requested_at,
        scheduled_deletion_at: deletionRequest.scheduled_deletion_at,
        grace_period_days: 30,
        status: deletionRequest.status,
        can_cancel: true,
        cancellation_instructions:
          'Call POST /api/account/deletion/cancel?id=' +
          deletionRequest.id +
          ' within 30 days to cancel.',
      },
    });
  } catch (error) {
    console.error('Deletion request error:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to process deletion request' },
      { status: 500 }
    );
  }
}
