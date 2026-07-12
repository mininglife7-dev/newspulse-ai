import { NextResponse } from 'next/server';
import { verifyDeployment, formatDeploymentAlert } from '@/lib/deployment-verifier';
import { logger } from '@/lib/logger';

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
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;

  if (!token || !owner || !repo) {
    return NextResponse.json(
      {
        ok: false,
        error: 'GitHub configuration incomplete',
        message: 'Set GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO in Vercel env',
        status: 'unconfigured',
      },
      { status: 503 }
    );
  }

  try {
    const result = await verifyDeployment(owner, repo, token);
    const alert = formatDeploymentAlert(result);

    // Log deployment status (safe for production)
    if (result.status === 'critical') {
      logger.error('Deployment verification: critical mismatch detected', 'DEPLOYMENT_CRITICAL', {
        hasDeployment: !!result.currentDeployment,
        latestCommit: result.latestCommit?.sha?.substring(0, 7),
      });
    } else if (result.status === 'warning') {
      logger.warn('Deployment verification: warning detected', 'DEPLOYMENT_WARNING', {
        mismatch: result.mismatch,
      });
    } else {
      logger.info('Deployment verification: healthy', 'DEPLOYMENT_OK');
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
    logger.error('Deployment verification check failed', 'DEPLOYMENT_CHECK_ERROR', error);

    return NextResponse.json(
      {
        ok: false,
        error: 'Deployment verification failed',
        status: 'error',
      },
      { status: 503 }
    );
  }
}
