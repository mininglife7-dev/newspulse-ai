import { NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface CreateObligationBody {
  assessment_id: string;
  ai_system_id: string;
  obligations: Array<{
    id: string;
    title: string;
    description: string;
    category: string;
    priority: 'critical' | 'high' | 'medium' | 'low';
    effort_estimate: string;
  }>;
}

interface UpdateObligationBody {
  status?: 'identified' | 'in_progress' | 'completed' | 'not_applicable';
  due_date?: string;
  priority?: 'critical' | 'high' | 'medium' | 'low';
}

/**
 * Resolve the caller's workspace and verify access.
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
      error: 'No workspace — complete company setup first',
    };
  }

  return {
    status: 200 as const,
    workspaceId: membership.workspace_id as string,
  };
}

/** GET /api/obligations — list obligations in workspace */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const company_id = searchParams.get('company_id');

  const supabase = createRouteClient();
  const ctx = await resolveContext(supabase);
  if (ctx.status !== 200) {
    return NextResponse.json(
      { ok: false, error: ctx.error },
      { status: ctx.status }
    );
  }

  try {
    let query = supabase
      .from('obligations')
      .select('id, company_id, title, description, status, priority, due_date, created_at, updated_at')
      .eq('workspace_id', ctx.workspaceId);

    if (company_id) {
      query = query.eq('company_id', company_id);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query.order('priority', { ascending: false }).order('created_at', { ascending: false });

    if (error) {
      console.error('[api/obligations] list failed:', error);
      return NextResponse.json(
        { ok: false, error: 'Could not load obligations' },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, obligations: data ?? [] });
  } catch (err: any) {
    console.error('[api/obligations] GET failed:', err);
    return NextResponse.json(
      { ok: false, error: 'Failed to list obligations' },
      { status: 500 }
    );
  }
}

/** POST /api/obligations — create obligations from assessment results */
export async function POST(req: Request) {
  let body: CreateObligationBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  if (!body.assessment_id?.trim() || !body.ai_system_id?.trim() || !body.obligations?.length) {
    return NextResponse.json(
      { ok: false, error: 'assessment_id, ai_system_id, and obligations array are required' },
      { status: 400 }
    );
  }

  const supabase = createRouteClient();
  const ctx = await resolveContext(supabase);
  if (ctx.status !== 200) {
    return NextResponse.json(
      { ok: false, error: ctx.error },
      { status: ctx.status }
    );
  }

  try {
    // Get the AI system to find its company_id
    const { data: aiSystem, error: systemError } = await supabase
      .from('ai_systems')
      .select('company_id')
      .eq('id', body.ai_system_id)
      .eq('workspace_id', ctx.workspaceId)
      .maybeSingle();

    if (systemError || !aiSystem) {
      return NextResponse.json(
        { ok: false, error: 'AI system not found' },
        { status: 404 }
      );
    }

    // Create obligations
    const obligationsToInsert = body.obligations.map((o) => ({
      workspace_id: ctx.workspaceId,
      company_id: aiSystem.company_id,
      title: o.title,
      description: o.description,
      source: 'EU_AI_ACT',
      status: 'identified' as const,
      priority: o.priority,
    }));

    const { data, error } = await supabase
      .from('obligations')
      .insert(obligationsToInsert)
      .select('id, title, status, priority, created_at');

    if (error || !data) {
      console.error('[api/obligations] insert failed:', error);
      return NextResponse.json(
        { ok: false, error: 'Could not create obligations' },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, obligations: data, count: data.length });
  } catch (err: any) {
    console.error('[api/obligations] POST failed:', err);
    return NextResponse.json(
      { ok: false, error: 'Failed to create obligations' },
      { status: 500 }
    );
  }
}

/** PATCH /api/obligations/:id — update obligation status/priority/due_date */
export async function PATCH(req: Request) {
  const url = new URL(req.url);
  const obligationId = url.pathname.split('/').pop();

  if (!obligationId) {
    return NextResponse.json(
      { ok: false, error: 'Obligation ID required' },
      { status: 400 }
    );
  }

  let body: UpdateObligationBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  const supabase = createRouteClient();
  const ctx = await resolveContext(supabase);
  if (ctx.status !== 200) {
    return NextResponse.json(
      { ok: false, error: ctx.error },
      { status: ctx.status }
    );
  }

  try {
    // Verify user has access to this obligation
    const { data: existing } = await supabase
      .from('obligations')
      .select('id')
      .eq('id', obligationId)
      .eq('workspace_id', ctx.workspaceId)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json(
        { ok: false, error: 'Obligation not found' },
        { status: 404 }
      );
    }

    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (body.status) updateData.status = body.status;
    if (body.due_date) updateData.due_date = body.due_date;
    if (body.priority) updateData.priority = body.priority;

    const { data, error } = await supabase
      .from('obligations')
      .update(updateData)
      .eq('id', obligationId)
      .select('id, title, status, priority, due_date, updated_at')
      .single();

    if (error || !data) {
      console.error('[api/obligations] update failed:', error);
      return NextResponse.json(
        { ok: false, error: 'Could not update obligation' },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, obligation: data });
  } catch (err: any) {
    console.error('[api/obligations] PATCH failed:', err);
    return NextResponse.json(
      { ok: false, error: 'Failed to update obligation' },
      { status: 500 }
    );
  }
}
