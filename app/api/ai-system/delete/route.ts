import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const runtime = 'nodejs';

export async function DELETE(req: NextRequest) {
  try {
    const { id, workspace_id } = await req.json();

    // Validate required fields
    if (!id || !workspace_id) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Missing required fields: id, workspace_id',
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
      .eq('workspace_id', workspace_id)
      .eq('user_id', user.id)
      .single();

    if (memberError || !member) {
      return NextResponse.json(
        { ok: false, error: 'Access denied to this workspace' },
        { status: 403 }
      );
    }

    // Delete AI system
    const { error: deleteError } = await supabase
      .from('ai_systems')
      .delete()
      .eq('id', id)
      .eq('workspace_id', workspace_id);

    if (deleteError) {
      return NextResponse.json(
        { ok: false, error: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: 'AI system deleted successfully',
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || 'Failed to delete AI system',
      },
      { status: 500 }
    );
  }
}
