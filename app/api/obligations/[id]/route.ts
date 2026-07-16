import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

async function resolveContext(
  supabase: Awaited<ReturnType<typeof createRouteClient>>
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: 401 as const, error: 'Authentication required' };

  const { data: membership } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle();

  if (!membership) {
    return { status: 401 as const, error: 'Not a workspace member' };
  }

  return {
    status: 200 as const,
    workspaceId: membership.workspace_id as string,
  };
}

/**
 * PUT /api/obligations/:id — update an obligation's status/priority/due date.
 *
 * The remediation workflow calls this dynamic path. The handler previously
 * lived on the collection route with `pathname.split('/').pop()` id extraction
 * (which yields the literal "obligations"), so every status change 404'd. Now
 * at the correct segment with async params (Next 15+).
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

  let body: { status?: string; priority?: string; due_date?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Invalid JSON body' },
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

  const updateData: Record<string, unknown> = {};
  if (body.status !== undefined) {
    const valid = ['identified', 'in_progress', 'completed', 'not_applicable'];
    if (!valid.includes(body.status)) {
      return NextResponse.json(
        {
          ok: false,
          error: `Invalid status. Must be one of: ${valid.join(', ')}`,
        },
        { status: 400 }
      );
    }
    updateData.status = body.status;
  }
  if (body.priority !== undefined) {
    const valid = ['critical', 'high', 'medium', 'low'];
    if (!valid.includes(body.priority)) {
      return NextResponse.json(
        {
          ok: false,
          error: `Invalid priority. Must be one of: ${valid.join(', ')}`,
        },
        { status: 400 }
      );
    }
    updateData.priority = body.priority;
  }
  if (body.due_date !== undefined) {
    updateData.due_date = body.due_date;
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json(
      { ok: false, error: 'No fields to update' },
      { status: 400 }
    );
  }

  const { data: obligation } = await supabase
    .from('obligations')
    .select('id, workspace_id')
    .eq('id', id)
    .eq('workspace_id', ctx.workspaceId)
    .maybeSingle();

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
    console.error('[api/obligations/:id] update failed:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to update obligation' },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, obligation: data });
}
