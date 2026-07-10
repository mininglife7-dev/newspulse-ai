import { NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Resolve the caller's active workspace.
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

  return {
    status: 200 as const,
    workspaceId: membership.workspace_id as string,
  };
}

/** GET /api/obligations — list all obligations for workspace */
export async function GET(req: Request) {
  const supabase = createRouteClient();
  const ctx = await resolveContext(supabase);
  if (ctx.status !== 200) {
    return NextResponse.json(
      { ok: false, error: ctx.error },
      { status: ctx.status }
    );
  }

  // Get obligations extracted from risk assessments
  const { data: assessments, error: assessError } = await supabase
    .from('risk_assessments')
    .select('id, assessment_data, ai_system_id, ai_systems(name)')
    .eq('workspace_id', ctx.workspaceId);

  if (assessError) {
    console.error('[api/obligations] fetch assessments failed:', assessError);
    return NextResponse.json(
      { ok: false, error: 'Could not load obligations' },
      { status: 500 }
    );
  }

  // Extract obligations from assessment results
  const obligations: Array<{
    id: string;
    text: string;
    source_assessment_id: string;
    source_system_name: string;
  }> = [];
  const seen = new Set<string>();

  if (assessments && assessments.length > 0) {
    for (const assessment of assessments) {
      const result = (assessment.assessment_data as any)?.result;
      if (result?.obligations && Array.isArray(result.obligations)) {
        for (const obligation of result.obligations) {
          const key = `${obligation}|${assessment.id}`;
          if (!seen.has(key)) {
            seen.add(key);
            obligations.push({
              id: `${assessment.id}-${obligations.length}`,
              text: obligation,
              source_assessment_id: assessment.id,
              source_system_name: (assessment.ai_systems as any)?.name || 'Unknown',
            });
          }
        }
      }
    }
  }

  return NextResponse.json({
    ok: true,
    obligations,
    total: obligations.length,
  });
}
