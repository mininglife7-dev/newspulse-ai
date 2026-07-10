import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  // Check minimal required configuration without disclosing which env vars are set
  const hasRequiredConfig =
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) &&
    Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

  // Don't expose specific env var names to prevent reconnaissance
  const allOk = hasRequiredConfig;

  return NextResponse.json(
    {
      ok: allOk,
      status: allOk ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime_s: typeof process !== 'undefined' ? Math.floor(process.uptime()) : null,
    },
    { status: allOk ? 200 : 503 }
  );
}
