import { NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/remediation-plans
 * List remediation plans for a company
 *
 * Query params:
 * - company_id: Company to list plans for (required)
 * - obligation_id: Filter by obligation (optional)
 * - status: Filter by status (optional)
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const companyId = url.searchParams.get('company_id');
  const obligationId = url.searchParams.get('obligation_id');
  const status = url.searchParams.get('status');

  if (!companyId) {
    return NextResponse.json(
      { ok: false, error: 'company_id is required' },
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

  // Verify user has access to the company
  const { data: company, error: companyError } = await supabase
    .from('companies')
    .select('id, workspace_id')
    .eq('id', companyId)
    .maybeSingle();

  if (companyError || !company) {
    return NextResponse.json(
      { ok: false, error: 'Company not found' },
      { status: 404 }
    );
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
    let query = supabase
      .from('remediation_plans')
      .select('id, company_id, obligation_id, title, description, status, priority, target_completion_date, created_at, updated_at')
      .eq('company_id', companyId);

    if (obligationId) {
      query = query.eq('obligation_id', obligationId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data: plans, error: plansError } = await query.order('created_at', { ascending: false });

    if (plansError) {
      throw new Error(`Failed to fetch remediation plans: ${plansError.message}`);
    }

    // Fetch action counts for each plan
    const plansWithActions = await Promise.all(
      (plans || []).map(async (plan) => {
        const { data: actions } = await supabase
          .from('remediation_actions')
          .select('id, status')
          .eq('remediation_plan_id', plan.id);

        const completedActions = actions?.filter((a) => a.status === 'completed').length || 0;
        const totalActions = actions?.length || 0;

        return {
          ...plan,
          actionProgress: {
            completed: completedActions,
            total: totalActions,
            percentage: totalActions > 0 ? Math.round((completedActions / totalActions) * 100) : 0,
          },
        };
      })
    );

    return NextResponse.json({
      ok: true,
      companyId,
      plans: plansWithActions,
      count: plansWithActions.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[api/remediation-plans] list failed:', message);

    return NextResponse.json(
      {
        ok: false,
        error: 'Failed to list remediation plans',
        message,
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/remediation-plans
 * Create a new remediation plan
 *
 * Request body:
 * {
 *   "company_id": "uuid",
 *   "obligation_id": "uuid",
 *   "title": "Plan title",
 *   "description": "Plan details",
 *   "priority": "critical" | "high" | "medium" | "low",
 *   "target_completion_date": "2026-12-31"
 * }
 */
export async function POST(req: Request) {
  let body: {
    company_id: string;
    obligation_id: string;
    title: string;
    description?: string;
    priority?: string;
    target_completion_date?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  // Validate required fields
  if (!body.company_id) {
    return NextResponse.json({ ok: false, error: 'company_id is required' }, { status: 400 });
  }

  if (!body.obligation_id) {
    return NextResponse.json({ ok: false, error: 'obligation_id is required' }, { status: 400 });
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

  // Verify user has access to the company
  const { data: company, error: companyError } = await supabase
    .from('companies')
    .select('id, workspace_id')
    .eq('id', body.company_id)
    .maybeSingle();

  if (companyError || !company) {
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

  // Verify obligation exists and belongs to company
  const { data: obligation } = await supabase
    .from('obligations')
    .select('id')
    .eq('id', body.obligation_id)
    .eq('company_id', body.company_id)
    .maybeSingle();

  if (!obligation) {
    return NextResponse.json({ ok: false, error: 'Obligation not found' }, { status: 404 });
  }

  try {
    const { data: plan, error: planError } = await supabase
      .from('remediation_plans')
      .insert({
        company_id: body.company_id,
        obligation_id: body.obligation_id,
        title: body.title.trim(),
        description: body.description || null,
        status: 'active',
        priority: body.priority || 'medium',
        target_completion_date: body.target_completion_date || null,
      })
      .select()
      .single();

    if (planError) {
      throw new Error(`Failed to create remediation plan: ${planError.message}`);
    }

    return NextResponse.json(
      {
        ok: true,
        plan: {
          ...plan,
          actionProgress: {
            completed: 0,
            total: 0,
            percentage: 0,
          },
        },
      },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[api/remediation-plans] creation failed:', message);

    return NextResponse.json(
      {
        ok: false,
        error: 'Failed to create remediation plan',
        message,
      },
      { status: 500 }
    );
  }
}
