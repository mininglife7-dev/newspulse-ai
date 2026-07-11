import { NextRequest, NextResponse } from 'next/server';
import { withLogging } from '@/lib/middleware-logging';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  return withLogging(
    request,
    async () => {
      const checks = {
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
    },
    {
      endpoint: '/api/health',
      method: 'GET',
    }
  );
}
