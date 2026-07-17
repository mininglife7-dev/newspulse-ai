import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase-server';
import { logger } from '@/lib/logger';
import { validators, validate } from '@/lib/input-validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface UpdateEvidenceRequest {
  title?: string;
  description?: string;
  status?: 'submitted' | 'approved' | 'rejected';
}

interface RouteContext {
  status: number;
  workspaceId?: string;
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
    .select('workspace_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle();

  if (memberError) {
    logger.error(
      'Workspace membership lookup failed',
      'MEMBERSHIP_LOOKUP_ERROR',
      memberError
    );
    return { status: 500, error: 'Membership lookup failed' };
  }

  if (!membership) {
    return { status: 403, error: 'Not a workspace member' };
  }

  return {
    status: 200,
    workspaceId: membership.workspace_id as string,
  };
}

/**
 * PUT /api/evidence/:id — update evidence title/description/status.
 *
 * Supports partial updates: title, description, and/or status can be changed independently.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json(
      { ok: false, error: 'Evidence ID required' },
      { status: 400 }
    );
  }

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
    title: validators.optional(validators.string({ minLength: 1 })),
    description: validators.optional(validators.string()),
    status: validators.optional(
      validators.enum(['submitted', 'approved', 'rejected'])
    ),
  });

  if (!validationResult.ok) {
    return NextResponse.json(
      { ok: false, error: 'Invalid input', errors: validationResult.errors },
      { status: 400 }
    );
  }

  const validated = validationResult.value as UpdateEvidenceRequest;

  const supabase = await createRouteClient();
  const ctx = await resolveContext(supabase);
  if (ctx.status !== 200) {
    return NextResponse.json(
      { ok: false, error: ctx.error },
      { status: ctx.status }
    );
  }

  const updateData: Record<string, unknown> = {};
  if (validated.title) {
    updateData.title = validated.title.trim();
  }
  if (validated.description) {
    updateData.description = validated.description.trim();
  }
  if (validated.status) {
    updateData.status = validated.status;
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json(
      { ok: false, error: 'No fields to update' },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from('evidence')
    .update(updateData)
    .eq('id', id)
    .eq('workspace_id', ctx.workspaceId)
    .select('*')
    .maybeSingle();

  if (error) {
    logger.error('Evidence update failed', 'EVIDENCE_UPDATE_ERROR', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to update evidence' },
      { status: 500 }
    );
  }

  if (!data) {
    return NextResponse.json(
      { ok: false, error: 'Evidence not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true, evidence: data });
}

/**
 * DELETE /api/evidence/:id — delete an evidence record (soft or hard delete).
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json(
      { ok: false, error: 'Evidence ID required' },
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

  const { error } = await supabase
    .from('evidence')
    .delete()
    .eq('id', id)
    .eq('workspace_id', ctx.workspaceId);

  if (error) {
    logger.error('Evidence deletion failed', 'EVIDENCE_DELETE_ERROR', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to delete evidence' },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
