import { NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface AssessmentHistoryItem {
  version_number: number;
  risk_score: number;
  risk_level: string;
  archived_at: string;
  notes?: string;
}

interface AssessmentComparison {
  current_version: number;
  current_score: number;
  current_level: string;
  current_date: string;
  previous_version?: number;
  previous_score?: number;
  previous_level?: string;
  previous_date?: string;
  versions_count: number;
  improvement?: {
    improved: boolean;
    score_change: number;
    percent_change: number;
    improvement_category: string;
  };
}

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

/**
 * GET /api/assessment-history?ai_system_id=X
 * Fetch assessment history and versions for an AI system
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const aiSystemId = searchParams.get('ai_system_id');
  const limit = parseInt(searchParams.get('limit') || '10', 10);
  const comparison = searchParams.get('comparison') === 'true';

  if (!aiSystemId?.trim()) {
    return NextResponse.json(
      { ok: false, error: 'ai_system_id is required' },
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
    // Verify user has access to this AI system
    const { data: aiSystem } = await supabase
      .from('ai_systems')
      .select('workspace_id')
      .eq('id', aiSystemId)
      .eq('workspace_id', ctx.workspaceId)
      .maybeSingle();

    if (!aiSystem) {
      return NextResponse.json(
        { ok: false, error: 'AI system not found' },
        { status: 404 }
      );
    }

    // If comparison mode, use the helper function
    if (comparison) {
      const { data: comparisonData, error: compError } = await supabase.rpc(
        'get_assessment_comparison',
        { p_ai_system_id: aiSystemId }
      );

      if (compError) {
        console.error('[api/assessment-history] comparison failed:', compError);
        return NextResponse.json(
          { ok: false, error: 'Failed to load comparison' },
          { status: 500 }
        );
      }

      const comp = (comparisonData as any)?.[0];
      if (!comp) {
        return NextResponse.json({
          ok: true,
          comparison: null,
          message: 'No assessment history available',
        });
      }

      let improvement = null;
      if (comp.previous_score !== null) {
        const { data: improvementData, error: impError } = await supabase.rpc(
          'calculate_assessment_improvement',
          {
            old_score: comp.previous_score,
            new_score: comp.current_score,
          }
        );

        if (!impError && improvementData) {
          improvement = (improvementData as any)?.[0] || null;
        }
      }

      return NextResponse.json({
        ok: true,
        comparison: {
          current_version: comp.current_version,
          current_score: comp.current_score,
          current_level: comp.current_level,
          current_date: comp.current_date,
          previous_version: comp.previous_version,
          previous_score: comp.previous_score,
          previous_level: comp.previous_level,
          previous_date: comp.previous_date,
          versions_count: comp.versions_count,
          improvement,
        } as AssessmentComparison,
      });
    }

    // Otherwise, fetch history timeline
    const { data: history, error: histError } = await supabase
      .from('assessment_history')
      .select('version_number, risk_score, risk_level, archived_at, notes')
      .eq('ai_system_id', aiSystemId)
      .eq('workspace_id', ctx.workspaceId)
      .order('version_number', { ascending: false })
      .limit(limit);

    if (histError) {
      console.error('[api/assessment-history] fetch failed:', histError);
      return NextResponse.json(
        { ok: false, error: 'Failed to load assessment history' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      history: history || [],
      count: (history || []).length,
    });
  } catch (err: any) {
    console.error('[api/assessment-history] GET failed:', err);
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch assessment history' },
      { status: 500 }
    );
  }
}
