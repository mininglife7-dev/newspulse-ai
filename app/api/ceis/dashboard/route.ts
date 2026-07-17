import { NextRequest, NextResponse } from 'next/server';
import { buildDashboard } from '@/lib/ceis/dashboard';
import { requireAdminToken, unauthorizedResponse } from '@/lib/api-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/ceis/dashboard — aggregated founder dashboard payload. ADMIN TOKEN REQUIRED */
export async function GET(request: NextRequest) {
  if (!requireAdminToken(request)) {
    return unauthorizedResponse();
  }
  try {
    const dashboard = await buildDashboard();
    return NextResponse.json(dashboard);
  } catch (err: any) {
    console.error('[/api/ceis/dashboard] error:', err);
    return NextResponse.json(
      { ok: false, error: err?.message || 'Failed to build dashboard.' },
      { status: 500 }
    );
  }
}
