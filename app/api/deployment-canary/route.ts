import { NextResponse } from 'next/server';
import {
  planCanaryDeployment,
  getCanaryDeployment,
  startCanaryDeployment,
  recordCanaryMetrics,
  incrementCanaryStage,
  completeCanaryDeployment,
  abortCanaryDeployment,
  getCanaryHealthSnapshots,
  getLatestCanarySnapshot,
  getCanarySummary,
  type CanaryStageConfig,
} from '@/lib/deployment-canary';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/deployment-canary
 *
 * DNA-GOV-015 endpoint: Deployment Canary.
 *
 * Query parameters:
 * - action: 'health' (default), 'get', 'snapshots', 'summary'
 * - deploymentId: Required for 'get', 'snapshots', 'summary'
 *
 * Returns canary deployment status and health information.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action') || 'health';
    const deploymentId = searchParams.get('deploymentId');

    if (action === 'health') {
      return NextResponse.json(
        {
          ok: true,
          service: 'deployment-canary',
          status: 'operational',
          timestamp: new Date().toISOString(),
          features: [
            'Plan gradual code deployments (10% → 25% → 50% → 100%)',
            'Continuous health monitoring during rollout',
            'Automatic abort on critical metrics (error rate, latency)',
            'Multi-stage canary deployment strategy',
            'Health snapshot history and analytics',
            'Manual kill-switch at any stage',
          ],
          planDeployment: {
            method: 'POST',
            path: '/api/deployment-canary',
            body: {
              command: 'plan',
              name: 'Checkout v3',
              commit: 'abc123',
              version: 'v3.0.0',
              description: 'Redesigned checkout flow',
              stages: [
                {
                  stage: 1,
                  percentage: 10,
                  duration: 15,
                  thresholds: [
                    { metric: 'error_rate', criticalMax: 15, warningMax: 5 },
                    { metric: 'latency', criticalMax: 5000, warningMax: 2000 },
                  ],
                },
              ],
            },
          },
        },
        { status: 200 }
      );
    }

    if (action === 'get') {
      if (!deploymentId) {
        return NextResponse.json(
          {
            ok: false,
            error: 'Missing deploymentId parameter',
          },
          { status: 400 }
        );
      }

      const deployment = getCanaryDeployment(deploymentId);
      if (!deployment) {
        return NextResponse.json(
          {
            ok: false,
            error: 'Deployment not found',
            deploymentId,
          },
          { status: 404 }
        );
      }

      return NextResponse.json(
        {
          ok: true,
          timestamp: new Date().toISOString(),
          deployment,
        },
        { status: 200 }
      );
    }

    if (action === 'snapshots') {
      if (!deploymentId) {
        return NextResponse.json(
          {
            ok: false,
            error: 'Missing deploymentId parameter',
          },
          { status: 400 }
        );
      }

      const snapshots = getCanaryHealthSnapshots(deploymentId);
      return NextResponse.json(
        {
          ok: true,
          timestamp: new Date().toISOString(),
          deploymentId,
          count: snapshots.length,
          snapshots,
        },
        { status: 200 }
      );
    }

    if (action === 'summary') {
      if (!deploymentId) {
        return NextResponse.json(
          {
            ok: false,
            error: 'Missing deploymentId parameter',
          },
          { status: 400 }
        );
      }

      const summary = getCanarySummary(deploymentId);
      if (!summary) {
        return NextResponse.json(
          {
            ok: false,
            error: 'Deployment not found',
            deploymentId,
          },
          { status: 404 }
        );
      }

      return NextResponse.json(
        {
          ok: true,
          timestamp: new Date().toISOString(),
          summary,
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        ok: false,
        error: 'Invalid action',
        supportedActions: ['health', 'get', 'snapshots', 'summary'],
      },
      { status: 400 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[deployment-canary] GET failed:', message);

    return NextResponse.json(
      {
        ok: false,
        error: 'Canary deployment retrieval failed',
        message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/deployment-canary
 *
 * Manage canary deployments: plan, start, record metrics, increment, abort, complete.
 *
 * Request body:
 * {
 *   "command": "plan" | "start" | "record-metrics" | "increment" | "complete" | "abort",
 *   ...command-specific fields
 * }
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      command: string;
      [key: string]: unknown;
    };

    const { command } = body;

    // Plan a new canary deployment
    if (command === 'plan') {
      const { name, commit, version, description, stages } = body as unknown as {
        name: string;
        commit: string;
        version: string;
        description: string;
        stages: CanaryStageConfig[];
      };

      if (!name || !commit || !version || !stages || !Array.isArray(stages)) {
        return NextResponse.json(
          {
            ok: false,
            error: 'Invalid request body',
            required: ['name', 'commit', 'version', 'stages'],
          },
          { status: 400 }
        );
      }

      const deployment = planCanaryDeployment(name, commit, version, description || '', stages);

      return NextResponse.json(
        {
          ok: true,
          timestamp: new Date().toISOString(),
          message: 'Deployment planned',
          deployment,
        },
        { status: 201 }
      );
    }

    // Start deployment
    if (command === 'start') {
      const { deploymentId } = body as unknown as { deploymentId: string };

      if (!deploymentId) {
        return NextResponse.json(
          {
            ok: false,
            error: 'Missing deploymentId',
          },
          { status: 400 }
        );
      }

      const started = startCanaryDeployment(deploymentId);

      if (!started) {
        return NextResponse.json(
          {
            ok: false,
            error: 'Deployment not found',
            deploymentId,
          },
          { status: 404 }
        );
      }

      return NextResponse.json(
        {
          ok: true,
          timestamp: new Date().toISOString(),
          message: `Deployment started at ${started.currentPercentage}%`,
          deployment: started,
        },
        { status: 200 }
      );
    }

    // Record health metrics
    if (command === 'record-metrics') {
      const { deploymentId, metrics } = body as unknown as {
        deploymentId: string;
        metrics: Record<string, number>;
      };

      if (!deploymentId || !metrics) {
        return NextResponse.json(
          {
            ok: false,
            error: 'Invalid request body',
            required: ['deploymentId', 'metrics'],
          },
          { status: 400 }
        );
      }

      try {
        const snapshot = recordCanaryMetrics(
          deploymentId,
          metrics as Record<'error_rate' | 'latency' | 'availability' | 'memory' | 'cpu', number>
        );

        return NextResponse.json(
          {
            ok: true,
            timestamp: new Date().toISOString(),
            snapshot,
            status: snapshot.allHealthy ? 'healthy' : 'attention_required',
          },
          { status: 200 }
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        return NextResponse.json(
          {
            ok: false,
            error: msg,
          },
          { status: 400 }
        );
      }
    }

    // Increment to next stage
    if (command === 'increment') {
      const { deploymentId } = body as unknown as { deploymentId: string };

      if (!deploymentId) {
        return NextResponse.json(
          {
            ok: false,
            error: 'Missing deploymentId',
          },
          { status: 400 }
        );
      }

      try {
        const incremented = incrementCanaryStage(deploymentId);

        if (!incremented) {
          return NextResponse.json(
            {
              ok: false,
              error: 'Deployment not found',
              deploymentId,
            },
            { status: 404 }
          );
        }

        return NextResponse.json(
          {
            ok: true,
            timestamp: new Date().toISOString(),
            message: `Incremented to ${incremented.currentPercentage}%`,
            deployment: incremented,
          },
          { status: 200 }
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        return NextResponse.json(
          {
            ok: false,
            error: msg,
          },
          { status: 400 }
        );
      }
    }

    // Complete deployment
    if (command === 'complete') {
      const { deploymentId } = body as unknown as { deploymentId: string };

      if (!deploymentId) {
        return NextResponse.json(
          {
            ok: false,
            error: 'Missing deploymentId',
          },
          { status: 400 }
        );
      }

      const completed = completeCanaryDeployment(deploymentId);

      if (!completed) {
        return NextResponse.json(
          {
            ok: false,
            error: 'Deployment not found',
            deploymentId,
          },
          { status: 404 }
        );
      }

      return NextResponse.json(
        {
          ok: true,
          timestamp: new Date().toISOString(),
          message: 'Deployment complete — all traffic now using new version',
          deployment: completed,
        },
        { status: 200 }
      );
    }

    // Abort deployment
    if (command === 'abort') {
      const { deploymentId, reason } = body as unknown as { deploymentId: string; reason: string };

      if (!deploymentId) {
        return NextResponse.json(
          {
            ok: false,
            error: 'Missing deploymentId',
          },
          { status: 400 }
        );
      }

      try {
        const aborted = abortCanaryDeployment(deploymentId, reason || 'Manual abort');

        if (!aborted) {
          return NextResponse.json(
            {
              ok: false,
              error: 'Deployment not found',
              deploymentId,
            },
            { status: 404 }
          );
        }

        return NextResponse.json(
          {
            ok: true,
            timestamp: new Date().toISOString(),
            message: `Deployment aborted: ${aborted.abortReason}`,
            deployment: aborted,
          },
          { status: 200 }
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        return NextResponse.json(
          {
            ok: false,
            error: msg,
          },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      {
        ok: false,
        error: 'Unknown command',
        supportedCommands: ['plan', 'start', 'record-metrics', 'increment', 'complete', 'abort'],
      },
      { status: 400 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[deployment-canary] POST failed:', message);

    return NextResponse.json(
      {
        ok: false,
        error: 'Canary deployment operation failed',
        message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
