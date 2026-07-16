import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const runtime = 'nodejs';

interface CreateRemediationRequest {
  workspace_id: string;
  obligation_id: string;
  title: string;
  description?: string;
  assigned_to?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  target_completion_date: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: CreateRemediationRequest = await req.json();

    // Validate required fields
    if (
      !body.workspace_id ||
      !body.obligation_id ||
      !body.title ||
      !body.priority ||
      !body.target_completion_date
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Missing required fields: workspace_id, obligation_id, title, priority, target_completion_date',
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

    // Verify obligation exists in this workspace
    const { data: obligation, error: obligationError } = await supabase
      .from('obligations')
      .select('id')
      .eq('id', body.obligation_id)
      .eq('workspace_id', body.workspace_id)
      .single();

    if (obligationError || !obligation) {
      return NextResponse.json(
        { ok: false, error: 'Obligation not found' },
        { status: 404 }
      );
    }

    // Create remediation action
    const { data: remediation, error: createError } = await supabase
      .from('remediations')
      .insert([
        {
          workspace_id: body.workspace_id,
          obligation_id: body.obligation_id,
          title: body.title,
          description: body.description,
          assigned_to: body.assigned_to,
          priority: body.priority,
          target_completion_date: body.target_completion_date,
          status: 'open',
          created_by: user.id,
        },
      ])
      .select()
      .single();

    if (createError) {
      return NextResponse.json(
        { ok: false, error: createError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        remediation: {
          id: remediation.id,
          obligation_id: remediation.obligation_id,
          title: remediation.title,
          priority: remediation.priority,
          status: remediation.status,
          target_completion_date: remediation.target_completion_date,
          created_at: remediation.created_at,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || 'Failed to create remediation action',
      },
      { status: 500 }
    );
  }
}
