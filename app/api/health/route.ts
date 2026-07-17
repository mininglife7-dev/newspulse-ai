import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  // Health check verifies server is running and responds to requests
  // Database connectivity is tested separately in integration tests
  return NextResponse.json(
    {
      ok: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
    },
    { status: 200 }
  );
}
