import { NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Next 15 delivers dynamic route params as a Promise.
interface RouteContext {
  params: Promise<{ id: string }>;
}

type WorkspaceContext =
  { status: 200; workspaceId: string } | { status: 401 | 409; error: string };

/**
 * Resolve the caller's active workspace, or explain why not. Runs as the
 * signed-in user, so RLS applies to the delete below (and this scopes the
 * delete to the caller's own workspace as defence in depth).
 */
async function resolveWorkspace(
  supabase: Awaited<ReturnType<typeof createRouteClient>>
): Promise<WorkspaceContext> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: 401, error: 'Authentication required' };

  const { data: membership } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle();

  if (!membership) {
    return {
      status: 409,
      error: 'No workspace yet — complete company setup first',
    };
  }
  return { status: 200, workspaceId: membership.workspace_id as string };
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
  const ctx = await resolveWorkspace(supabase);
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
