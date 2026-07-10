import { NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase-server';
import { checkAndNotifyDeadlines } from '@/lib/deadline-notifications';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/notifications/check-deadlines
 *
 * Checks for upcoming deadlines across all workspaces and creates notifications.
 * Protected by ADMIN_TOKEN environment variable for cron security.
 *
 * Usage: Call daily or twice-daily via cron service (e.g., EasyCron, GitHub Actions)
 * curl -H "Authorization: Bearer $ADMIN_TOKEN" https://your-domain.com/api/notifications/check-deadlines
 */
export async function GET(req: Request) {
  // Security: require ADMIN_TOKEN for cron access
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  const adminToken = process.env.ADMIN_TOKEN;

  if (!adminToken || token !== adminToken) {
    return NextResponse.json(
      { ok: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const supabase = createRouteClient();

  try {
    // Get all active workspaces
    const { data: workspaces, error: workspaceError } = await supabase
      .from('workspaces')
      .select('id')
      .eq('status', 'active');

    if (workspaceError) {
      console.error('[api/notifications/check-deadlines] workspace fetch failed:', workspaceError);
      return NextResponse.json(
        { ok: false, error: 'Failed to fetch workspaces' },
        { status: 500 }
      );
    }

    if (!workspaces || workspaces.length === 0) {
      return NextResponse.json({
        ok: true,
        message: 'No active workspaces found',
        results: [],
      });
    }

    // Check deadlines for each workspace
    const results = [];
    for (const workspace of workspaces) {
      try {
        const result = await checkAndNotifyDeadlines(supabase, workspace.id);
        results.push({
          workspace_id: workspace.id,
          ...result,
        });
      } catch (err) {
        console.error(`[api/notifications/check-deadlines] error for workspace ${workspace.id}:`, err);
        results.push({
          workspace_id: workspace.id,
          error: (err as any).message || 'Unknown error',
        });
      }
    }

    return NextResponse.json({
      ok: true,
      message: 'Deadline check completed',
      results,
    });
  } catch (err) {
    console.error('[api/notifications/check-deadlines] error:', err);
    return NextResponse.json(
      { ok: false, error: 'Failed to check deadlines' },
      { status: 500 }
    );
  }
}
