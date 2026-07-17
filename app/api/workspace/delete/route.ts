import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase-server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { logDelete, getClientIp } from '@/lib/audit-logger';
import { validators, validate } from '@/lib/input-validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface DeleteWorkspaceRequest {
  workspaceId: string;
  confirmDelete?: boolean;
}

/**
 * POST /api/workspace/delete — delete a workspace and all associated data.
 *
 * Workspace owner only. Two-step process:
 * 1. GET to request deletion (returns confirmation prompt)
 * 2. POST with confirmDelete: true to execute deletion
 *
 * Deletion is permanent and cascades to:
 * - All workspace members
 * - All AI systems
 * - All assessments and obligations
 * - All evidence
 * - Company profile
 * - Audit logs for this workspace
 *
 * Executed with service-role (admin) because RLS policies block deletion
 * from authenticated context. Full audit trail logged before deletion.
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  const validationResult = validate(body, {
    workspaceId: validators.string({ minLength: 1 }),
    confirmDelete: validators.optional(validators.boolean()),
  });

  if (!validationResult.ok) {
    return NextResponse.json(
      { ok: false, error: 'Invalid input', errors: validationResult.errors },
      { status: 400 }
    );
  }

  const validated = validationResult.value as DeleteWorkspaceRequest;
  const { workspaceId, confirmDelete } = validated;

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

  // Verify workspace exists and user is owner
  const { data: workspace, error: wsError } = await supabase
    .from('workspaces')
    .select('id, name, owner_id')
    .eq('id', workspaceId)
    .maybeSingle();

  if (wsError) {
    logger.error('Workspace lookup failed', 'WORKSPACE_LOOKUP_ERROR', wsError);
    return NextResponse.json(
      { ok: false, error: 'Failed to verify workspace' },
      { status: 500 }
    );
  }

  if (!workspace) {
    return NextResponse.json(
      { ok: false, error: 'Workspace not found' },
      { status: 404 }
    );
  }

  if (workspace.owner_id !== user.id) {
    return NextResponse.json(
      { ok: false, error: 'Only workspace owner can delete' },
      { status: 403 }
    );
  }

  // First request: return confirmation prompt
  if (!confirmDelete) {
    return NextResponse.json({
      ok: true,
      confirmationRequired: true,
      message: `You are about to permanently delete workspace "${workspace.name}" and all associated data (AI systems, assessments, obligations, evidence, team members). This action cannot be undone.`,
      instruction:
        'Send POST request again with confirmDelete: true to proceed',
    });
  }

  try {
    // Delete using service-role (admin) client to bypass RLS
    // Cascading foreign keys handle related data deletion
    const adminClient = getSupabaseAdmin();

    // Log deletion BEFORE executing it (for audit trail)
    const ipAddress: string | undefined = getClientIp(request);
    const userAgent: string | undefined =
      request.headers.get('user-agent') || undefined;
    await logDelete(
      workspaceId,
      'workspace',
      workspaceId,
      user.id,
      {
        workspaceName: workspace.name,
        reason: 'owner_deletion',
        timestamp: new Date().toISOString(),
      },
      ipAddress,
      userAgent
    );

    // Execute deletion with service-role
    const { error: deleteError } = await adminClient
      .from('workspaces')
      .delete()
      .eq('id', workspaceId);

    if (deleteError) {
      logger.error(
        'Workspace deletion failed',
        'WORKSPACE_DELETE_ERROR',
        deleteError
      );
      return NextResponse.json(
        { ok: false, error: 'Failed to delete workspace' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: 'Workspace permanently deleted',
      workspaceId,
    });
  } catch (err) {
    logger.error(
      'Workspace deletion error',
      'WORKSPACE_DELETE_EXECUTION_ERROR',
      err
    );
    return NextResponse.json(
      { ok: false, error: 'Failed to delete workspace' },
      { status: 500 }
    );
  }
}
