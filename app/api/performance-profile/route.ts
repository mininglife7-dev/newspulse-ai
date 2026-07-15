import { NextResponse, NextRequest } from 'next/server';
import { createRouteClient } from '@/lib/supabase-server';
import { resolveContext, contextError } from '@/lib/api-context';
import { apiLimiter } from '@/lib/rate-limit';
import {
  getPerformanceStats,
  getProfile,
  getProfileMetricsBreakdown,
  getProfilerState,
} from '@/lib/performance-profiler';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/performance-profile
 * Fetch performance profiling data for debugging and optimization
 * Query params:
 *   - type: 'stats' (default), 'profile', or 'state'
 *   - requestId: For 'profile' type, the request ID to analyze
 *   - endpoint: Filter stats by endpoint
 *   - minDurationMs: Filter slow requests (for stats)
 *   - limit: Number of results (default: 50, max: 200)
 */
export async function GET(req: NextRequest) {
  // Rate limit API operations (60 per minute per IP)
  const rateLimitResponse = await apiLimiter(req);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') || 'stats';

  const supabase = createRouteClient();
  const ctx = await resolveContext(supabase);
  if (ctx.status !== 200) {
    return contextError(ctx);
  }

  // Route based on type
  if (type === 'profile') {
    return getProfileEndpoint(req);
  }

  if (type === 'state') {
    return getProfilerStateEndpoint();
  }

  // Default: get statistics
  return getStatsEndpoint(req);
}

function getStatsEndpoint(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const endpoint = searchParams.get('endpoint');
  const minDurationMs = searchParams.get('minDurationMs')
    ? parseInt(searchParams.get('minDurationMs')!, 10)
    : undefined;
  const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200);

  try {
    const stats = getPerformanceStats({
      endpoint: endpoint || undefined,
      minDurationMs,
      limit,
    });

    return NextResponse.json({
      ok: true,
      stats,
    });
  } catch (err: any) {
    console.error('[api/performance-profile] stats failed:', err);
    return NextResponse.json(
      { ok: false, error: 'Failed to get performance stats' },
      { status: 500 }
    );
  }
}

function getProfileEndpoint(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const requestId = searchParams.get('requestId');

  if (!requestId) {
    return NextResponse.json(
      { ok: false, error: 'requestId parameter required' },
      { status: 400 }
    );
  }

  try {
    const profile = getProfile(requestId);
    if (!profile) {
      return NextResponse.json(
        { ok: false, error: 'Profile not found' },
        { status: 404 }
      );
    }

    const breakdown = getProfileMetricsBreakdown(requestId);

    return NextResponse.json({
      ok: true,
      profile,
      breakdown,
    });
  } catch (err: any) {
    console.error('[api/performance-profile] profile lookup failed:', err);
    return NextResponse.json(
      { ok: false, error: 'Failed to get profile' },
      { status: 500 }
    );
  }
}

function getProfilerStateEndpoint() {
  try {
    const state = getProfilerState();

    return NextResponse.json({
      ok: true,
      state,
    });
  } catch (err: any) {
    console.error('[api/performance-profile] state failed:', err);
    return NextResponse.json(
      { ok: false, error: 'Failed to get profiler state' },
      { status: 500 }
    );
  }
}
