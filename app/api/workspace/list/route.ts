import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
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

    // Fetch user's workspace memberships
    const { data: memberships, error: memberError } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', user.id);

    if (memberError) {
      return NextResponse.json(
        { ok: false, error: memberError.message },
        { status: 500 }
      );
    }

    const workspaceIds = memberships?.map((m) => m.workspace_id) || [];

    if (workspaceIds.length === 0) {
      return NextResponse.json({
        ok: true,
        workspaces: [],
      });
    }

    // Fetch user's workspaces
    const { data: workspaces, error } = await supabase
      .from('workspaces')
      .select('id, name, legal_name, country, industry, created_at')
      .in('id', workspaceIds);

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      workspaces: workspaces || [],
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || 'Failed to fetch workspaces',
      },
      { status: 500 }
    );
  }
}
