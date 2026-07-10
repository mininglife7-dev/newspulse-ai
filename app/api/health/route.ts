import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { isDurable } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Health check for monitoring / uptime probes.
 *
 * Reports three distinct dependency states — "ok", "degraded", "unavailable" —
 * so a monitor can tell "everything works" from "the app is up but the database
 * is unreachable". Also surfaces whether rate limiting is durable, so we never
 * misrepresent spend protection. Never leaks secret values.
 *
 * HTTP 200 = healthy, 503 = degraded/unavailable (so uptime monitors alert).
 */

type DepState = 'ok' | 'degraded' | 'unavailable' | 'not_configured';

async function probeSupabase(): Promise<DepState> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    return 'not_configured';
  }
  try {
    // Cheap connectivity check: a HEAD count that touches the table.
    const { error } = await getSupabaseAdmin()
      .from('news_searches')
      .select('id', { count: 'exact', head: true });
    return error ? 'degraded' : 'ok';
  } catch {
    return 'unavailable';
  }
}

export async function GET() {
  const configured = {
    firecrawl: Boolean(process.env.FIRECRAWL_API_KEY),
    openai: Boolean(process.env.OPENAI_API_KEY),
    supabase_url: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    supabase_anon: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    supabase_service: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
  };

  const supabaseState = await probeSupabase();

  const allConfigured = Object.values(configured).every(Boolean);
  const dbHealthy = supabaseState === 'ok' || supabaseState === 'not_configured';
  const healthy = allConfigured && supabaseState === 'ok';

  return NextResponse.json(
    {
      ok: healthy,
      status: healthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime_s:
        typeof process !== 'undefined' ? Math.floor(process.uptime()) : null,
      checks: {
        ...configured,
        supabase_connectivity: supabaseState,
      },
      rate_limiting: {
        durable: isDurable(),
        backend: isDurable() ? 'upstash-redis' : 'in-memory',
      },
    },
    { status: healthy ? 200 : 503 }
  );
}
