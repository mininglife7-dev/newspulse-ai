import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Lightweight health check for monitoring / uptime probes.
 * Reports which integrations have credentials configured (without leaking values).
 */
export async function GET() {
  const checks = {
    firecrawl: Boolean(process.env.FIRECRAWL_API_KEY),
    openai: Boolean(process.env.OPENAI_API_KEY),
    supabase_url: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    supabase_anon: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    supabase_service: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
  };

  const allOk = Object.values(checks).every(Boolean);

  return NextResponse.json(
    {
      ok: allOk,
      status: allOk ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime_s: typeof process !== 'undefined' ? Math.floor(process.uptime()) : null,
      checks,
    },
    { status: allOk ? 200 : 503 }
  );
}
