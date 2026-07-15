import { NextResponse } from 'next/server';
import { buildDashboard } from '@/lib/ceis/dashboard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/ceis/dashboard — aggregated founder dashboard payload. */
export async function GET() {
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
