import { NextRequest, NextResponse } from 'next/server';
import { getMetrics } from '@/lib/performance-metrics';
import { withLogging } from '@/lib/middleware-logging';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  return withLogging(
    request,
    async () => {
      try {
        const metrics = getMetrics();
        const endpointMetrics = Object.entries(metrics).filter(
          ([key]) => key.startsWith('api:') || key.startsWith('endpoint:')
        );

        // Group metrics by endpoint
        const byEndpoint: Record<string, any> = {};
        for (const [key, metric] of endpointMetrics) {
          const endpoint = key.replace(/^(api:|endpoint:)/, '');
          byEndpoint[endpoint] = {
            name: metric.name,
            p50: metric.median,
            p95: metric.p95,
            p99: metric.p99,
            min: metric.min,
            max: metric.max,
            mean: metric.mean,
            count: metric.measurements.length,
          };
        }

        // Summary stats across all endpoints
        const allLatencies = endpointMetrics.flatMap(([, m]) => m.measurements);
        const sorted = [...allLatencies].sort((a, b) => a - b);

        const summary = {
          totalRequests: allLatencies.length,
          averageLatencyMs: Math.round(
            allLatencies.reduce((a, b) => a + b, 0) / allLatencies.length || 0
          ),
          p50LatencyMs: sorted[Math.floor(sorted.length * 0.5)] || 0,
          p95LatencyMs: sorted[Math.floor(sorted.length * 0.95)] || 0,
          p99LatencyMs: sorted[Math.floor(sorted.length * 0.99)] || 0,
          minLatencyMs: Math.min(...allLatencies, Infinity),
          maxLatencyMs: Math.max(...allLatencies, -Infinity),
        };

        return NextResponse.json(
          {
            ok: true,
            timestamp: new Date().toISOString(),
            summary,
            byEndpoint,
            allMetrics: metrics,
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
            error: 'Failed to fetch metrics',
            message,
            timestamp: new Date().toISOString(),
          },
          { status: 500 }
        );
      }
    },
    {
      endpoint: '/api/metrics/dashboard',
      method: 'GET',
    }
  );
}
