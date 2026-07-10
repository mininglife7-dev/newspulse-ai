import { NextResponse } from 'next/server';
import { cacheHeaders } from '@/lib/cache-control';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const allOk =
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) &&
    Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

  return NextResponse.json(
    {
      ok: allOk,
      status: allOk ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime_s: typeof process !== 'undefined' ? Math.floor(process.uptime()) : null,
    },
    {
      status: allOk ? 200 : 503,
      headers: cacheHeaders.short,
    }
  );
}
