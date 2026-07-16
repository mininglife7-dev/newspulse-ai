import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const runtime = 'nodejs';

interface LogEventRequest {
  workspace_id: string;
  event_type: string;
  entity_type:
    | 'ai_system'
    | 'obligation'
    | 'evidence'
    | 'remediation'
    | 'workspace'
    | 'member';
  entity_id: string;
  action:
    'created' | 'updated' | 'deleted' | 'reviewed' | 'approved' | 'rejected';
  description?: string;
  metadata?: Record<string, any>;
}

export async function POST(req: NextRequest) {
  try {
    const body: LogEventRequest = await req.json();

    // Validate required fields
    if (
      !body.workspace_id ||
      !body.event_type ||
      !body.entity_type ||
      !body.entity_id ||
      !body.action
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Missing required fields: workspace_id, event_type, entity_type, entity_id, action',
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

    // Create audit log entry
    const { data: auditLog, error: createError } = await supabase
      .from('audit_logs')
      .insert([
        {
          workspace_id: body.workspace_id,
          user_id: user.id,
          event_type: body.event_type,
          entity_type: body.entity_type,
          entity_id: body.entity_id,
          action: body.action,
          description: body.description,
          metadata: body.metadata || {},
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
        audit_log: {
          id: auditLog.id,
          event_type: auditLog.event_type,
          action: auditLog.action,
          created_at: auditLog.created_at,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || 'Failed to create audit log',
      },
      { status: 500 }
    );
  }
}
