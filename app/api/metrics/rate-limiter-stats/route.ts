import { NextRequest, NextResponse } from 'next/server';
import {
  getTelemetry,
  getTopViolators,
  shouldBlockClient,
} from '@/lib/rate-limiter-telemetry';
import { withLogging } from '@/lib/middleware-logging';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  return withLogging(
    request,
    async () => {
      try {
        const telemetry = getTelemetry();
        const topViolators = getTopViolators(20);

        return NextResponse.json(
          {
            ok: true,
            timestamp: new Date().toISOString(),
            summary: {
              totalViolations: telemetry.totalViolations,
              uniqueClientsLimited: telemetry.uniqueClientsLimited,
              lastViolation: telemetry.lastViolation,
            },
            topViolators: topViolators.map(([client, count]) => ({
              client,
              violations: count,
              blocked: shouldBlockClient(client),
            })),
          },
          {
            status: 200,
            headers: {
              'Cache-Control': 'public, max-age=10',
              'Content-Type': 'application/json',
            },
          }
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json(
          {
            ok: false,
            error: 'Failed to fetch rate limiter stats',
            message,
            timestamp: new Date().toISOString(),
          },
          { status: 500 }
        );
      }
    },
    {
      endpoint: '/api/metrics/rate-limiter-stats',
      method: 'GET',
    }
  );
}
