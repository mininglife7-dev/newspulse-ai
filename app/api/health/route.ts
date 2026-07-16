import { NextResponse } from 'next/server';
import { logger } from '@/lib/structured-logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const startTime = Date.now();

  const checks = {
    supabase_url: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    supabase_anon: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    supabase_service: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
  };

  const allOk = Object.values(checks).every(Boolean);
  const duration = Date.now() - startTime;

  if (allOk) {
    logger.info('Health check passed', 'HEALTH_CHECK_OK', {
      uptime_s: typeof process !== 'undefined' ? Math.floor(process.uptime()) : null,
    }, duration);
  } else {
    logger.warn('Health check degraded', 'HEALTH_CHECK_DEGRADED', {
      failing_checks: Object.entries(checks)
        .filter(([, value]) => !value)
        .map(([key]) => key),
    }, duration);
  }

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
