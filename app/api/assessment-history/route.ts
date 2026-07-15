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

      const comp = (comparisonData as unknown[])?.[0];
      if (!comp) {
        return NextResponse.json({
          ok: true,
          comparison: null,
          message: 'No assessment history available',
        });
      }

      let improvement = null;
      if ((comp as Record<string, unknown>).previous_score !== null) {
        const { data: improvementData, error: impError } = await supabase.rpc(
          'calculate_assessment_improvement',
          {
            old_score: (comp as Record<string, unknown>).previous_score,
            new_score: (comp as Record<string, unknown>).current_score,
          }
        );

        if (!impError && improvementData) {
          improvement = (improvementData as unknown[])?.[0] || null;
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

    // Otherwise, fetch full timeline with current + historical assessments
    const { data: systemData } = await supabase
      .from('ai_systems')
      .select('name')
      .eq('id', aiSystemId)
      .maybeSingle();

    // Fetch current assessment
    const { data: currentAssessment } = await supabase
      .from('risk_assessments')
      .select('risk_score, risk_level, created_at')
      .eq('ai_system_id', aiSystemId)
      .eq('status', 'finalized')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Fetch all historical assessments
    const { data: history, error: histError } = await supabase
      .from('assessment_history')
      .select('version_number, risk_score, risk_level, archived_at')
      .eq('ai_system_id', aiSystemId)
      .eq('workspace_id', ctx.workspaceId)
      .order('version_number', { ascending: true });

    if (histError) {
      console.error('[api/assessment-history] fetch failed:', histError);
      return NextResponse.json(
        { ok: false, error: 'Failed to load assessment history' },
        { status: 500 }
      );
    }

    // Combine historical records with current assessment
    interface HistoryRecord {
      version_number: number;
      risk_score: number;
      risk_level: string;
      archived_at: string;
    }
    const allAssessments = (history || [] as HistoryRecord[])
      .map((h) => ({
        version: h.version_number,
        risk_score: h.risk_score,
        risk_level: h.risk_level,
        created_at: h.archived_at,
      }));

    // Add current assessment if exists
    if (currentAssessment) {
      const maxVersion = allAssessments.length > 0
        ? Math.max(...allAssessments.map((a) => a.version))
        : 0;

      allAssessments.push({
        version: maxVersion + 1,
        risk_score: currentAssessment.risk_score,
        risk_level: currentAssessment.risk_level,
        created_at: currentAssessment.created_at,
      });
    }

    return NextResponse.json({
      ok: true,
      timeline: {
        system_name: systemData?.name || 'Unknown System',
        ai_system_id: aiSystemId,
        assessments: allAssessments,
        total_versions: allAssessments.length,
        current_score: currentAssessment?.risk_score || null,
        current_level: currentAssessment?.risk_level || 'unknown',
      },
    });
  } catch (err: any) {
    console.error('[api/assessment-history] GET failed:', err);
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch assessment history' },
      { status: 500 }
    );
  }
}
