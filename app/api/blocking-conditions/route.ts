import { NextResponse } from 'next/server';
import {
  detectAllBlockingConditions,
  formatBlockingConditionAlert,
} from '@/lib/blocking-condition-detector';

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
  // Opt-in cron protection. This endpoint is otherwise public (it must be
  // reachable by Vercel Cron, which carries no user session). When CRON_SECRET
  // is set, Vercel Cron sends it as `Authorization: Bearer <secret>`, and any
  // caller without it is rejected — closing the public exposure of an endpoint
  // that spends the GitHub token on external API calls. Unset = unchanged
  // public behavior, so nothing breaks before the Founder opts in (same
  // pattern as ADMIN_TOKEN / M-05).
  const cronSecret = process.env.CRON_SECRET;
  if (
    cronSecret &&
    req.headers.get('authorization') !== `Bearer ${cronSecret}`
  ) {
    return NextResponse.json(
      { ok: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const actionsToken = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER || 'mininglife7-dev';
  const repo = process.env.GITHUB_REPO || 'newspulse-ai';

  // Without a GitHub token, we can't check Actions
  if (!actionsToken) {
    return NextResponse.json(
      {
        ok: false,
        error: 'GITHUB_TOKEN not configured',
        message: 'Set GITHUB_TOKEN in Vercel env to enable blocking detection',
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

    // Log critical blockers
    if (blockers.some((b) => b.severity === 'critical')) {
      console.error(
        '[blocking-conditions] CRITICAL blockers detected:\n',
        alerts.join('\n\n')
      );
    } else {
      console.warn(
        '[blocking-conditions] High-severity blockers detected:\n',
        alerts.join('\n\n')
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
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[blocking-conditions] Detection failed:', message);

    return NextResponse.json(
      {
        ok: false,
        error: 'Detection failed',
        message,
        blockers: [],
      },
      { status: 503 }
    );
  }
}
