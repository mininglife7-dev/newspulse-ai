import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase-server';
import { getTemplatesForRiskLevel } from '@/lib/obligation-templates';

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
      status: 401 as const,
      error: 'Not a workspace member',
    };
  }

  return {
    status: 200 as const,
    workspaceId: membership.workspace_id as string,
  };
}

/**
 * POST /api/obligations/import-templates
 * Import obligation templates for a given risk level
 * Body: { riskLevel: 'high' | 'medium' | 'low' | 'unacceptable' }
 */
export async function POST(request: NextRequest) {
  let body: Record<string, any>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  const riskLevel = body.riskLevel as string;
  if (
    !riskLevel ||
    !['unacceptable', 'high', 'medium', 'low'].includes(riskLevel)
  ) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Valid riskLevel required (unacceptable/high/medium/low)',
      },
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
    // Get templates for risk level
    const templates = getTemplatesForRiskLevel(riskLevel as any);

    if (templates.length === 0) {
      return NextResponse.json(
        { ok: false, error: 'No templates found for risk level' },
        { status: 404 }
      );
    }

    const createdObligations = [];

    // Create obligations for each template
    for (const template of templates) {
      // Check if obligation already exists (to avoid duplicates)
      const { data: existing } = await supabase
        .from('obligations')
        .select('id')
        .eq('workspace_id', ctx.workspaceId)
        .ilike('title', template.title)
        .limit(1)
        .maybeSingle();

      if (existing) {
        // Obligation already exists, skip
        createdObligations.push({
          id: existing.id,
          title: template.title,
          skipped: true,
        });
        continue;
      }

      // Create new obligation
      const { data, error } = await supabase
        .from('obligations')
        .insert({
          workspace_id: ctx.workspaceId,
          title: template.title,
          description: template.description,
          source: template.source,
          status: 'identified',
          priority: template.priority,
        })
        .select('id')
        .single();

      if (error || !data) {
        console.error(
          '[api/obligations/import-templates] failed to create obligation:',
          error
        );
        // Continue with other templates even if one fails
        continue;
      }

      createdObligations.push({
        id: data.id,
        title: template.title,
        skipped: false,
      });
    }

    const created = createdObligations.filter((o) => !o.skipped).length;
    const skipped = createdObligations.filter((o) => o.skipped).length;

    return NextResponse.json(
      {
        ok: true,
        message: `Imported ${created} new obligations${skipped > 0 ? ` (${skipped} already existed)` : ''}`,
        created,
        skipped,
        obligations: createdObligations,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error('[api/obligations/import-templates] error:', err);
    return NextResponse.json(
      { ok: false, error: 'Failed to import templates' },
      { status: 500 }
    );
  }
}
