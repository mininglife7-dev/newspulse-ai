import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { checkAdmin } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RouteContext {
  params: { id: string };
}

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const id = params.id;
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

export async function DELETE(req: NextRequest, { params }: RouteContext) {
  const admin = checkAdmin(req.headers);
  if (!admin.ok) {
    return NextResponse.json(
      { ok: false, error: admin.error, code: admin.code },
      { status: admin.status }
    );
  }

  const id = params.id;
  if (!id) {
    return NextResponse.json(
      { ok: false, error: 'Missing id.' },
      { status: 400 }
    );
  }

  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from('news_searches')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[/api/history/:id] delete error:', error);
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
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
