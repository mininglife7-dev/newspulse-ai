import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const runtime = 'nodejs';

interface UpdateRemediationRequest {
  id: string;
  workspace_id: string;
  description?: string;
  assigned_to?: string | null;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  status?: 'open' | 'in_progress' | 'completed' | 'blocked';
  target_completion_date?: string;
  completed_date?: string | null;
}

export async function PUT(req: NextRequest) {
  try {
    const body: UpdateRemediationRequest = await req.json();

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

    // Verify remediation exists in this workspace
    const { data: remediation, error: fetchError } = await supabase
      .from('remediations')
      .select('id')
      .eq('id', body.id)
      .eq('workspace_id', body.workspace_id)
      .single();

    if (fetchError || !remediation) {
      return NextResponse.json(
        { ok: false, error: 'Remediation not found' },
        { status: 404 }
      );
    }

    // Build update object with only provided fields
    const updateData: any = {};
    if (body.description !== undefined)
      updateData.description = body.description;
    if (body.assigned_to !== undefined)
      updateData.assigned_to = body.assigned_to;
    if (body.priority !== undefined) updateData.priority = body.priority;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.target_completion_date !== undefined)
      updateData.target_completion_date = body.target_completion_date;
    if (body.completed_date !== undefined)
      updateData.completed_date = body.completed_date;

    // Update remediation record
    const { data: updated, error: updateError } = await supabase
      .from('remediations')
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
        remediation: {
          id: updated.id,
          title: updated.title,
          priority: updated.priority,
          status: updated.status,
          target_completion_date: updated.target_completion_date,
          completed_date: updated.completed_date,
          updated_at: updated.updated_at,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || 'Failed to update remediation',
      },
      { status: 500 }
    );
  }
}
