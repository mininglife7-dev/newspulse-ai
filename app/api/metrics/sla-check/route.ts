import { NextRequest, NextResponse } from 'next/server';
import {
  getMetrics,
  validateSLA,
  type PerformanceMetric,
  type SLAConfig,
} from '@/lib/performance-metrics';
import { withLogging } from '@/lib/middleware-logging';
import { processSLAViolations } from '@/lib/sla-alert-monitor';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Define SLAs for critical endpoints
const ENDPOINT_SLAS: Record<string, SLAConfig> = {
  'POST /api/workspace': {
    endpoint: 'POST /api/workspace',
    p95MaxMs: 800,
    p99MaxMs: 1500,
    minThroughput: 1,
  },
  'GET /api/dashboard': {
    endpoint: 'GET /api/dashboard',
    p95MaxMs: 500,
    p99MaxMs: 1000,
    minThroughput: 2,
  },
  'GET /api/ai-systems': {
    endpoint: 'GET /api/ai-systems',
    p95MaxMs: 600,
    p99MaxMs: 1200,
    minThroughput: 2,
  },
  'POST /api/ai-systems': {
    endpoint: 'POST /api/ai-systems',
    p95MaxMs: 800,
    p99MaxMs: 1500,
    minThroughput: 1,
  },
  'GET /api/evidence': {
    endpoint: 'GET /api/evidence',
    p95MaxMs: 600,
    p99MaxMs: 1200,
    minThroughput: 2,
  },
  'POST /api/evidence': {
    endpoint: 'POST /api/evidence',
    p95MaxMs: 1000,
    p99MaxMs: 2000,
    minThroughput: 1,
  },
  'GET /api/team': {
    endpoint: 'GET /api/team',
    p95MaxMs: 500,
    p99MaxMs: 1000,
    minThroughput: 2,
  },
  'GET /api/health': {
    endpoint: 'GET /api/health',
    p95MaxMs: 300,
    p99MaxMs: 500,
    minThroughput: 5,
  },
};

interface SLACheckResult {
  endpoint: string;
  passed: boolean;
  violations: string[];
  metrics: {
    p95: number;
    p99: number;
    count: number;
  };
  sla: SLAConfig;
}

export async function GET(request: NextRequest) {
  return withLogging(
    request,
    async () => {
      try {
        const metrics = getMetrics();
        const results: SLACheckResult[] = [];

        // Check each endpoint's SLA
        for (const [endpoint, sla] of Object.entries(ENDPOINT_SLAS)) {
          // Try both with and without 'api:' prefix
          const metricKey = Object.keys(metrics).find(
            (k) => k.includes(endpoint) || k === `api:${endpoint}`
          );

          if (metricKey && metrics[metricKey]) {
            const metric = metrics[metricKey];
            const validation = validateSLA(metric, sla);

            results.push({
              endpoint,
              passed: validation.passed,
              violations: validation.violations,
              metrics: {
                p95: metric.p95,
                p99: metric.p99,
                count: metric.measurements.length,
              },
              sla,
            });
          } else {
            // No data collected yet for this endpoint
            results.push({
              endpoint,
              passed: true, // Don't fail if no data
              violations: [],
              metrics: { p95: 0, p99: 0, count: 0 },
              sla,
            });
          }
        }

        const allPassed = results.every((r) => r.passed);
        const violations = results.filter((r) => !r.passed);

        // Record violations in alert hub for Founder visibility
        if (!allPassed) {
          processSLAViolations(
            allPassed,
            violations.length,
            violations as Parameters<typeof processSLAViolations>[2]
          );
        }

        return NextResponse.json(
          {
            ok: true,
            timestamp: new Date().toISOString(),
            allPassed,
            totalEndpoints: results.length,
            violatingEndpoints: violations.length,
            results: results.sort((a, b) => {
              // Show failures first
              if (a.passed !== b.passed) return a.passed ? 1 : -1;
              return a.endpoint.localeCompare(b.endpoint);
            }),
          },
          {
            status: allPassed ? 200 : 207,
            headers: {
              'Cache-Control': 'public, max-age=10',
              'Content-Type': 'application/json',
            },
          }
        );
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json(
          {
            ok: false,
            error: 'SLA check failed',
            message,
            timestamp: new Date().toISOString(),
          },
          { status: 500 }
        );
      }
    },
    {
      endpoint: '/api/metrics/sla-check',
      method: 'GET',
    }
  );
}
