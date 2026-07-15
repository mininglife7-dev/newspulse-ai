import { NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase-server';
import { resolveContext, contextError } from '@/lib/api-context';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/workspace/members — list active workspace members
 */
export async function GET(req: Request) {
  const supabase = createRouteClient();
  const ctx = await resolveContext(supabase);
  if (ctx.status !== 200) {
    return contextError(ctx);
  }

  try {
    const { data, error } = await supabase
      .from('workspace_members')
      .select('user_id, email, profiles(first_name, last_name)')
      .eq('workspace_id', ctx.workspaceId)
      .eq('status', 'active')
      .order('email', { ascending: true });

    if (error) {
      console.error('[api/workspace/members] list failed:', error);
      return NextResponse.json(
        { ok: false, error: 'Could not load workspace members' },
        { status: 500 }
      );
    }

    // Transform to flatten profile data
    const members = (data ?? []).map((m: any) => ({
      user_id: m.user_id,
      email: m.email,
      first_name: m.profiles?.first_name || null,
      last_name: m.profiles?.last_name || null,
    }));

    return NextResponse.json({ ok: true, members });
  } catch (err: any) {
    console.error('[api/workspace/members] GET failed:', err);
    return NextResponse.json(
      { ok: false, error: 'Failed to list workspace members' },
      { status: 500 }
    );
  }
}
