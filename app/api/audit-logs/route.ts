import { NextResponse, NextRequest } from 'next/server';
import { createRouteClient } from '@/lib/supabase-server';
import { resolveContext, contextError } from '@/lib/api-context';
import { apiLimiter } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/audit-logs
 * Fetch audit logs for the current workspace
 * Query params:
 *   - type: 'logs' (default), 'summary', or 'critical'
 *   - action: Filter by audit action
 *   - severity: Filter by severity (info, warning, critical)
 *   - user_id: Filter by user
 *   - limit: Number of results (default: 50, max: 500)
 *   - offset: Pagination offset (default: 0)
 *   - days: For summary, number of days to analyze (default: 30)
 */
export async function GET(req: NextRequest) {
  // Rate limit API operations (60 per minute per IP)
  const rateLimitResponse = await apiLimiter(req);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') || 'logs';

  const supabase = createRouteClient();
  const ctx = await resolveContext(supabase);
  if (ctx.status !== 200) {
    return contextError(ctx);
  }

  const workspaceId = ctx.workspaceId!; // Safe: guaranteed to exist when status === 200

  // Route based on type
  if (type === 'summary') {
    return getAuditSummary(req, supabase, workspaceId);
  }

  if (type === 'critical') {
    return getCriticalEvents(req, supabase, workspaceId);
  }

  // Default: list logs
  return getAuditLogs(req, supabase, workspaceId);
}

async function getAuditLogs(
  req: NextRequest,
  supabase: ReturnType<typeof createRouteClient>,
  workspaceId: string
) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');
  const severity = searchParams.get('severity');
  const userId = searchParams.get('user_id');
  const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 500);
  const offset = parseInt(searchParams.get('offset') || '0', 10);

  try {
    let query = supabase
      .from('audit_logs')
      .select(
        'id, user_id, action, severity, resource_type, resource_id, status, error_message, created_at',
        { count: 'exact' }
      )
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    // Apply filters
    if (action) {
      query = query.eq('action', action);
    }

    if (severity) {
      const validSeverities = ['info', 'warning', 'critical'];
      if (validSeverities.includes(severity)) {
        query = query.eq('severity', severity);
      }
    }

    if (userId) {
      query = query.eq('user_id', userId);
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: logs, error: logsError, count } = await query;

    if (logsError) {
      console.error('[api/audit-logs] query failed:', logsError);
      return NextResponse.json(
        { ok: false, error: 'Could not load audit logs' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      logs: logs ?? [],
      count,
      limit,
      offset,
    });
  } catch (err: any) {
    console.error('[api/audit-logs] GET failed:', err);
    return NextResponse.json(
      { ok: false, error: 'Failed to load audit logs' },
      { status: 500 }
    );
  }
}

async function getAuditSummary(
  req: NextRequest,
  supabase: ReturnType<typeof createRouteClient>,
  workspaceId: string
) {
  const { searchParams } = new URL(req.url);
  const days = Math.min(parseInt(searchParams.get('days') || '30', 10), 365);

  try {
    const { data, error } = await supabase.rpc('get_audit_summary', {
      p_workspace_id: workspaceId,
      p_days: days,
    });

    if (error) {
      console.error('[api/audit-logs] summary failed:', error);
      return NextResponse.json(
        { ok: false, error: 'Could not load audit summary' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      summary: data?.[0] || null,
    });
  } catch (err: any) {
    console.error('[api/audit-logs] summary failed:', err);
    return NextResponse.json(
      { ok: false, error: 'Failed to load audit summary' },
      { status: 500 }
    );
  }
}

async function getCriticalEvents(
  req: NextRequest,
  supabase: ReturnType<typeof createRouteClient>,
  workspaceId: string
) {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200);

  try {
    const { data, error } = await supabase.rpc('get_critical_events', {
      p_workspace_id: workspaceId,
      p_limit: limit,
    });

    if (error) {
      console.error('[api/audit-logs] critical events failed:', error);
      return NextResponse.json(
        { ok: false, error: 'Could not load critical events' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      events: data ?? [],
      count: (data as any[])?.length || 0,
    });
  } catch (err: any) {
    console.error('[api/audit-logs] critical events failed:', err);
    return NextResponse.json(
      { ok: false, error: 'Failed to load critical events' },
      { status: 500 }
    );
  }
}
