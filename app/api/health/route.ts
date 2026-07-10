import { NextResponse } from 'next/server';
import type { HealthResponse } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Lightweight health check for monitoring / uptime probes.
 * Reports which integrations have credentials configured (without leaking values).
 *
 * Only load-bearing credentials affect the healthy/degraded verdict.
 * NEXT_PUBLIC_SUPABASE_ANON_KEY is reported informationally: no code path
 * uses it (all DB access is server-side via the service key), so a missing
 * anon key must not raise a false "degraded" alarm.
 */
export async function GET() {
  const checks = {
    firecrawl: Boolean(process.env.FIRECRAWL_API_KEY),
    openai: Boolean(process.env.OPENAI_API_KEY),
    supabase_url: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    supabase_service: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
  };
  const optional = {
    supabase_anon: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  };

  const allOk = Object.values(checks).every(Boolean);

  const body: HealthResponse = {
    ok: allOk,
    status: allOk ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime_s: Math.floor(process.uptime()),
    checks,
    optional,
  };

  return NextResponse.json(body, { status: allOk ? 200 : 503 });
}
