import { NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function resolveContext(supabase: ReturnType<typeof createRouteClient>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: 401 as const, error: 'Authentication required' };

  const { data: membership } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle();

  if (!membership) {
    return {
      status: 409 as const,
      error: 'No workspace yet — complete company setup first',
    };
  }

  return {
    status: 200 as const,
    user,
    workspaceId: membership.workspace_id as string,
  };
}

export async function GET(req: Request) {
  const supabase = createRouteClient();
  const ctx = await resolveContext(supabase);
  if (ctx.status !== 200) {
    return NextResponse.json(
      { ok: false, error: ctx.error },
      { status: ctx.status }
    );
  }

  try {
    const url = new URL(req.url);
    const unreadOnly = url.searchParams.get('unread_only') === 'true';
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
    const offset = parseInt(url.searchParams.get('offset') || '0');

    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', ctx.user.id)
      .order('created_at', { ascending: false });

    if (unreadOnly) {
      query = query.eq('is_read', false);
    }

    const { data, error, count } = await query
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('[api/notifications] fetch failed:', error);
      return NextResponse.json(
        { ok: false, error: 'Could not load notifications' },
        { status: 500 }
      );
    }

    const unreadCount = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', ctx.user.id)
      .eq('is_read', false);

    return NextResponse.json({
      ok: true,
      notifications: data || [],
      total: count || 0,
      unreadCount: unreadCount.count || 0,
    });
  } catch (err) {
    console.error('[api/notifications] error:', err);
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  const supabase = createRouteClient();
  const ctx = await resolveContext(supabase);
  if (ctx.status !== 200) {
    return NextResponse.json(
      { ok: false, error: ctx.error },
      { status: ctx.status }
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Invalid request body' },
      { status: 400 }
    );
  }

  const { notificationId, isRead } = body;
  if (!notificationId) {
    return NextResponse.json(
      { ok: false, error: 'Notification ID is required' },
      { status: 400 }
    );
  }

  try {
    const updateData: any = {
      is_read: isRead === true,
    };

    if (isRead === true) {
      updateData.read_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('notifications')
      .update(updateData)
      .eq('id', notificationId)
      .eq('user_id', ctx.user.id)
      .select();

    if (error || !data || data.length === 0) {
      return NextResponse.json(
        { ok: false, error: 'Notification not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      notification: data[0],
    });
  } catch (err) {
    console.error('[api/notifications] update failed:', err);
    return NextResponse.json(
      { ok: false, error: 'Failed to update notification' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  const supabase = createRouteClient();
  const ctx = await resolveContext(supabase);
  if (ctx.status !== 200) {
    return NextResponse.json(
      { ok: false, error: ctx.error },
      { status: ctx.status }
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Invalid request body' },
      { status: 400 }
    );
  }

  const { notificationId } = body;
  if (!notificationId) {
    return NextResponse.json(
      { ok: false, error: 'Notification ID is required' },
      { status: 400 }
    );
  }

  try {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId)
      .eq('user_id', ctx.user.id);

    if (error) {
      console.error('[api/notifications] delete failed:', error);
      return NextResponse.json(
        { ok: false, error: 'Failed to delete notification' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
    });
  } catch (err) {
    console.error('[api/notifications] delete failed:', err);
    return NextResponse.json(
      { ok: false, error: 'Failed to delete notification' },
      { status: 500 }
    );
  }
}
