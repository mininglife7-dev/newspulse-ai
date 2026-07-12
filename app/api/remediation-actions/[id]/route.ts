import { NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase-server';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/remediation-actions/[id]
 * Retrieve a specific remediation action
 */
export async function GET(req: Request, context: RouteContext) {
  const { params: paramsPromise } = context;
  const { id } = await paramsPromise;

  const supabase = await createRouteClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: 'Authentication required' }, { status: 401 });
  }

  // Fetch action and verify access
  const { data: action, error: actionError } = await supabase
    .from('remediation_actions')
    .select('id, remediation_plan_id, title, status, due_date, completed_at, created_at, updated_at')
    .eq('id', id)
    .maybeSingle();

  if (actionError || !action) {
    return NextResponse.json({ ok: false, error: 'Remediation action not found' }, { status: 404 });
  }

  // Fetch plan to verify access
  const { data: plan } = await supabase
    .from('remediation_plans')
    .select('id, company_id')
    .eq('id', action.remediation_plan_id)
    .maybeSingle();

  if (!plan) {
    return NextResponse.json({ ok: false, error: 'Remediation plan not found' }, { status: 404 });
  }

  // Verify user has access to the company
  const { data: company } = await supabase
    .from('companies')
    .select('id, workspace_id')
    .eq('id', plan.company_id)
    .maybeSingle();

  if (!company) {
    return NextResponse.json({ ok: false, error: 'Company not found' }, { status: 404 });
  }

  // Verify user is member of workspace
  const { data: membership } = await supabase
    .from('workspace_members')
    .select('id')
    .eq('workspace_id', company.workspace_id)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle();

  if (!membership) {
    return NextResponse.json({ ok: false, error: 'Access denied' }, { status: 403 });
  }

  return NextResponse.json({
    ok: true,
    action,
  });
}

/**
 * PATCH /api/remediation-actions/[id]
 * Update a remediation action
 */
export async function PATCH(req: Request, context: RouteContext) {
  const { params: paramsPromise } = context;
  const { id } = await paramsPromise;

  let body: {
    title?: string;
    status?: string;
    due_date?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const supabase = await createRouteClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: 'Authentication required' }, { status: 401 });
  }

  // Fetch action and verify access
  const { data: action, error: actionError } = await supabase
    .from('remediation_actions')
    .select('id, remediation_plan_id')
    .eq('id', id)
    .maybeSingle();

  if (actionError || !action) {
    return NextResponse.json({ ok: false, error: 'Remediation action not found' }, { status: 404 });
  }

  // Fetch plan to verify access
  const { data: plan } = await supabase
    .from('remediation_plans')
    .select('id, company_id')
    .eq('id', action.remediation_plan_id)
    .maybeSingle();

  if (!plan) {
    return NextResponse.json({ ok: false, error: 'Remediation plan not found' }, { status: 404 });
  }

  // Verify user has access to the company
  const { data: company } = await supabase
    .from('companies')
    .select('id, workspace_id')
    .eq('id', plan.company_id)
    .maybeSingle();

  if (!company) {
    return NextResponse.json({ ok: false, error: 'Company not found' }, { status: 404 });
  }

  // Verify user is member of workspace
  const { data: membership } = await supabase
    .from('workspace_members')
    .select('id')
    .eq('workspace_id', company.workspace_id)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle();

  if (!membership) {
    return NextResponse.json({ ok: false, error: 'Access denied' }, { status: 403 });
  }

  try {
    const updateData: Record<string, any> = {};

    if (body.title) {
      updateData.title = body.title.trim();
    }

    if (body.status) {
      updateData.status = body.status;
      if (body.status === 'completed') {
        updateData.completed_at = new Date().toISOString();
      } else if (body.status === 'pending') {
        updateData.completed_at = null;
      }
    }

    if (body.due_date !== undefined) {
      updateData.due_date = body.due_date || null;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ ok: false, error: 'No fields to update' }, { status: 400 });
    }

    updateData.updated_at = new Date().toISOString();

    const { data: updated, error: updateError } = await supabase
      .from('remediation_actions')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Failed to update action: ${updateError.message}`);
    }

    return NextResponse.json({
      ok: true,
      action: updated,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[api/remediation-actions/[id]] update failed:', message);

    return NextResponse.json(
      {
        ok: false,
        error: 'Failed to update remediation action',
        message,
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/remediation-actions/[id]
 * Delete a remediation action
 */
export async function DELETE(req: Request, context: RouteContext) {
  const { params: paramsPromise } = context;
  const { id } = await paramsPromise;

  const supabase = await createRouteClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: 'Authentication required' }, { status: 401 });
  }

  // Fetch action and verify access
  const { data: action, error: actionError } = await supabase
    .from('remediation_actions')
    .select('id, remediation_plan_id')
    .eq('id', id)
    .maybeSingle();

  if (actionError || !action) {
    return NextResponse.json({ ok: false, error: 'Remediation action not found' }, { status: 404 });
  }

  // Fetch plan to verify access
  const { data: plan } = await supabase
    .from('remediation_plans')
    .select('id, company_id')
    .eq('id', action.remediation_plan_id)
    .maybeSingle();

  if (!plan) {
    return NextResponse.json({ ok: false, error: 'Remediation plan not found' }, { status: 404 });
  }

  // Verify user has access to the company
  const { data: company } = await supabase
    .from('companies')
    .select('id, workspace_id')
    .eq('id', plan.company_id)
    .maybeSingle();

  if (!company) {
    return NextResponse.json({ ok: false, error: 'Company not found' }, { status: 404 });
  }

  // Verify user is member of workspace
  const { data: membership } = await supabase
    .from('workspace_members')
    .select('id')
    .eq('workspace_id', company.workspace_id)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle();

  if (!membership) {
    return NextResponse.json({ ok: false, error: 'Access denied' }, { status: 403 });
  }

  try {
    const { error: deleteError } = await supabase
      .from('remediation_actions')
      .delete()
      .eq('id', id);

    if (deleteError) {
      throw new Error(`Failed to delete action: ${deleteError.message}`);
    }

    return NextResponse.json({
      ok: true,
      message: 'Remediation action deleted successfully',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[api/remediation-actions/[id]] delete failed:', message);

    return NextResponse.json(
      {
        ok: false,
        error: 'Failed to delete remediation action',
        message,
      },
      { status: 500 }
    );
  }
}
