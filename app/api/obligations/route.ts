import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

async function resolveContext(supabase: Awaited<ReturnType<typeof createRouteClient>>) {
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
          const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
          return (priorityOrder[a.priority as string] || 99) - (priorityOrder[b.priority as string] || 99);
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
          const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
          return (priorityOrder[a.priority as string] || 99) - (priorityOrder[b.priority as string] || 99);
        });

      return NextResponse.json({ ok: true, obligations: obligations || [] });
    } else {
      // Fetch all company obligations
      let query = supabase.from('obligations').select('*').eq('workspace_id', ctx.workspaceId);

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query.order('priority', { ascending: true });

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
