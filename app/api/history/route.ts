import { NextRequest, NextResponse } from 'next/server';
import { getSearchHistory, clearAllHistory } from '@/lib/supabase';
import { checkAdmin } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/history?limit=50 — list recent searches */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const limitParam = url.searchParams.get('limit');
  const limit = Math.max(
    1,
    Math.min(Number.parseInt(limitParam ?? '50', 10) || 50, 200)
  );

  try {
    const history = await getSearchHistory(limit);
    return NextResponse.json({
      ok: true,
      count: history.length,
      history,
    });
  } catch (err: any) {
    console.error('[/api/history] error:', err);
    return NextResponse.json(
      { ok: false, error: err?.message || 'Failed to load search history.' },
      { status: 500 }
    );
  }
}

/** DELETE /api/history — wipe every saved search ("Clear History"). Admin-only. */
export async function DELETE(req: NextRequest) {
  const admin = checkAdmin(req.headers);
  if (!admin.ok) {
    return NextResponse.json(
      { ok: false, error: admin.error, code: admin.code },
      { status: admin.status }
    );
  }

  try {
    const result = await clearAllHistory();
    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.error || 'Failed to clear history.' },
        { status: 500 }
      );
    }
    return NextResponse.json({
      ok: true,
      deleted: result.deleted ?? 0,
    });
  } catch (err: any) {
    console.error('[/api/history] DELETE error:', err);
    return NextResponse.json(
      { ok: false, error: err?.message || 'Failed to clear history.' },
      { status: 500 }
    );
  }
}
