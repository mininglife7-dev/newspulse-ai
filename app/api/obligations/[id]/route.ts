import { NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/obligations/[id]
 * Get a specific obligation
 */
export async function GET(req: Request, context: RouteContext) {
  const { params: paramsPromise } = context;
  const { id } = await paramsPromise;
  const supabase = await createRouteClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: 'Authentication required' }, { status: 401 });
  }

  // Get user's workspace
  const { data: membership } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle();

  if (!membership) {
    return NextResponse.json(
      { ok: false, error: 'No workspace found' },
      { status: 409 }
    );
  }

  // Get obligation
  const { data: obligation, error } = await supabase
    .from('obligations')
    .select('*')
    .eq('id', id)
    .eq('workspace_id', membership.workspace_id)
    .maybeSingle();

  if (error) {
    console.error('[api/obligations/[id]] get failed:', error);
    return NextResponse.json(
      { ok: false, error: 'Could not load obligation' },
      { status: 500 }
    );
  }

  if (!obligation) {
    return NextResponse.json({ ok: false, error: 'Obligation not found' }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    obligation,
  });
}

/**
 * PATCH /api/obligations/[id]
 * Update an obligation
 *
 * Request body:
 * {
 *   "title": "string" (optional),
 *   "description": "string" (optional),
 *   "status": "identified|in_progress|completed|not_applicable" (optional),
 *   "priority": "critical|high|medium|low" (optional),
 *   "due_date": "YYYY-MM-DD" (optional)
 * }
 */
export async function PATCH(req: Request, context: RouteContext) {
  const { params: paramsPromise } = context;
  const { id } = await paramsPromise;

  let body: {
    title?: string;
    description?: string;
    status?: string;
    priority?: string;
    due_date?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  // Authenticate
  const supabase = await createRouteClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: 'Authentication required' }, { status: 401 });
  }

  // Get user's workspace
  const { data: membership } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle();

  if (!membership) {
    return NextResponse.json(
      { ok: false, error: 'No workspace found' },
      { status: 409 }
    );
  }

  // Verify obligation exists and user has access
  const { data: obligation } = await supabase
    .from('obligations')
    .select('id')
    .eq('id', id)
    .eq('workspace_id', membership.workspace_id)
    .maybeSingle();

  if (!obligation) {
    return NextResponse.json({ ok: false, error: 'Obligation not found' }, { status: 404 });
  }

  // Update obligation
  const updateData: Record<string, unknown> = {};
  if (body.title !== undefined) updateData.title = body.title;
  if (body.description !== undefined) updateData.description = body.description;
  if (body.status !== undefined) updateData.status = body.status;
  if (body.priority !== undefined) updateData.priority = body.priority;
  if (body.due_date !== undefined) updateData.due_date = body.due_date;
  updateData.updated_at = new Date().toISOString();

  const { data: updated, error: updateError } = await supabase
    .from('obligations')
    .update(updateData)
    .eq('id', id)
    .select();

  if (updateError || !updated || updated.length === 0) {
    console.error('[api/obligations/[id]] update failed:', updateError);
    return NextResponse.json(
      { ok: false, error: 'Could not update obligation' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    obligation: updated[0],
  });
}

/**
 * DELETE /api/obligations/[id]
 * Delete an obligation
 */
export async function DELETE(req: Request, context: RouteContext) {
  const { params: paramsPromise } = context;
  const { id } = await paramsPromise;

  const supabase = await createRouteClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: 'Authentication required' }, { status: 401 });
  }

  // Get user's workspace
  const { data: membership } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle();

  if (!membership) {
    return NextResponse.json(
      { ok: false, error: 'No workspace found' },
      { status: 409 }
    );
  }

  // Verify obligation exists and user has access
  const { data: obligation } = await supabase
    .from('obligations')
    .select('id')
    .eq('id', id)
    .eq('workspace_id', membership.workspace_id)
    .maybeSingle();

  if (!obligation) {
    return NextResponse.json({ ok: false, error: 'Obligation not found' }, { status: 404 });
  }

  // Delete obligation
  const { error: deleteError } = await supabase
    .from('obligations')
    .delete()
    .eq('id', id);

  if (deleteError) {
    console.error('[api/obligations/[id]] delete failed:', deleteError);
    return NextResponse.json(
      { ok: false, error: 'Could not delete obligation' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    message: 'Obligation deleted successfully',
  });
}
