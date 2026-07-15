import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/obligations/auto-generate
 * Generate and link obligations for a risk assessment
 * Called after assessment classification to auto-create relevant obligations
 */
export async function POST(req: Request) {
  let body: {
    assessmentId: string;
    workspaceId: string;
    companyId: string;
    riskLevel: string;
    obligations: string[];
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  const { assessmentId, workspaceId, companyId, riskLevel, obligations: obligationTexts } = body;

  if (!assessmentId || !workspaceId || !companyId || !riskLevel || !Array.isArray(obligationTexts)) {
    return NextResponse.json(
      { ok: false, error: 'Missing required fields' },
      { status: 400 }
    );
  }

  const supabase = await createRouteClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: 'Authentication required' },
      { status: 401 }
    );
  }

  try {
    // Verify user is in the workspace
    const { data: membership } = await supabase
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();

    if (!membership) {
      return NextResponse.json(
        { ok: false, error: 'Not authorized' },
        { status: 403 }
      );
    }

    // Map risk level to priority
    const priorityMap: Record<string, string> = {
      unacceptable: 'critical',
      high: 'high',
      medium: 'medium',
      low: 'low',
    };
    const priority = priorityMap[riskLevel] || 'medium';

    // Create or find obligations
    const createdObligations = [];
    for (const obligationText of obligationTexts) {
      // Check if obligation already exists for this company
      const { data: existing } = await supabase
        .from('obligations')
        .select('id')
        .eq('company_id', companyId)
        .eq('workspace_id', workspaceId)
        .ilike('title', obligationText.substring(0, 100))
        .limit(1)
        .maybeSingle();

      let obligationId: string;

      if (existing) {
        obligationId = existing.id;
      } else {
        // Create new obligation
        const { data: created, error } = await supabase
          .from('obligations')
          .insert({
            company_id: companyId,
            workspace_id: workspaceId,
            title: obligationText.substring(0, 200), // Truncate to title length
            description: obligationText,
            source: 'EU_AI_ACT',
            status: 'identified',
            priority,
          })
          .select('id')
          .single();

        if (error || !created) {
          console.error('[obligations] failed to create obligation:', error);
          continue; // Skip this obligation on error
        }
        obligationId = created.id;
      }

      // Link obligation to assessment
      const { error: linkError } = await supabase.from('assessment_obligations').insert({
        assessment_id: assessmentId,
        obligation_id: obligationId,
      });

      if (linkError) {
        console.error('[obligations] failed to link obligation:', linkError);
        continue;
      }

      createdObligations.push(obligationId);
    }

    return NextResponse.json({
      ok: true,
      obligationIds: createdObligations,
      count: createdObligations.length,
    });
  } catch (err) {
    console.error('[obligations] auto-generation failed:', err);
    return NextResponse.json(
      { ok: false, error: 'Failed to auto-generate obligations' },
      { status: 500 }
    );
  }
}
