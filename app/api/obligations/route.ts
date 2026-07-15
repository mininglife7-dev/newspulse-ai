import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

async function resolveContext(
  supabase: Awaited<ReturnType<typeof createRouteClient>>
) {
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
      error: 'No workspace yet',
    };
  }

  return {
    status: 200 as const,
    workspaceId: membership.workspace_id as string,
  };
}

/**
 * GET /api/obligations
 * Fetch obligations for a workspace
 * Query params:
 *  - assessmentId: obligations linked to a specific assessment
 *  - systemId: obligations for a specific AI system (via its assessments)
 *  - companyId: obligations for the entire company
 *  - status: filter by status (identified, in_progress, completed, not_applicable)
 */
export async function GET(request: NextRequest) {
  const assessmentId = request.nextUrl.searchParams.get('assessmentId');
  const systemId = request.nextUrl.searchParams.get('systemId');
  const companyId = request.nextUrl.searchParams.get('companyId');
  const status = request.nextUrl.searchParams.get('status');

  const supabase = await createRouteClient();
  const ctx = await resolveContext(supabase);
  if (ctx.status !== 200) {
    return NextResponse.json(
      { ok: false, error: ctx.error },
      { status: ctx.status }
    );
  }

  try {
    if (assessmentId) {
      // Fetch obligations linked to a specific assessment
      const { data, error } = await supabase
        .from('assessment_obligations')
        .select(
          `
          obligation_id,
          obligations (
            id,
            title,
            description,
            source,
            status,
            priority,
            due_date,
            created_at
          )
        `
        )
        .eq('assessment_id', assessmentId);

      if (error) {
        console.error('[api/obligations] query failed:', error);
        return NextResponse.json(
          { ok: false, error: 'Could not load obligations' },
          { status: 500 }
        );
      }

      const obligations = data
        ?.map((item: any) => item.obligations)
        .filter(Boolean)
        .sort((a: any, b: any) => {
          const priorityOrder: Record<string, number> = {
            critical: 0,
            high: 1,
            medium: 2,
            low: 3,
          };
          return (
            (priorityOrder[a.priority as string] || 99) -
            (priorityOrder[b.priority as string] || 99)
          );
        });

      return NextResponse.json({ ok: true, obligations: obligations || [] });
    } else if (systemId) {
      // Fetch obligations via assessment for a system
      const { data: assessments } = await supabase
        .from('risk_assessments')
        .select('id')
        .eq('ai_system_id', systemId)
        .eq('workspace_id', ctx.workspaceId)
        .limit(1);

      if (!assessments || assessments.length === 0) {
        return NextResponse.json({ ok: true, obligations: [] });
      }

      const { data, error } = await supabase
        .from('assessment_obligations')
        .select(
          `
          obligation_id,
          obligations (
            id,
            title,
            description,
            source,
            status,
            priority,
            due_date,
            created_at
          )
        `
        )
        .eq('assessment_id', assessments[0].id);

      if (error) {
        console.error('[api/obligations] query failed:', error);
        return NextResponse.json(
          { ok: false, error: 'Could not load obligations' },
          { status: 500 }
        );
      }

      const obligations = data
        ?.map((item: any) => item.obligations)
        .filter(Boolean)
        .sort((a: any, b: any) => {
          const priorityOrder: Record<string, number> = {
            critical: 0,
            high: 1,
            medium: 2,
            low: 3,
          };
          return (
            (priorityOrder[a.priority as string] || 99) -
            (priorityOrder[b.priority as string] || 99)
          );
        });

      return NextResponse.json({ ok: true, obligations: obligations || [] });
    } else {
      // Fetch all company obligations
      let query = supabase
        .from('obligations')
        .select('*')
        .eq('workspace_id', ctx.workspaceId);

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query.order('priority', {
        ascending: true,
      });

      if (error) {
        console.error('[api/obligations] query failed:', error);
        return NextResponse.json(
          { ok: false, error: 'Could not load obligations' },
          { status: 500 }
        );
      }

      return NextResponse.json({ ok: true, obligations: data || [] });
    }
  } catch (err) {
    console.error('[api/obligations] error:', err);
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch obligations' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/obligations/:id
 * Update an obligation's status and other fields
 * Body: { status?: string, priority?: string, due_date?: string }
 */
export async function PUT(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const obligationId = pathname.split('/').pop();

  if (!obligationId || obligationId === 'route.ts') {
    return NextResponse.json(
      { ok: false, error: 'Obligation ID required' },
      { status: 400 }
    );
  }

  let body: Record<string, any>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  const supabase = await createRouteClient();
  const ctx = await resolveContext(supabase);
  if (ctx.status !== 200) {
    return NextResponse.json(
      { ok: false, error: ctx.error },
      { status: ctx.status }
    );
  }

  try {
    // Verify obligation belongs to user's workspace
    const { data: obligation, error: fetchError } = await supabase
      .from('obligations')
      .select('id, workspace_id')
      .eq('id', obligationId)
      .eq('workspace_id', ctx.workspaceId)
      .maybeSingle();

    if (fetchError || !obligation) {
      return NextResponse.json(
        { ok: false, error: 'Obligation not found' },
        { status: 404 }
      );
    }

    // Build update payload with only provided fields
    const updateData: Record<string, any> = {};
    if (body.status !== undefined) {
      const validStatuses = [
        'identified',
        'in_progress',
        'completed',
        'not_applicable',
      ];
      if (!validStatuses.includes(body.status)) {
        return NextResponse.json(
          {
            ok: false,
            error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
          },
          { status: 400 }
        );
      }
      updateData.status = body.status;
    }
    if (body.priority !== undefined) {
      const validPriorities = ['critical', 'high', 'medium', 'low'];
      if (!validPriorities.includes(body.priority)) {
        return NextResponse.json(
          {
            ok: false,
            error: `Invalid priority. Must be one of: ${validPriorities.join(', ')}`,
          },
          { status: 400 }
        );
      }
      updateData.priority = body.priority;
    }
    if (body.due_date !== undefined) {
      updateData.due_date = body.due_date;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { ok: false, error: 'No fields to update' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('obligations')
      .update(updateData)
      .eq('id', obligationId)
      .select('*')
      .single();

    if (error || !data) {
      console.error('[api/obligations] update failed:', error);
      return NextResponse.json(
        { ok: false, error: 'Failed to update obligation' },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, obligation: data });
  } catch (err) {
    console.error('[api/obligations] error:', err);
    return NextResponse.json(
      { ok: false, error: 'Failed to update obligation' },
      { status: 500 }
    );
  }
}
