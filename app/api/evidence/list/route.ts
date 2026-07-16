import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const workspaceId = req.nextUrl.searchParams.get('workspace_id');
    const aiSystemId = req.nextUrl.searchParams.get('ai_system_id');
    const obligationId = req.nextUrl.searchParams.get('obligation_id');

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
      .from('evidence')
      .select(
        'id, workspace_id, obligation_id, ai_system_id, title, description, category, evidence_type, status, file_url, external_url, content, tags, created_at, created_by'
      )
      .eq('workspace_id', workspaceId);

    if (aiSystemId) {
      query = query.eq('ai_system_id', aiSystemId);
    }

    if (obligationId) {
      query = query.eq('obligation_id', obligationId);
    }

    const { data: evidence, error } = await query.order('created_at', {
      ascending: false,
    });

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      evidence: evidence || [],
      count: evidence?.length || 0,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || 'Failed to fetch evidence',
      },
      { status: 500 }
    );
  }
}
