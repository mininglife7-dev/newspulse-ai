import { NextResponse } from 'next/server';
import { runAutomatedPatchCycle, formatPatchReport } from '@/lib/dependency-patch-automation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/dependency-patches
 *
 * Runs automated dependency patch cycle: identifies patchable vulnerabilities,
 * applies patches, runs tests, and creates pull requests if all tests pass.
 *
 * Protected by ADMIN_TOKEN for cron access.
 *
 * Usage: Call weekly via cron service or GitHub Actions
 * curl -X POST -H "Authorization: Bearer $ADMIN_TOKEN" https://your-domain.com/api/dependency-patches
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
    const report = await runAutomatedPatchCycle();

    return NextResponse.json({
      ok: true,
      message: 'Dependency patch cycle completed',
      report,
      summary: formatPatchReport(report),
    });
  } catch (err) {
    console.error('[api/dependency-patches] error:', err);
    return NextResponse.json(
      {
        ok: false,
        error: 'Failed to run dependency patch cycle',
        message: (err as any).message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
