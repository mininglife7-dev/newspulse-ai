import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Deployment Verification
 *
 * Verifies that the application is correctly deployed and operational
 */
export async function GET(_request: NextRequest) {
  return NextResponse.json(
    {
      ok: true,
      status: 'operational',
      timestamp: new Date().toISOString(),
      version: process.env.VERCEL_GIT_COMMIT_SHA || 'unknown',
    },
    { status: 200 }
  );
}
