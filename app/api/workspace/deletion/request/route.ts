import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase-server';
import { createClient } from '@supabase/supabase-js';
import { getClientIp } from '@/lib/audit-logger';

/**
 * POST /api/workspace/deletion/request
 *
 * GDPR Articles 5(1)(e), 17: Request workspace deletion with 30-day grace period
 * Requires: owner role, password reauthentication, explicit typed confirmation
 *
 * Request body:
 * {
 *   password: string,
 *   confirmationCode: "DELETE_WORKSPACE_<workspace_id>" (typed confirmation),
 *   workspaceId: string,
 *   reason?: string
 * }
 */

export const dynamic = 'force-dynamic';

interface WorkspaceDeletionRequest {
  workspaceId: string;
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

    if (typeof body !== 'object' || body === null) {
      return NextResponse.json(
        { ok: false, error: 'Invalid request body' },
        { status: 400 }
      );
    }

    const req = body as Partial<WorkspaceDeletionRequest>;

    // Validate required fields
    if (!req.workspaceId || typeof req.workspaceId !== 'string') {
      return NextResponse.json(
        { ok: false, error: 'Missing required field: workspaceId' },
        { status: 400 }
      );
    }

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

    // Verify workspace exists and user is owner
    const { data: workspace, error: wsError } = await supabase
      .from('workspaces')
      .select('id, name, owner_id')
      .eq('id', req.workspaceId)
      .maybeSingle();

    if (wsError || !workspace) {
      return NextResponse.json(
        { ok: false, error: 'Workspace not found' },
        { status: 404 }
      );
    }

    if (workspace.owner_id !== user.id) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Only workspace owner can request workspace deletion',
        },
        { status: 403 }
      );
    }

    // Verify typed confirmation (workspace-specific)
    const expectedConfirmation = `DELETE_WORKSPACE_${req.workspaceId.toUpperCase()}`;
    if (req.confirmationCode !== expectedConfirmation) {
      return NextResponse.json(
        {
          ok: false,
          error: `Invalid confirmation code. Must be exactly: ${expectedConfirmation}`,
        },
        { status: 400 }
      );
    }

    // Reauthenticate with password
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || '',
      {
        auth: { persistSession: false },
      }
    );

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

    // Check legal-hold and retention
    // TODO: Implement legal-hold checks if applicable for your domain

    // Create workspace_deletion_request with 30-day grace period
    const scheduledAt = new Date();
    scheduledAt.setDate(scheduledAt.getDate() + 30);

    const ipAddress = getClientIp(request);
    const userAgent = request.headers.get('user-agent') || undefined;

    const { data: deletionRequest, error: insertError } = await supabase
      .from('workspace_deletion_request')
      .insert({
        workspace_id: req.workspaceId,
        requested_by: user.id,
        requested_at: new Date().toISOString(),
        scheduled_deletion_at: scheduledAt.toISOString(),
        reason: req.reason || 'Workspace owner requested deletion',
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
      workspace_id: req.workspaceId,
      user_id: user.id,
      action: 'delete',
      resource_type: 'workspace_deletion_request',
      resource_id: deletionRequest.id,
      details: {
        workspace_name: workspace.name,
        gdpr_article: '5(1)(e), 17',
        reason: req.reason || 'Workspace owner requested deletion',
        scheduled_deletion_at: deletionRequest.scheduled_deletion_at,
      },
      ip_address: ipAddress,
      user_agent: userAgent,
    });

    return NextResponse.json({
      ok: true,
      message: 'Workspace deletion scheduled',
      deletion_request: {
        id: deletionRequest.id,
        requested_at: deletionRequest.requested_at,
        scheduled_deletion_at: deletionRequest.scheduled_deletion_at,
        grace_period_days: 30,
        status: deletionRequest.status,
        can_cancel: true,
        cancellation_instructions:
          'Call POST /api/workspace/deletion/cancel?id=' +
          deletionRequest.id +
          ' within 30 days to cancel.',
      },
    });
  } catch (error) {
    console.error('Workspace deletion request error:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to process deletion request' },
      { status: 500 }
    );
  }
}
