import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase-server';
import { logger } from '@/lib/logger';
import { validators, validate } from '@/lib/input-validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface UpdateObligationRequest {
  status?: 'identified' | 'in_progress' | 'completed' | 'not_applicable';
  priority?: 'critical' | 'high' | 'medium' | 'low';
  due_date?: string;
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
    logger.error('Workspace membership lookup failed', 'MEMBERSHIP_LOOKUP_ERROR', memberError);
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
 * PUT /api/obligations/:id — update an obligation's status/priority/due date.
 *
 * Supports partial updates: status, priority, and/or due_date can be updated
 * independently. Triggers in remediation workflow.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json(
      { ok: false, error: 'Obligation ID required' },
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
    status: validators.optional(validators.enum(['identified', 'in_progress', 'completed', 'not_applicable'])),
    priority: validators.optional(validators.enum(['critical', 'high', 'medium', 'low'])),
    due_date: validators.optional(validators.string()),
  });

  if (!validationResult.ok) {
    return NextResponse.json(
      { ok: false, error: 'Invalid input', errors: validationResult.errors },
      { status: 400 }
    );
  }

  const validated = validationResult.value as UpdateObligationRequest;

  const supabase = await createRouteClient();
  const ctx = await resolveContext(supabase);
  if (ctx.status !== 200) {
    return NextResponse.json(
      { ok: false, error: ctx.error },
      { status: ctx.status }
    );
  }

  const updateData: Record<string, unknown> = {};
  if (validated.status !== undefined) {
    updateData.status = validated.status;
  }
  if (validated.priority !== undefined) {
    updateData.priority = validated.priority;
  }
  if (validated.due_date !== undefined) {
    updateData.due_date = validated.due_date;
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json(
      { ok: false, error: 'No fields to update' },
      { status: 400 }
    );
  }

  const { data: obligation, error: obligationError } = await supabase
    .from('obligations')
    .select('id, workspace_id')
    .eq('id', id)
    .eq('workspace_id', ctx.workspaceId)
    .maybeSingle();

  if (obligationError) {
    logger.error('Obligation lookup failed', 'OBLIGATION_LOOKUP_ERROR', obligationError);
    return NextResponse.json(
      { ok: false, error: 'Failed to verify obligation' },
      { status: 500 }
    );
  }

  if (!obligation) {
    return NextResponse.json(
      { ok: false, error: 'Obligation not found' },
      { status: 404 }
    );
  }

  const { data, error } = await supabase
    .from('obligations')
    .update(updateData)
    .eq('id', id)
    .eq('workspace_id', ctx.workspaceId)
    .select('*')
    .single();

  if (error || !data) {
    logger.error('Obligation update failed', 'OBLIGATION_UPDATE_ERROR', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to update obligation' },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, obligation: data });
}
