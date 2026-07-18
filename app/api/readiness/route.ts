import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Application Readiness Check
 *
 * Validates server is configured and ready to accept requests
 */
export async function GET(_request: NextRequest) {
  const checks: Record<string, boolean> = {
    supabase_url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabase_anon: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    service_role_configured: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  };

  const allReady = Object.values(checks).every(Boolean);

  return NextResponse.json(
    {
      ok: allReady,
      status: allReady ? 'ready' : 'not_ready',
      timestamp: new Date().toISOString(),
      checks,
    },
    { status: allReady ? 200 : 503 }
  );
}
