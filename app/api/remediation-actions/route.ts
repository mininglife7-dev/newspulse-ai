import { NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/remediation-actions
 * List remediation actions for a plan
 *
 * Query params:
 * - remediation_plan_id: Plan to list actions for (required)
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const remediationPlanId = url.searchParams.get('remediation_plan_id');

  if (!remediationPlanId) {
    return NextResponse.json(
      { ok: false, error: 'remediation_plan_id is required' },
      { status: 400 }
    );
  }

  const supabase = await createRouteClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: 'Authentication required' }, { status: 401 });
  }

  // Verify plan exists and user has access
  const { data: plan } = await supabase
    .from('remediation_plans')
    .select('id, company_id')
    .eq('id', remediationPlanId)
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
    const { data: actions, error: actionsError } = await supabase
      .from('remediation_actions')
      .select('id, remediation_plan_id, title, status, due_date, completed_at, created_at, updated_at')
      .eq('remediation_plan_id', remediationPlanId)
      .order('created_at', { ascending: true });

    if (actionsError) {
      throw new Error(`Failed to fetch actions: ${actionsError.message}`);
    }

    return NextResponse.json({
      ok: true,
      remediationPlanId,
      actions: actions || [],
      count: actions?.length || 0,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[api/remediation-actions] list failed:', message);

    return NextResponse.json(
      {
        ok: false,
        error: 'Failed to list remediation actions',
        message,
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/remediation-actions
 * Create a new remediation action
 *
 * Request body:
 * {
 *   "remediation_plan_id": "uuid",
 *   "title": "Action title",
 *   "due_date": "2026-12-31"
 * }
 */
export async function POST(req: Request) {
  let body: {
    remediation_plan_id: string;
    title: string;
    due_date?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  // Validate required fields
  if (!body.remediation_plan_id) {
    return NextResponse.json({ ok: false, error: 'remediation_plan_id is required' }, { status: 400 });
  }

  if (!body.title || body.title.trim().length === 0) {
    return NextResponse.json({ ok: false, error: 'title is required' }, { status: 400 });
  }

  const supabase = await createRouteClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: 'Authentication required' }, { status: 401 });
  }

  // Verify plan exists and user has access
  const { data: plan } = await supabase
    .from('remediation_plans')
    .select('id, company_id')
    .eq('id', body.remediation_plan_id)
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
    const { data: action, error: actionError } = await supabase
      .from('remediation_actions')
      .insert({
        remediation_plan_id: body.remediation_plan_id,
        title: body.title.trim(),
        status: 'pending',
        due_date: body.due_date || null,
      })
      .select()
      .single();

    if (actionError) {
      throw new Error(`Failed to create action: ${actionError.message}`);
    }

    return NextResponse.json(
      {
        ok: true,
        action,
      },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[api/remediation-actions] creation failed:', message);

    return NextResponse.json(
      {
        ok: false,
        error: 'Failed to create remediation action',
        message,
      },
      { status: 500 }
    );
  }
}
