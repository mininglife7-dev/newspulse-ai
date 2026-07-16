import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase-server';
import { logger } from '@/lib/logger';
import { validators, validate } from '@/lib/input-validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const OBLIGATION_STATUS = ['identified', 'in_progress', 'completed', 'not_applicable'] as const;
const PRIORITY_ORDER: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

interface Obligation {
  id: string;
  title: string;
  description: string;
  source: string;
  status: string;
  priority: string;
  due_date?: string;
  created_at: string;
}

interface RouteContext {
  status: number;
  workspaceId?: string;
  error?: string;
}

async function resolveContext(
  supabase: Awaited<ReturnType<typeof createRouteClient>>
): Promise<RouteContext> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { status: 401, error: 'Authentication required' };
  }

  const { data: membership, error: memberError } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle();

  if (memberError) {
    logger.error('Workspace membership lookup failed', 'MEMBERSHIP_LOOKUP_ERROR', memberError);
    return { status: 500, error: 'Membership lookup failed' };
  }

  if (!membership) {
    return { status: 403, error: 'Not a workspace member' };
  }

  return {
    status: 200,
    workspaceId: membership.workspace_id as string,
  };
}

function sortObligationsByPriority(obligations: Obligation[]): Obligation[] {
  return obligations.sort((a, b) => {
    const aPriority = PRIORITY_ORDER[a.priority] ?? 99;
    const bPriority = PRIORITY_ORDER[b.priority] ?? 99;
    return aPriority - bPriority;
  });
}

/**
 * GET /api/obligations
 * Fetch obligations for a workspace
 * Query params:
 *  - assessmentId: obligations linked to a specific assessment
 *  - systemId: obligations for a specific AI system (via its assessments)
 *  - status: filter by status (identified, in_progress, completed, not_applicable)
 */
export async function GET(request: NextRequest) {
  const assessmentId = request.nextUrl.searchParams.get('assessmentId');
  const systemId = request.nextUrl.searchParams.get('systemId');
  const statusParam = request.nextUrl.searchParams.get('status');

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
        logger.error('Assessment obligations query failed', 'OBLIGATION_QUERY_ERROR', error);
        return NextResponse.json(
          { ok: false, error: 'Could not load obligations' },
          { status: 500 }
        );
      }

      const obligations: Obligation[] = (data ?? [])
        .map((item: Record<string, unknown>) => item.obligations as Obligation)
        .filter((o): o is Obligation => o != null);

      return NextResponse.json({ ok: true, obligations: sortObligationsByPriority(obligations) });
    } else if (systemId) {
      const { data: assessments, error: assessmentError } = await supabase
        .from('risk_assessments')
        .select('id')
        .eq('ai_system_id', systemId)
        .eq('workspace_id', ctx.workspaceId)
        .limit(1);

      if (assessmentError) {
        logger.error('System assessment lookup failed', 'ASSESSMENT_LOOKUP_ERROR', assessmentError);
        return NextResponse.json(
          { ok: false, error: 'Failed to load system assessments' },
          { status: 500 }
        );
      }

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
        logger.error('System obligations query failed', 'OBLIGATION_QUERY_ERROR', error);
        return NextResponse.json(
          { ok: false, error: 'Could not load obligations' },
          { status: 500 }
        );
      }

      const obligations: Obligation[] = (data ?? [])
        .map((item: Record<string, unknown>) => item.obligations as Obligation)
        .filter((o): o is Obligation => o != null);

      return NextResponse.json({ ok: true, obligations: sortObligationsByPriority(obligations) });
    } else {
      let query = supabase
        .from('obligations')
        .select('*')
        .eq('workspace_id', ctx.workspaceId);

      if (statusParam && OBLIGATION_STATUS.includes(statusParam as typeof OBLIGATION_STATUS[number])) {
        query = query.eq('status', statusParam);
      }

      const { data, error } = await query.order('priority', {
        ascending: true,
      });

      if (error) {
        logger.error('Workspace obligations query failed', 'OBLIGATION_QUERY_ERROR', error);
        return NextResponse.json(
          { ok: false, error: 'Could not load obligations' },
          { status: 500 }
        );
      }

      return NextResponse.json({ ok: true, obligations: data ?? [] });
    }
  } catch (err) {
    logger.error('Obligations endpoint error', 'OBLIGATION_ERROR', err);
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch obligations' },
      { status: 500 }
    );
  }
}
