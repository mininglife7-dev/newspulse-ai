import { NextRequest, NextResponse } from 'next/server';
import { getSearchHistory, clearAllHistory } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';
import { log, newRequestId } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/history?limit=50 — list the signed-in customer's own searches. */
export async function GET(req: NextRequest) {
  const requestId = newRequestId();
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: 'Sign in to view your history.' },
      { status: 401 }
    );
  }

  const url = new URL(req.url);
  const limitParam = url.searchParams.get('limit');
  const limit = Math.max(
    1,
    Math.min(Number.parseInt(limitParam ?? '50', 10) || 50, 200)
  );

  try {
    const history = await getSearchHistory(user.id, limit);
    return NextResponse.json({ ok: true, count: history.length, history });
  } catch (err: any) {
    log.error('history load failed', {
      requestId,
      route: 'GET /api/history',
      userId: user.id,
      dependency: 'supabase',
      status: 500,
    });
    return NextResponse.json(
      { ok: false, error: err?.message || 'Failed to load search history.' },
      { status: 500 }
    );
  }
}

/** DELETE /api/history — wipe ONLY the signed-in customer's saved searches. */
export async function DELETE() {
  const requestId = newRequestId();
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: 'Sign in to clear your history.' },
      { status: 401 }
    );
  }

  try {
    const result = await clearAllHistory(user.id);
    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.error || 'Failed to clear history.' },
        { status: 500 }
      );
    }
    log.info('history cleared', {
      requestId,
      route: 'DELETE /api/history',
      userId: user.id,
      status: 200,
      count: result.deleted ?? 0,
    });
    return NextResponse.json({ ok: true, deleted: result.deleted ?? 0 });
  } catch (err: any) {
    log.error('history clear failed', {
      requestId,
      route: 'DELETE /api/history',
      userId: user.id,
      dependency: 'supabase',
      status: 500,
    });
    return NextResponse.json(
      { ok: false, error: err?.message || 'Failed to clear history.' },
      { status: 500 }
    );
  }
}
