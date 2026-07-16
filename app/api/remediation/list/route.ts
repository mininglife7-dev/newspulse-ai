import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const workspaceId = req.nextUrl.searchParams.get('workspace_id');
    const obligationId = req.nextUrl.searchParams.get('obligation_id');
    const status = req.nextUrl.searchParams.get('status');

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
      .from('remediations')
      .select(
        'id, workspace_id, obligation_id, title, description, assigned_to, priority, status, target_completion_date, completed_date, created_at, created_by'
      )
      .eq('workspace_id', workspaceId);

    if (obligationId) {
      query = query.eq('obligation_id', obligationId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data: remediations, error } = await query.order(
      'target_completion_date',
      {
        ascending: true,
      }
    );

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      remediations: remediations || [],
      count: remediations?.length || 0,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || 'Failed to fetch remediations',
      },
      { status: 500 }
    );
  }
}
