import { NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase-server';
import { getDashboardMetrics } from '@/lib/dashboard-metrics';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

export async function GET(req: Request) {
  const supabase = createRouteClient();
  const ctx = await resolveContext(supabase);
  if (ctx.status !== 200) {
    return NextResponse.json(
      { ok: false, error: ctx.error },
      { status: ctx.status }
    );
  }

  try {
    const metrics = await getDashboardMetrics(supabase, ctx.workspaceId);

    return NextResponse.json({
      ok: true,
      metrics,
    });
  } catch (err) {
    console.error('[api/dashboard-metrics] error:', err);
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch dashboard metrics' },
      { status: 500 }
    );
  }
}
