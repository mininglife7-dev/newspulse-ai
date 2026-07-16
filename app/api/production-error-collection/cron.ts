/**
 * DNS-027: Cron handler for Vercel error collection
 *
 * Triggered every 60 seconds by external cron service (EasyCron, AWS EventBridge, etc.)
 * Collects error telemetry from Vercel and feeds into production incident response.
 *
 * Trigger: `POST /api/production-error-collection/cron?secret=$CRON_SECRET`
 */

import { NextRequest, NextResponse } from 'next/server';
import { runVercelErrorCollection } from '@/lib/vercel-error-collector';

export const dynamic = 'force-dynamic';
export const maxDuration = 30; // 30 seconds (Vercel Hobby limit)

/**
 * Cron endpoint: collect errors every 60 seconds
 * Requires CRON_SECRET to prevent unauthorized invocation
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // 1. Verify authorization
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
      console.error('CRON_SECRET environment variable not configured');
      return NextResponse.json(
        { error: 'Server misconfiguration: CRON_SECRET not set' },
        { status: 500 }
      );
    }

    const authHeader = request.headers.get('authorization');
    const expectedAuth = `Bearer ${cronSecret}`;

    if (!authHeader || authHeader !== expectedAuth) {
      return NextResponse.json(
        { error: 'Unauthorized: invalid or missing CRON_SECRET' },
        { status: 401 }
      );
    }

    // 2. Get deployment ID (default to 'prod-main')
    const deploymentId = request.nextUrl.searchParams.get('deployment') || 'prod-main';

    // 3. Run error collection
    const result = await runVercelErrorCollection(deploymentId);

    // 4. Return result
    return NextResponse.json(
      {
        success: true,
        timestamp: new Date().toISOString(),
        deploymentId,
        collected: result.collected,
        patterns: result.patterns,
        incidents: result.incidents,
        alerts: result.alerts,
      },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[error-collection-cron]', message, error);

    return NextResponse.json(
      {
        success: false,
        error: message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * Optional: GET handler for health check / debugging
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  return NextResponse.json(
    {
      service: 'production-error-collection',
      status: 'ready',
      endpoint: 'POST /api/production-error-collection/cron',
      auth: 'Bearer $CRON_SECRET',
      cadence: '60 seconds',
      documentation: 'docs/PRODUCTION-WIRING-INTEGRATION.md#22-vercel-error-telemetry-integration',
    },
    { status: 200 }
  );
}
