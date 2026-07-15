import { NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase-server';
import { SYSTEM_TYPES, SYSTEM_STATUSES } from '@/lib/ai-systems';
import { resolveWorkspaceContext } from '@/lib/ai-systems-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface UpdateAiSystemBody {
  name?: string;
  systemType?: string;
  vendor?: string;
  purpose?: string;
  status?: string;
}

// Next 15 delivers dynamic route params as a Promise.
interface RouteContext {
  params: Promise<{ id: string }>;
}

/** DELETE /api/ai-systems/:id — remove a system from the workspace inventory. */
export async function DELETE(_req: Request, { params }: RouteContext) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json(
      { ok: false, error: 'Missing id' },
      { status: 400 }
    );
  }

  const supabase = await createRouteClient();
  const ctx = await resolveWorkspaceContext(supabase);
  if (ctx.status !== 200) {
    return NextResponse.json(
      { ok: false, error: ctx.error },
      { status: ctx.status }
    );
  }

  // Scope the delete to the caller's workspace; RLS enforces the same, so a
  // row belonging to another workspace simply matches nothing. `.select()`
  // returns the rows actually deleted, so we can tell "removed" apart from
  // "nothing matched" instead of reporting a false success.
  const { data, error } = await supabase
    .from('ai_systems')
    .delete()
    .eq('id', id)
    .eq('workspace_id', ctx.workspaceId)
    .select('id');

  if (error) {
    console.error('[api/ai-systems/:id] delete failed:', error);
    return NextResponse.json(
      { ok: false, error: 'Could not delete the AI system' },
      { status: 500 }
    );
  }

  if (!data || data.length === 0) {
    return NextResponse.json(
      { ok: false, error: 'AI system not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true, deleted: id });
}

/** PATCH /api/ai-systems/:id — edit a system in the workspace inventory. */
export async function PATCH(req: Request, { params }: RouteContext) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json(
      { ok: false, error: 'Missing id' },
      { status: 400 }
    );
  }

  let body: UpdateAiSystemBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  // Build the update from only the fields provided; validate enums when present.
  const updates: Record<string, string | null> = {};
  if (body.name !== undefined) {
    const name = body.name.trim();
    if (!name) {
      return NextResponse.json(
        { ok: false, error: 'name cannot be empty' },
        { status: 400 }
      );
    }
    updates.name = name;
  }
  if (body.systemType !== undefined) {
    if (body.systemType && !SYSTEM_TYPES.includes(body.systemType as any)) {
      return NextResponse.json(
        {
          ok: false,
          error: `systemType must be one of: ${SYSTEM_TYPES.join(', ')}`,
        },
        { status: 400 }
      );
    }
    updates.system_type = body.systemType || null;
  }
  if (body.vendor !== undefined) updates.vendor = body.vendor.trim() || null;
  if (body.purpose !== undefined) updates.purpose = body.purpose.trim() || null;
  if (body.status !== undefined) {
    if (!SYSTEM_STATUSES.includes(body.status as any)) {
      return NextResponse.json(
        { ok: false, error: 'status must be active, pilot or deprecated' },
        { status: 400 }
      );
    }
    updates.status = body.status;
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { ok: false, error: 'No fields to update' },
      { status: 400 }
    );
  }
  updates.updated_at = new Date().toISOString();

  const supabase = await createRouteClient();
  const ctx = await resolveWorkspaceContext(supabase);
  if (ctx.status !== 200) {
    return NextResponse.json(
      { ok: false, error: ctx.error },
      { status: ctx.status }
    );
  }

  // Scope to the caller's workspace (RLS enforces the same); `.select()` lets
  // us return 404 when nothing matched rather than a false success.
  const { data, error } = await supabase
    .from('ai_systems')
    .update(updates)
    .eq('id', id)
    .eq('workspace_id', ctx.workspaceId)
    .select(
      'id, name, description, system_type, vendor, purpose, status, created_at'
    );

  if (error) {
    console.error('[api/ai-systems/:id] update failed:', error);
    return NextResponse.json(
      { ok: false, error: 'Could not update the AI system' },
      { status: 500 }
    );
  }
  if (!data || data.length === 0) {
    return NextResponse.json(
      { ok: false, error: 'AI system not found' },
      { status: 404 }
    );
  }
  return NextResponse.json({ ok: true, system: data[0] });
}
