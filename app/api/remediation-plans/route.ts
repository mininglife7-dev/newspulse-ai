import { NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase-server';
import { logAuditEvent } from '@/lib/audit-log';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface CreateRemediationPlanBody {
  title: string;
  description?: string;
  owner?: string;
  target_date?: string;
  obligation_text?: string;
}

/**
 * Resolve the caller's active workspace and company.
 */
async function resolveContext(supabase: ReturnType<typeof createRouteClient>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: 401 as const, error: 'Authentication required' };

  const { data: membership } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle();

  if (!membership) {
    return {
      status: 409 as const,
      error: 'No workspace yet — complete company setup first',
    };
  }

  const { data: company } = await supabase
    .from('companies')
    .select('id')
    .eq('workspace_id', membership.workspace_id)
    .limit(1)
    .maybeSingle();

  return {
    status: 200 as const,
    workspaceId: membership.workspace_id as string,
    companyId: (company?.id as string) ?? null,
  };
}

/** GET /api/remediation-plans — list remediation plans for workspace */
export async function GET(req: Request) {
  const supabase = createRouteClient();
  const ctx = await resolveContext(supabase);
  if (ctx.status !== 200) {
    return NextResponse.json(
      { ok: false, error: ctx.error },
      { status: ctx.status }
    );
  }

  const { data, error } = await supabase
    .from('remediation_plans')
    .select('*')
    .eq('workspace_id', ctx.workspaceId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[api/remediation-plans] list failed:', error);
    return NextResponse.json(
      { ok: false, error: 'Could not load remediation plans' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    plans: data || [],
  });
}

/** POST /api/remediation-plans — create a new remediation plan */
export async function POST(req: Request) {
  const supabase = createRouteClient();
  const ctx = await resolveContext(supabase);
  if (ctx.status !== 200) {
    return NextResponse.json(
      { ok: false, error: ctx.error },
      { status: ctx.status }
    );
  }

  let body: CreateRemediationPlanBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Invalid request body' },
      { status: 400 }
    );
  }

  // Validate required fields
  if (!body.title) {
    return NextResponse.json(
      { ok: false, error: 'Title is required' },
      { status: 400 }
    );
  }

  // Create remediation plan
  const { data, error } = await supabase
    .from('remediation_plans')
    .insert({
      company_id: ctx.companyId,
      workspace_id: ctx.workspaceId,
      title: body.title,
      description: body.description || null,
      owner: body.owner || null,
      target_date: body.target_date || null,
      status: 'planned',
      action_items: [],
    })
    .select();

  if (error) {
    console.error('[api/remediation-plans] insert failed:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to create remediation plan' },
      { status: 500 }
    );
  }

  // Log audit event
  const plan = data?.[0];
  if (plan) {
    const user = (await supabase.auth.getUser()).data.user;
    await logAuditEvent(
      supabase,
      ctx.workspaceId,
      user?.id || '',
      'plan_created',
      'remediation_plan',
      plan.id,
      body.title,
      {
        owner: body.owner || null,
        target_date: body.target_date || null,
      }
    );
  }

  return NextResponse.json(
    {
      ok: true,
      plan: data?.[0],
    },
    { status: 201 }
  );
}
