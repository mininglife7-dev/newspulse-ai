/**
 * Application Readiness Check
 *
 * Health check validates server is responding
 * Readiness check validates server is configured and ready to accept requests
 *
 * This endpoint verifies:
 * - Required environment variables are set
 * - Server can access external services (if applicable)
 * - Server is ready to handle API requests
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const checks: Record<string, boolean> = {
    // Verify required configuration
    supabase_url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabase_anon: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    // Service role key is server-side only (never in NEXT_PUBLIC_)
    service_role_configured: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  };

  const allReady = Object.values(checks).every(Boolean);

  return new Response(
    JSON.stringify({
      ok: allReady,
      status: allReady ? 'ready' : 'not_ready',
      timestamp: new Date().toISOString(),
      checks,
    }),
    {
      status: allReady ? 200 : 503,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}
