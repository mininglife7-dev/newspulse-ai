import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const checks = {
    supabase_url: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    supabase_anon: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    supabase_service: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
  };

  const envOk = Object.values(checks).every(Boolean);
  let dbOk = false;
  let dbStatus = 'unknown';

  // Test actual database connectivity
  if (envOk) {
    try {
      const admin = getSupabaseAdmin();
      // Simple query to test connectivity
      const { data, error } = await admin
        .from('customers')
        .select('id', { count: 'exact', head: true })
        .limit(1);

      if (error) {
        dbOk = false;
        dbStatus = `error: ${error.message}`;
      } else {
        dbOk = true;
        dbStatus = 'ok';
      }
    } catch (err) {
      dbOk = false;
      dbStatus = err instanceof Error ? `error: ${err.message}` : 'unknown error';
    }
  }

  const allOk = envOk && dbOk;

  return NextResponse.json(
    {
      ok: allOk,
      status: allOk ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime_s: typeof process !== 'undefined' ? Math.floor(process.uptime()) : null,
      db: dbStatus,
      checks,
    },
    { status: allOk ? 200 : 503 }
  );
}
