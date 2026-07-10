import { NextResponse } from 'next/server';
import { verifyDeployment, formatDeploymentAlert } from '@/lib/deployment-verifier';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/verify-deployment
 *
 * DNA-GOV-003 endpoint: Verify that latest code is deployed to production.
 * Called by Vercel cron every 10 minutes after a push to main.
 *
 * Returns:
 * - 200 + healthy: Latest commit is deployed and live
 * - 200 + warning: Deployment in progress or mismatch detected
 * - 503: Cannot verify (GitHub API error)
 *
 * Success criteria: Latest main commit has successful Vercel deployment that is live.
 */
export async function GET(req: Request) {
  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER || 'mininglife7-dev';
  const repo = process.env.GITHUB_REPO || 'newspulse-ai';

  if (!token) {
    return NextResponse.json(
      {
        ok: false,
        error: 'GITHUB_TOKEN not configured',
        message: 'Set GITHUB_TOKEN in Vercel env to enable deployment verification',
        status: 'unconfigured',
      },
      { status: 503 }
    );
  }

  try {
    const result = await verifyDeployment(owner, repo, token);
    const alert = formatDeploymentAlert(result);

    // Log alerts for Founder visibility
    if (result.status === 'critical') {
      console.error('[verify-deployment] CRITICAL:\n', alert);
    } else if (result.status === 'warning') {
      console.warn('[verify-deployment] WARNING:\n', alert);
    } else {
      console.log('[verify-deployment] OK:\n', alert);
    }

    return NextResponse.json(
      {
        ok: result.status === 'healthy',
        status: result.status,
        alert,
        currentDeployment: result.currentDeployment,
        latestCommit: result.latestCommit,
        mismatch: result.mismatch,
        checkedAt: new Date().toISOString(),
      },
      {
        status: 200,
        headers: {
          'X-Deployment-Status': result.status,
          'X-Is-Live': result.currentDeployment?.isLive ? 'true' : 'false',
        },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[verify-deployment] Check failed:', message);

    return NextResponse.json(
      {
        ok: false,
        error: 'Deployment verification failed',
        message,
        status: 'error',
      },
      { status: 503 }
    );
  }
}
