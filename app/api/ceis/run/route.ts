import { NextRequest, NextResponse } from 'next/server';
import { runEvolutionCycle } from '@/lib/ceis/pipeline';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * POST /api/ceis/run — trigger an evolution cycle on demand.
 * GET  /api/ceis/run — same, for Vercel Cron (sends GET requests).
 *
 * When CEIS_CRON_SECRET (or Vercel's CRON_SECRET) is set, requests must
 * carry `Authorization: Bearer <secret>`. Without a secret configured the
 * endpoint is open — fine for local dev, set the secret in production.
 *
 * Query params:
 *   ?dry=1 — run without persisting anything (preview mode).
 */
function authorized(req: NextRequest): {
  ok: boolean;
  status?: number;
  error?: string;
} {
  const bearer = req.headers.get('authorization');
  const secrets = [
    process.env.CEIS_CRON_SECRET,
    process.env.CRON_SECRET,
    process.env.ADMIN_TOKEN,
  ].filter(Boolean);
  if (secrets.length > 0) {
    return secrets.some((s) => bearer === `Bearer ${s}`)
      ? { ok: true }
      : { ok: false, status: 401, error: 'Unauthorized.' };
  }
  // Fail closed in production: an unsecured evolution trigger invites abuse
  // (DB writes, upstream API spend). Non-production stays open for dev/tests.
  if (
    process.env.VERCEL_ENV === 'production' ||
    process.env.NODE_ENV === 'production'
  ) {
    return {
      ok: false,
      status: 503,
      error:
        'CEIS run endpoint is disabled: set CEIS_CRON_SECRET (or ADMIN_TOKEN) in the environment to enable it.',
    };
  }
  return { ok: true };
}

async function handle(req: NextRequest) {
  const auth = authorized(req);
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: auth.error },
      { status: auth.status }
    );
  }

  const dry = req.nextUrl.searchParams.get('dry') === '1';

  try {
    const cycle = await runEvolutionCycle({ persist: !dry });
    return NextResponse.json({
      ok: true,
      dry_run: dry,
      cycle_id: cycle.id,
      stats: cycle.stats,
      overall_evolution_score: cycle.overall_evolution_score,
      proposals: cycle.proposals.map((p) => ({
        id: p.id,
        code: p.code,
        title: p.title,
        score: p.evolution_score.overall,
        priority: p.priority,
      })),
      rejected: cycle.rejected.map(({ principle, verdict }) => ({
        principle: principle.principle,
        reasons: verdict.rejections.map((r) => r.rule),
      })),
    });
  } catch (err: any) {
    console.error('[/api/ceis/run] cycle failed:', err);
    return NextResponse.json(
      { ok: false, error: err?.message || 'Evolution cycle failed.' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  return handle(req);
}

export async function GET(req: NextRequest) {
  return handle(req);
}
