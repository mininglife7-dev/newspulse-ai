import { NextResponse, NextRequest } from 'next/server';
import { createRouteClient } from '@/lib/supabase-server';
import { resolveContext, contextError } from '@/lib/api-context';
import { apiLimiter } from '@/lib/rate-limit';
import { getRequestLogs, getRequestStats } from '@/lib/request-logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/request-logs
 * Fetch request performance logs for monitoring
 * Query params:
 *   - type: 'logs' (default), 'stats', or 'slow'
 *   - path: Filter by path (substring match)
 *   - minLatencyMs: Filter by minimum latency (for 'slow' type)
 *   - limit: Number of results (default: 50, max: 200)
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

  // Route based on type
  if (type === 'stats') {
    return getRequestStatsEndpoint();
  }

  if (type === 'slow') {
    return getSlowRequests(req);
  }

  // Default: list recent logs
  return getRecentLogs(req);
}

function getRecentLogs(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const path = searchParams.get('path');
  const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200);

  try {
    const logs = getRequestLogs({
      path: path || undefined,
      limit,
    });

    return NextResponse.json({
      ok: true,
      logs,
      count: logs.length,
    });
  } catch (err: any) {
    console.error('[api/request-logs] GET failed:', err);
    return NextResponse.json(
      { ok: false, error: 'Failed to load request logs' },
      { status: 500 }
    );
  }
}

function getSlowRequests(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const minLatencyMs = parseInt(searchParams.get('minLatencyMs') || '1000', 10);
  const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200);

  try {
    const logs = getRequestLogs({
      minLatencyMs,
      limit,
    });

    return NextResponse.json({
      ok: true,
      logs,
      count: logs.length,
      threshold: minLatencyMs,
    });
  } catch (err: any) {
    console.error('[api/request-logs] slow requests failed:', err);
    return NextResponse.json(
      { ok: false, error: 'Failed to load slow requests' },
      { status: 500 }
    );
  }
}

function getRequestStatsEndpoint() {
  try {
    const stats = getRequestStats();

    return NextResponse.json({
      ok: true,
      stats,
    });
  } catch (err: any) {
    console.error('[api/request-logs] stats failed:', err);
    return NextResponse.json(
      { ok: false, error: 'Failed to load request stats' },
      { status: 500 }
    );
  }
}
