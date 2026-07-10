import { NextResponse } from 'next/server';
import { isDurable } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const checks = {
    firecrawl: !!process.env.FIRECRAWL_API_KEY,
    openai: !!process.env.OPENAI_API_KEY,
    supabase_url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabase_anon: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    supabase_service: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  };

  const allHealthy = Object.values(checks).every((v) => v);
  const timestamp = new Date().toISOString();

  return NextResponse.json(
    {
      ok: allHealthy,
      status: allHealthy ? 'healthy' : 'degraded',
      checks,
      // Honest spend-protection posture: durable only when a shared store
      // (Upstash) backs rate limiting; otherwise per-instance in-memory.
      rate_limiting: {
        durable: isDurable(),
        backend: isDurable() ? 'upstash-redis' : 'in-memory',
      },
      timestamp,
    },
    { status: allHealthy ? 200 : 503 }
  );
}
