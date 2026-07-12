import { NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase-server';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/remediation-plans/[id]
 * Retrieve a specific remediation plan with actions
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

  // Fetch plan and verify access
  const { data: plan, error: planError } = await supabase
    .from('remediation_plans')
    .select('id, company_id, obligation_id, title, description, status, priority, target_completion_date, created_at, updated_at')
    .eq('id', id)
    .maybeSingle();

  if (planError || !plan) {
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
    // Fetch actions for this plan
    const { data: actions, error: actionsError } = await supabase
      .from('remediation_actions')
      .select('id, remediation_plan_id, title, status, due_date, completed_at, created_at')
      .eq('remediation_plan_id', id)
      .order('created_at', { ascending: true });

    if (actionsError) {
      throw new Error(`Failed to fetch actions: ${actionsError.message}`);
    }

    const completedActions = (actions || []).filter((a) => a.status === 'completed').length;
    const totalActions = actions?.length || 0;

    return NextResponse.json({
      ok: true,
      plan: {
        ...plan,
        actions: actions || [],
        actionProgress: {
          completed: completedActions,
          total: totalActions,
          percentage: totalActions > 0 ? Math.round((completedActions / totalActions) * 100) : 0,
        },
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[api/remediation-plans/[id]] fetch failed:', message);

    return NextResponse.json(
      {
        ok: false,
        error: 'Failed to fetch remediation plan',
        message,
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/remediation-plans/[id]
 * Update a remediation plan
 */
export async function PATCH(req: Request, context: RouteContext) {
  const { params: paramsPromise } = context;
  const { id } = await paramsPromise;

  let body: {
    title?: string;
    description?: string;
    status?: string;
    priority?: string;
    target_completion_date?: string;
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

  // Fetch plan and verify access
  const { data: plan, error: planError } = await supabase
    .from('remediation_plans')
    .select('id, company_id')
    .eq('id', id)
    .maybeSingle();

  if (planError || !plan) {
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

    if (body.description !== undefined) {
      updateData.description = body.description || null;
    }

    if (body.status) {
      updateData.status = body.status;
    }

    if (body.priority) {
      updateData.priority = body.priority;
    }

    if (body.target_completion_date !== undefined) {
      updateData.target_completion_date = body.target_completion_date || null;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ ok: false, error: 'No fields to update' }, { status: 400 });
    }

    updateData.updated_at = new Date().toISOString();

    const { data: updated, error: updateError } = await supabase
      .from('remediation_plans')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Failed to update remediation plan: ${updateError.message}`);
    }

    return NextResponse.json({
      ok: true,
      plan: updated,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[api/remediation-plans/[id]] update failed:', message);

    return NextResponse.json(
      {
        ok: false,
        error: 'Failed to update remediation plan',
        message,
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/remediation-plans/[id]
 * Delete a remediation plan
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

  // Fetch plan and verify access
  const { data: plan, error: planError } = await supabase
    .from('remediation_plans')
    .select('id, company_id')
    .eq('id', id)
    .maybeSingle();

  if (planError || !plan) {
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
    // Delete associated actions first
    await supabase.from('remediation_actions').delete().eq('remediation_plan_id', id);

    // Delete the plan
    const { error: deleteError } = await supabase
      .from('remediation_plans')
      .delete()
      .eq('id', id);

    if (deleteError) {
      throw new Error(`Failed to delete remediation plan: ${deleteError.message}`);
    }

    return NextResponse.json({
      ok: true,
      message: 'Remediation plan deleted successfully',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[api/remediation-plans/[id]] delete failed:', message);

    return NextResponse.json(
      {
        ok: false,
        error: 'Failed to delete remediation plan',
        message,
      },
      { status: 500 }
    );
  }
}
