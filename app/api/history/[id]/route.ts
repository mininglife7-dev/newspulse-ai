import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json(
      { ok: false, error: 'Missing id.' },
      { status: 400 }
    );
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('news_searches')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('[/api/history/:id] supabase error:', error);
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }
    if (!data) {
      return NextResponse.json(
        { ok: false, error: 'Search not found.' },
        { status: 404 }
      );
    }
    return NextResponse.json({ ok: true, entry: data });
  } catch (err: any) {
    console.error('[/api/history/:id] exception:', err);
    return NextResponse.json(
      { ok: false, error: err?.message || 'Failed to fetch search.' },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json(
      { ok: false, error: 'Missing id.' },
      { status: 400 }
    );
  }

  try {
    const supabase = getSupabaseAdmin();
    // .select() returns the deleted rows, so a no-op delete (row already
    // gone / never existed) is reported as 404 instead of a false success.
    const { data, error } = await supabase
      .from('news_searches')
      .delete()
      .eq('id', id)
      .select('id');

    if (error) {
      console.error('[/api/history/:id] delete error:', error);
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }
    if (!data || data.length === 0) {
      return NextResponse.json(
        { ok: false, error: 'Search not found.' },
        { status: 404 }
      );
    }
    return NextResponse.json({ ok: true, deleted: id });
  } catch (err: any) {
    console.error('[/api/history/:id] delete exception:', err);
    return NextResponse.json(
      { ok: false, error: err?.message || 'Failed to delete search.' },
      { status: 500 }
    );
  }
}
