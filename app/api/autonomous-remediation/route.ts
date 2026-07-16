import { requireAdminToken, unauthorizedResponse } from '@/lib/api-auth';
import { NextRequest, NextResponse } from 'next/server';
import {
  AutonomousRemediationEngine,
  formatRemediationAlert,
} from '@/lib/autonomous-remediation';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  if (!requireAdminToken(request)) {
    return unauthorizedResponse();
  }
  try {
    const engine = new AutonomousRemediationEngine();

    // Sample metrics for demonstration; in production these would come from monitoring
    const metrics = {
      error_rate_percent: 2.1,
      response_time_p99_ms: 1200,
      deployment_health_percent: 98,
      memory_usage_percent: 65,
    };

    const result = await engine.runRemediationCycle(metrics);
    const alert = formatRemediationAlert(result);

    // Determine status code based on remediation result
    const statusCode = result.detectedFailures.length === 0 ? 200 : 206;

    return NextResponse.json(
      {
        status: statusCode === 200 ? 'healthy' : 'degraded',
        timestamp: result.timestamp,
        detectedFailures: result.detectedFailures.length,
        remediationAttempts: result.attempts.length,
        successRate: result.successRate,
        outageAvoided: result.outageAvoided,
        summary: result.summary,
        alert,
      },
      {
        status: statusCode,
        headers: {
          'X-Failure-Count': String(result.detectedFailures.length),
          'X-Attempt-Count': String(result.attempts.length),
          'X-Success-Rate': String(result.successRate.toFixed(2)),
          'X-Outage-Avoided': String(result.outageAvoided),
        },
      }
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Unknown error during remediation cycle';
    return NextResponse.json(
      {
        status: 'error',
        error: message,
      },
      { status: 503 }
    );
  }
}

export async function POST(request: NextRequest) {
  if (!requireAdminToken(request)) {
    return unauthorizedResponse();
  }
  try {
    const body = await request.json();
    const { metrics } = body;

    if (!metrics || typeof metrics !== 'object') {
      return NextResponse.json(
        { error: 'Invalid request: metrics object required' },
        { status: 400 }
      );
    }

    const engine = new AutonomousRemediationEngine();
    const result = await engine.runRemediationCycle(metrics);
    const alert = formatRemediationAlert(result);

    const statusCode = result.detectedFailures.length === 0 ? 200 : 206;

    return NextResponse.json(
      {
        status: statusCode === 200 ? 'healthy' : 'degraded',
        timestamp: result.timestamp,
        detectedFailures: result.detectedFailures,
        attempts: result.attempts,
        successRate: result.successRate,
        outageAvoided: result.outageAvoided,
        summary: result.summary,
        alert,
      },
      {
        status: statusCode,
        headers: {
          'X-Failure-Count': String(result.detectedFailures.length),
          'X-Attempt-Count': String(result.attempts.length),
          'X-Success-Rate': String(result.successRate.toFixed(2)),
          'X-Outage-Avoided': String(result.outageAvoided),
        },
      }
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Unknown error processing remediation request';
    return NextResponse.json(
      {
        status: 'error',
        error: message,
      },
      { status: 503 }
    );
  }
}
