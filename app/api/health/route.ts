import { NextResponse } from 'next/server';

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
  const demoMode =
    process.env.DEMO_MODE === 'true' || process.env.DEMO_MODE === '1';
  const timestamp = new Date().toISOString();

  return NextResponse.json(
    {
      ok: allHealthy,
      status: allHealthy ? 'healthy' : 'degraded',
      checks,
      // Surfaced so the client can honestly tell users when results are
      // sample data (demo mode) versus real, configured search.
      demo_mode: demoMode,
      timestamp,
    },
    { status: allHealthy ? 200 : 503 }
  );
}
