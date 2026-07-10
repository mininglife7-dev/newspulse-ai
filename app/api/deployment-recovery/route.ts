import { NextResponse } from 'next/server';
import {
  checkDeploymentStatus,
  attemptRecovery,
  formatRecoveryReport,
  type DeploymentStatus,
} from '@/lib/deployment-recovery';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/deployment-recovery?deploymentId=<id>
 *
 * Check deployment status without attempting recovery.
 * Useful for monitoring and status verification.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const deploymentId = url.searchParams.get('deploymentId');

  if (!deploymentId) {
    return NextResponse.json(
      { ok: false, error: 'deploymentId parameter required' },
      { status: 400 }
    );
  }

  try {
    const status = await checkDeploymentStatus(deploymentId);

    return NextResponse.json({
      ok: true,
      deploymentId,
      status,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Failed to check deployment status',
        message: (err as any).message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/deployment-recovery
 *
 * Attempt to recover from failed deployment with automatic retries.
 * Protected by ADMIN_TOKEN for cron/webhook access.
 *
 * Request body:
 * {
 *   "deploymentId": "dpl_...",
 *   "owner": "github-owner",           // optional, for GitHub retry trigger
 *   "repo": "repo-name",               // optional, for GitHub retry trigger
 *   "branchName": "main"               // optional, for GitHub retry trigger
 * }
 */
export async function POST(req: Request) {
  // Security: require ADMIN_TOKEN for cron access
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  const adminToken = process.env.ADMIN_TOKEN;

  if (!adminToken || token !== adminToken) {
    return NextResponse.json(
      { ok: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const body = (await req.json()) as any;
    const { deploymentId, owner, repo, branchName } = body;

    if (!deploymentId) {
      return NextResponse.json(
        { ok: false, error: 'deploymentId required in request body' },
        { status: 400 }
      );
    }

    const report = await attemptRecovery(deploymentId, owner, repo, branchName);

    return NextResponse.json({
      ok: true,
      message: report.recovered ? 'Deployment recovered' : 'Recovery failed',
      report,
      summary: formatRecoveryReport(report),
    });
  } catch (err) {
    console.error('[api/deployment-recovery] error:', err);
    return NextResponse.json(
      {
        ok: false,
        error: 'Failed to process deployment recovery',
        message: (err as any).message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
