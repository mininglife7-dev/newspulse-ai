import { NextRequest, NextResponse } from 'next/server';
import { getSearchById, deleteSearchById } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';
import { log, newRequestId } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RouteContext {
  params: { id: string };
}

/** GET /api/history/:id — fetch one saved search, only if it is the caller's. */
export async function GET(_req: NextRequest, { params }: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: 'Sign in to view this search.' },
      { status: 401 }
    );
  }

  const id = params.id;
  if (!id) {
    return NextResponse.json({ ok: false, error: 'Missing id.' }, { status: 400 });
  }

  try {
    const entry = await getSearchById(user.id, id);
    if (!entry) {
      // Not found OR not theirs — identical response, no cross-user leak.
      return NextResponse.json(
        { ok: false, error: 'Search not found.' },
        { status: 404 }
      );
    }
    return NextResponse.json({ ok: true, entry });
  } catch (err: any) {
    log.error('history item load failed', {
      requestId: newRequestId(),
      route: 'GET /api/history/:id',
      userId: user.id,
      dependency: 'supabase',
      status: 500,
    });
    return NextResponse.json(
      { ok: false, error: err?.message || 'Failed to fetch search.' },
      { status: 500 }
    );
  }
}

/** DELETE /api/history/:id — delete one saved search, only if it is the caller's. */
export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: 'Sign in to delete this search.' },
      { status: 401 }
    );
  }

  const id = params.id;
  if (!id) {
    return NextResponse.json({ ok: false, error: 'Missing id.' }, { status: 400 });
  }

  try {
    const result = await deleteSearchById(user.id, id);
    if (!result.ok) {
      const status = result.error === 'Search not found.' ? 404 : 500;
      return NextResponse.json(
        { ok: false, error: result.error || 'Failed to delete search.' },
        { status }
      );
    }
    log.info('history item deleted', {
      requestId: newRequestId(),
      route: 'DELETE /api/history/:id',
      userId: user.id,
      status: 200,
    });
    return NextResponse.json({ ok: true, deleted: id });
  } catch (err: any) {
    log.error('history item delete failed', {
      requestId: newRequestId(),
      route: 'DELETE /api/history/:id',
      userId: user.id,
      dependency: 'supabase',
      status: 500,
    });
    return NextResponse.json(
      { ok: false, error: err?.message || 'Failed to delete search.' },
      { status: 500 }
    );
  }
}
