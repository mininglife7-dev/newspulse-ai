import { NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Resolve the caller's active workspace.
 */
async function resolveContext(supabase: ReturnType<typeof createRouteClient>) {
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
    return {
      status: 409 as const,
      error: 'No workspace yet — complete company setup first',
    };
  }

  return {
    status: 200 as const,
    workspaceId: membership.workspace_id as string,
  };
}

/** GET /api/audit-log — fetch audit log entries for workspace */
export async function GET(req: Request) {
  const supabase = createRouteClient();
  const ctx = await resolveContext(supabase);
  if (ctx.status !== 200) {
    return NextResponse.json(
      { ok: false, error: ctx.error },
      { status: ctx.status }
    );
  }

  // Parse query parameters
  const url = new URL(req.url);
  const actionType = url.searchParams.get('action_type');
  const entityType = url.searchParams.get('entity_type');
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
  const offset = parseInt(url.searchParams.get('offset') || '0');

  try {
    let query = supabase
      .from('audit_log')
      .select('*, auth.users(email)')
      .eq('workspace_id', ctx.workspaceId);

    if (actionType) {
      query = query.eq('action_type', actionType);
    }

    if (entityType) {
      query = query.eq('entity_type', entityType);
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('[api/audit-log] fetch failed:', error);
      return NextResponse.json(
        { ok: false, error: 'Could not load audit log' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      entries: data || [],
      total: count || 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error('[api/audit-log] error:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch audit log' },
      { status: 500 }
    );
  }
}
