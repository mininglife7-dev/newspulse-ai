import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const workspaceId = req.nextUrl.searchParams.get('workspace_id');
    const entityType = req.nextUrl.searchParams.get('entity_type');
    const entityId = req.nextUrl.searchParams.get('entity_id');
    const action = req.nextUrl.searchParams.get('action');
    const limit = parseInt(req.nextUrl.searchParams.get('limit') || '100');

    if (!workspaceId) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Missing required query parameter: workspace_id',
        },
        { status: 400 }
      );
    }

    // Get current authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { ok: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify user has access to this workspace
    const { data: member, error: memberError } = await supabase
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single();

    if (memberError || !member) {
      return NextResponse.json(
        { ok: false, error: 'Access denied to this workspace' },
        { status: 403 }
      );
    }

    // Build query
    let query = supabase
      .from('audit_logs')
      .select(
        'id, user_id, event_type, entity_type, entity_id, action, description, metadata, created_at'
      )
      .eq('workspace_id', workspaceId);

    if (entityType) {
      query = query.eq('entity_type', entityType);
    }

    if (entityId) {
      query = query.eq('entity_id', entityId);
    }

    if (action) {
      query = query.eq('action', action);
    }

    const { data: auditLogs, error } = await query
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      audit_logs: auditLogs || [],
      count: auditLogs?.length || 0,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || 'Failed to fetch audit logs',
      },
      { status: 500 }
    );
  }
}
