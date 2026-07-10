import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const runtime = 'nodejs';

interface UpdateEvidenceRequest {
  id: string;
  workspace_id: string;
  description?: string;
  obligation_id?: string | null;
  tags?: string[];
  status?: 'submitted' | 'reviewing' | 'approved' | 'rejected';
}

export async function PUT(req: NextRequest) {
  try {
    const body: UpdateEvidenceRequest = await req.json();

    // Validate required fields
    if (!body.id || !body.workspace_id) {
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
      .eq('workspace_id', body.workspace_id)
      .eq('user_id', user.id)
      .single();

    if (memberError || !member) {
      return NextResponse.json(
        { ok: false, error: 'Access denied to this workspace' },
        { status: 403 }
      );
    }

    // Verify evidence exists in this workspace
    const { data: evidence, error: fetchError } = await supabase
      .from('evidence')
      .select('id')
      .eq('id', body.id)
      .eq('workspace_id', body.workspace_id)
      .single();

    if (fetchError || !evidence) {
      return NextResponse.json(
        { ok: false, error: 'Evidence not found' },
        { status: 404 }
      );
    }

    // Build update object with only provided fields
    const updateData: any = {};
    if (body.description !== undefined) updateData.description = body.description;
    if (body.obligation_id !== undefined) updateData.obligation_id = body.obligation_id;
    if (body.tags !== undefined) updateData.tags = body.tags;
    if (body.status !== undefined) updateData.status = body.status;

    // Update evidence record
    const { data: updated, error: updateError } = await supabase
      .from('evidence')
      .update(updateData)
      .eq('id', body.id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { ok: false, error: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        evidence: {
          id: updated.id,
          title: updated.title,
          category: updated.category,
          status: updated.status,
          obligation_id: updated.obligation_id,
          updated_at: updated.updated_at,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || 'Failed to update evidence',
      },
      { status: 500 }
    );
  }
}
