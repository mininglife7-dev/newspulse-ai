import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  try {
    const workspaceId = req.nextUrl.searchParams.get('workspace_id');

    if (!workspaceId) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Missing required query parameter: workspace_id',
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
      logger.warn('Unauthorized obligations aging request', { requestId });
      return NextResponse.json(
        { ok: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify user has access to this workspace
    const { data: member, error: memberError } = await supabase
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single();

    if (memberError || !member) {
      logger.warn('Access denied to workspace', {
        requestId,
        workspaceId,
      });
      return NextResponse.json(
        { ok: false, error: 'Access denied to this workspace' },
        { status: 403 }
      );
    }

    // Fetch all non-completed obligations with deadline info
    const { data: obligations, error: obligationError } = await supabase
      .from('obligations')
      .select(
        'id, title, status, priority, deadline_days, category, ai_system_id, created_at'
      )
      .eq('workspace_id', workspaceId)
      .neq('status', 'completed')
      .order('deadline_days', { ascending: true });

    if (obligationError) {
      throw obligationError;
    }

    // Categorize by deadline urgency
    const now = new Date();
    const overdue: typeof obligations = [];
    const dueSoon: typeof obligations = [];
    const dueIn3Weeks: typeof obligations = [];
    const dueIn6Weeks: typeof obligations = [];
    const future: typeof obligations = [];

    (obligations || []).forEach((obligation) => {
      if (obligation.deadline_days === null) {
        future.push(obligation);
      } else if (obligation.deadline_days < 0) {
        overdue.push(obligation);
      } else if (obligation.deadline_days <= 7) {
        dueSoon.push(obligation);
      } else if (obligation.deadline_days <= 21) {
        dueIn3Weeks.push(obligation);
      } else if (obligation.deadline_days <= 42) {
        dueIn6Weeks.push(obligation);
      } else {
        future.push(obligation);
      }
    });

    // Calculate metrics
    const totalObligations = obligations?.length || 0;
    const overdueCritical = overdue.filter(
      (o) => o.priority === 'critical'
    ).length;
    const overdueHigh = overdue.filter((o) => o.priority === 'high').length;

    // Calculate SLA metrics
    const slaViolations =
      overdue.filter((o) => o.priority === 'critical' || o.priority === 'high')
        .length || 0;

    logger.info('Obligations aging report retrieved', {
      requestId,
      workspaceId,
      total: totalObligations,
      overdue: overdue.length,
      dueSoon: dueSoon.length,
    });

    return NextResponse.json({
      ok: true,
      aging: {
        overdue: overdue.map((o) => ({
          id: o.id,
          title: o.title,
          priority: o.priority,
          status: o.status,
          category: o.category,
          ai_system_id: o.ai_system_id,
          days_overdue: Math.abs(o.deadline_days || 0),
          deadline_days: o.deadline_days,
        })),
        due_soon_7_days: dueSoon.map((o) => ({
          id: o.id,
          title: o.title,
          priority: o.priority,
          status: o.status,
          category: o.category,
          ai_system_id: o.ai_system_id,
          days_until_due: o.deadline_days,
        })),
        due_in_3_weeks: dueIn3Weeks.map((o) => ({
          id: o.id,
          title: o.title,
          priority: o.priority,
          status: o.status,
          category: o.category,
          days_until_due: o.deadline_days,
        })),
        due_in_6_weeks: dueIn6Weeks.map((o) => ({
          id: o.id,
          title: o.title,
          priority: o.priority,
          days_until_due: o.deadline_days,
        })),
      },
      summary: {
        total_obligations: totalObligations,
        overdue_count: overdue.length,
        overdue_critical: overdueCritical,
        overdue_high: overdueHigh,
        due_soon_7_days: dueSoon.length,
        due_in_3_weeks: dueIn3Weeks.length,
        due_in_6_weeks: dueIn6Weeks.length,
        future_obligations: future.length,
        sla_violations: slaViolations,
      },
      health: {
        status:
          slaViolations > 0
            ? 'critical'
            : overdue.length > 0
              ? 'at_risk'
              : dueSoon.length > 0
                ? 'warning'
                : 'healthy',
        compliance_risk_score: Math.min(
          100,
          (slaViolations * 20 + overdue.length * 5 + dueSoon.length * 2) /
            (totalObligations || 1)
        ),
      },
    });
  } catch (error: any) {
    logger.error('Obligations aging report failed', {
      requestId,
      error: error.message,
    });

    return NextResponse.json(
      {
        ok: false,
        error: error?.message || 'Failed to fetch obligations aging report',
      },
      { status: 500 }
    );
  }
}
