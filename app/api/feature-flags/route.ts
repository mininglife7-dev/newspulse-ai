import { requireAdminToken, unauthorizedResponse } from '@/lib/api-auth';
import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import {
  registerFlag,
  getFlag,
  listFlags,
  updateFlag,
  evaluateFlag,
  getVariant,
  startGradualRollout,
  incrementRollout,
  getFlagStats,
  type FeatureFlag,
  type FlagContext,
  type FlagEvaluation,
} from '@/lib/feature-flag-controller';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/feature-flags
 *
 * DNA-GOV-013 endpoint: Feature Flag Controller.
 *
 * Query parameters:
 * - action: 'list' (default) | 'get' | 'stats'
 * - flagId: Required for 'get' and 'stats' actions
 *
 * Returns feature flag metadata and configuration.
 */
export async function GET(req: Request) {
  if (!requireAdminToken(req)) {
    return unauthorizedResponse();
  }
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action') || 'list';
    const flagId = searchParams.get('flagId');

    if (action === 'health') {
      return NextResponse.json(
        {
          ok: true,
          service: 'feature-flag-controller',
          status: 'operational',
          timestamp: new Date().toISOString(),
          features: [
            'Register and manage feature flags',
            'Evaluate flags with context-aware targeting',
            'A/B testing with deterministic variant assignment',
            'Gradual rollouts from 0-100%',
            'Targeting rules: user, email, company, tag, percentage, all',
            'Flag statistics and health monitoring',
          ],
          checkFlag: {
            method: 'POST',
            path: '/api/feature-flags/evaluate',
            body: {
              flagId: 'string',
              context: {
                userId: 'optional string',
                userEmail: 'optional string',
                companyId: 'optional string',
                tags: 'optional string[]',
                attributes: 'optional Record<string, any>',
              },
            },
          },
        },
        { status: 200 }
      );
    }

    if (action === 'list') {
      const allFlags = listFlags();
      return NextResponse.json(
        {
          ok: true,
          timestamp: new Date().toISOString(),
          count: allFlags.length,
          flags: allFlags,
        },
        { status: 200 }
      );
    }

    if (action === 'get') {
      if (!flagId) {
        return NextResponse.json(
          {
            ok: false,
            error: 'Missing flagId parameter for get action',
          },
          { status: 400 }
        );
      }

      const flag = getFlag(flagId);
      if (!flag) {
        return NextResponse.json(
          {
            ok: false,
            error: 'Flag not found',
            flagId,
          },
          { status: 404 }
        );
      }

      return NextResponse.json(
        {
          ok: true,
          timestamp: new Date().toISOString(),
          flag,
        },
        { status: 200 }
      );
    }

    if (action === 'stats') {
      if (!flagId) {
        return NextResponse.json(
          {
            ok: false,
            error: 'Missing flagId parameter for stats action',
          },
          { status: 400 }
        );
      }

      const stats = getFlagStats(flagId);
      if (!stats) {
        return NextResponse.json(
          {
            ok: false,
            error: 'Flag not found',
            flagId,
          },
          { status: 404 }
        );
      }

      return NextResponse.json(
        {
          ok: true,
          timestamp: new Date().toISOString(),
          stats,
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        ok: false,
        error: 'Invalid action',
        supportedActions: ['list', 'get', 'stats', 'health'],
      },
      { status: 400 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Feature flag retrieval failed', 'FEATURE_FLAG_RETRIEVAL_ERROR', error);

    return NextResponse.json(
      {
        ok: false,
        error: 'Feature flag retrieval failed',
        message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/feature-flags
 *
 * Manage feature flags: register, update, evaluate, or control rollouts.
 *
 * Request body:
 * {
 *   "command": "register" | "update" | "evaluate" | "get-variant" | "start-rollout" | "increment-rollout",
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

    // Register a new flag
    if (command === 'register') {
      const flagData = body as unknown as FeatureFlag;

      if (!flagData.id || !flagData.name || flagData.enabled === undefined) {
        return NextResponse.json(
          {
            ok: false,
            error: 'Invalid request body',
            required: ['id', 'name', 'enabled'],
          },
          { status: 400 }
        );
      }

      registerFlag(flagData);

      return NextResponse.json(
        {
          ok: true,
          timestamp: new Date().toISOString(),
          message: 'Flag registered',
          flag: getFlag(flagData.id),
        },
        { status: 201 }
      );
    }

    // Update a flag
    if (command === 'update') {
      const { flagId, updates } = body as unknown as {
        flagId: string;
        updates: Partial<FeatureFlag>;
      };

      if (!flagId) {
        return NextResponse.json(
          {
            ok: false,
            error: 'Missing flagId',
          },
          { status: 400 }
        );
      }

      const updated = updateFlag(flagId, updates);

      if (!updated) {
        return NextResponse.json(
          {
            ok: false,
            error: 'Flag not found',
            flagId,
          },
          { status: 404 }
        );
      }

      return NextResponse.json(
        {
          ok: true,
          timestamp: new Date().toISOString(),
          message: 'Flag updated',
          flag: updated,
        },
        { status: 200 }
      );
    }

    // Evaluate a flag
    if (command === 'evaluate') {
      const { flagId, context } = body as unknown as {
        flagId: string;
        context?: FlagContext;
      };

      if (!flagId) {
        return NextResponse.json(
          {
            ok: false,
            error: 'Missing flagId',
          },
          { status: 400 }
        );
      }

      const evaluation = evaluateFlag(flagId, context || {});

      return NextResponse.json(
        {
          ok: true,
          timestamp: new Date().toISOString(),
          evaluation,
        },
        { status: 200 }
      );
    }

    // Get variant for A/B testing
    if (command === 'get-variant') {
      const { flagId, context } = body as unknown as {
        flagId: string;
        context?: FlagContext;
      };

      if (!flagId) {
        return NextResponse.json(
          {
            ok: false,
            error: 'Missing flagId',
          },
          { status: 400 }
        );
      }

      const variant = getVariant(flagId, context || {});

      return NextResponse.json(
        {
          ok: true,
          timestamp: new Date().toISOString(),
          result: variant,
        },
        { status: 200 }
      );
    }

    // Start gradual rollout
    if (command === 'start-rollout') {
      const { flagId, startPercentage, targetPercentage } = body as unknown as {
        flagId: string;
        startPercentage: number;
        targetPercentage: number;
      };

      if (
        !flagId ||
        typeof startPercentage !== 'number' ||
        typeof targetPercentage !== 'number'
      ) {
        return NextResponse.json(
          {
            ok: false,
            error: 'Invalid request body',
            required: ['flagId', 'startPercentage', 'targetPercentage'],
          },
          { status: 400 }
        );
      }

      try {
        const updated = startGradualRollout(
          flagId,
          startPercentage,
          targetPercentage
        );

        if (!updated) {
          return NextResponse.json(
            {
              ok: false,
              error: 'Flag not found',
              flagId,
            },
            { status: 404 }
          );
        }

        return NextResponse.json(
          {
            ok: true,
            timestamp: new Date().toISOString(),
            message: `Gradual rollout started at ${startPercentage}% targeting ${targetPercentage}%`,
            flag: updated,
          },
          { status: 200 }
        );
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Invalid percentages';
        return NextResponse.json(
          {
            ok: false,
            error: message,
          },
          { status: 400 }
        );
      }
    }

    // Increment rollout
    if (command === 'increment-rollout') {
      const { flagId, increment } = body as unknown as {
        flagId: string;
        increment: number;
      };

      if (!flagId || typeof increment !== 'number') {
        return NextResponse.json(
          {
            ok: false,
            error: 'Invalid request body',
            required: ['flagId', 'increment'],
          },
          { status: 400 }
        );
      }

      const updated = incrementRollout(flagId, increment);

      if (!updated) {
        return NextResponse.json(
          {
            ok: false,
            error: 'Flag not found',
            flagId,
          },
          { status: 404 }
        );
      }

      return NextResponse.json(
        {
          ok: true,
          timestamp: new Date().toISOString(),
          message: `Rollout incremented by ${increment}% to ${updated.percentage}%`,
          flag: updated,
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        ok: false,
        error: 'Unknown command',
        supportedCommands: [
          'register',
          'update',
          'evaluate',
          'get-variant',
          'start-rollout',
          'increment-rollout',
        ],
      },
      { status: 400 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Feature flag operation failed', 'FEATURE_FLAG_OPERATION_ERROR', error);

    return NextResponse.json(
      {
        ok: false,
        error: 'Feature flag operation failed',
        message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
