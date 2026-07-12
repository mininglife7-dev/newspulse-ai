import { NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/evidence/[id]
 * Get a specific evidence record
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

  // Get evidence
  const { data: evidence, error } = await supabase
    .from('evidence')
    .select(
      `id, company_id, obligation_id, title, description, file_type, file_size,
       status, uploaded_by, created_at, updated_at,
       obligations(id, title, status)`
    )
    .eq('id', id)
    .eq('workspace_id', membership.workspace_id)
    .maybeSingle();

  if (error) {
    console.error('[api/evidence/[id]] get failed:', error);
    return NextResponse.json(
      { ok: false, error: 'Could not load evidence' },
      { status: 500 }
    );
  }

  if (!evidence) {
    return NextResponse.json({ ok: false, error: 'Evidence not found' }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    evidence,
  });
}

/**
 * PATCH /api/evidence/[id]
 * Update evidence record (status, description, obligation_id)
 *
 * Request body:
 * {
 *   "status": "submitted|under_review|approved|rejected" (optional),
 *   "description": "string" (optional),
 *   "obligation_id": "uuid" (optional)
 * }
 */
export async function PATCH(req: Request, context: RouteContext) {
  const { params: paramsPromise } = context;
  const { id } = await paramsPromise;

  let body: {
    status?: string;
    description?: string;
    obligation_id?: string;
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

  // Verify evidence exists and user has access
  const { data: evidence } = await supabase
    .from('evidence')
    .select('id, company_id')
    .eq('id', id)
    .eq('workspace_id', membership.workspace_id)
    .maybeSingle();

  if (!evidence) {
    return NextResponse.json({ ok: false, error: 'Evidence not found' }, { status: 404 });
  }

  // If obligation_id is being updated, verify it exists in the same company
  if (body.obligation_id !== undefined && body.obligation_id !== null) {
    const { data: obligation } = await supabase
      .from('obligations')
      .select('id')
      .eq('id', body.obligation_id)
      .eq('company_id', evidence.company_id)
      .maybeSingle();

    if (!obligation) {
      return NextResponse.json(
        { ok: false, error: 'Obligation not found or not in this company' },
        { status: 404 }
      );
    }
  }

  // Update evidence
  const updateData: Record<string, unknown> = {};
  if (body.status !== undefined) updateData.status = body.status;
  if (body.description !== undefined) updateData.description = body.description;
  if (body.obligation_id !== undefined) updateData.obligation_id = body.obligation_id;
  updateData.updated_at = new Date().toISOString();

  const { data: updated, error: updateError } = await supabase
    .from('evidence')
    .update(updateData)
    .eq('id', id)
    .select();

  if (updateError || !updated || updated.length === 0) {
    console.error('[api/evidence/[id]] update failed:', updateError);
    return NextResponse.json(
      { ok: false, error: 'Could not update evidence' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    evidence: updated[0],
  });
}

/**
 * DELETE /api/evidence/[id]
 * Delete an evidence record
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

  // Verify evidence exists and user has access
  const { data: evidence } = await supabase
    .from('evidence')
    .select('id')
    .eq('id', id)
    .eq('workspace_id', membership.workspace_id)
    .maybeSingle();

  if (!evidence) {
    return NextResponse.json({ ok: false, error: 'Evidence not found' }, { status: 404 });
  }

  // Delete evidence
  const { error: deleteError } = await supabase
    .from('evidence')
    .delete()
    .eq('id', id);

  if (deleteError) {
    console.error('[api/evidence/[id]] delete failed:', deleteError);
    return NextResponse.json(
      { ok: false, error: 'Could not delete evidence' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    message: 'Evidence deleted successfully',
  });
}
