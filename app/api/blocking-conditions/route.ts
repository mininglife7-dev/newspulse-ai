import { NextResponse } from 'next/server';
import {
  detectAllBlockingConditions,
  formatBlockingConditionAlert,
} from '@/lib/blocking-condition-detector';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/blocking-conditions
 *
 * DNA-GOV-001 endpoint: Autonomously detect external blockers.
 * Called by Vercel cron every 30 minutes.
 *
 * Returns:
 * - 200 + empty array: No blockers detected
 * - 200 + array of BlockingCondition: Blockers found (Founder should be alerted)
 * - 503: Detection itself failed (network error, etc.)
 */
export async function GET(req: Request) {
  const actionsToken = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;

  // Require all GitHub configuration to be explicitly set
  if (!actionsToken || !owner || !repo) {
    return NextResponse.json(
      {
        ok: false,
        error: 'GitHub configuration incomplete',
        message: 'Set GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO in Vercel env',
        blockers: [],
      },
      { status: 503 }
    );
  }

  try {
    const blockers = await detectAllBlockingConditions(
      owner,
      repo,
      actionsToken
    );

    if (blockers.length === 0) {
      return NextResponse.json({
        ok: true,
        message: 'No external blockers detected',
        blockers: [],
        checkedAt: new Date().toISOString(),
      });
    }

    // Blockers found — format for Founder
    const alerts = blockers.map(formatBlockingConditionAlert);

    // Log blocking conditions (safe for production)
    if (blockers.some((b) => b.severity === 'critical')) {
      logger.error(
        'Blocking conditions detected: critical',
        'BLOCKER_CRITICAL',
        {
          totalBlockers: blockers.length,
          criticalCount: blockers.filter((b) => b.severity === 'critical')
            .length,
        }
      );
    } else {
      logger.warn(
        'Blocking conditions detected: high severity',
        'BLOCKER_WARNING',
        {
          totalBlockers: blockers.length,
        }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        message: `${blockers.length} blocker(s) detected`,
        blockers,
        alerts,
        checkedAt: new Date().toISOString(),
      },
      {
        status: 200,
        headers: {
          'X-Blocking-Conditions': String(blockers.length),
          'X-Critical-Severity': String(
            blockers.filter((b) => b.severity === 'critical').length
          ),
        },
      }
    );
  } catch (error) {
    logger.error(
      'Blocking condition detection failed',
      'BLOCKER_DETECTION_ERROR',
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error: 'Detection failed',
        blockers: [],
      },
      { status: 503 }
    );
  }
}
