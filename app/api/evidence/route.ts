import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase-server';
import { withLogging } from '@/lib/middleware-logging';

export const dynamic = 'force-dynamic';

interface CreateEvidenceRequest {
  title: string;
  description?: string;
  obligationId?: string;
  aiSystemId?: string;
}

async function resolveContext(supabase: Awaited<ReturnType<typeof createRouteClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { status: 401 as const, error: 'Authentication required' };

  const { data: membership } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle();

  if (!membership) {
    return { status: 401 as const, error: 'Not a workspace member' };
  }

  return {
    status: 200 as const,
    workspaceId: membership.workspace_id as string,
    userId: user.id,
  };
}

/** GET /api/evidence — fetch evidence for a company or obligation */
export async function GET(request: NextRequest) {
  const supabase = await createRouteClient();
  const ctx = await resolveContext(supabase);

  let userId: string | undefined;
  let workspaceId: string | undefined;

  if (ctx.status === 200) {
    userId = ctx.userId;
    workspaceId = ctx.workspaceId;
  }

  return withLogging(
    request,
    async () => {
      const obligationId = request.nextUrl.searchParams.get('obligationId');
      const aiSystemId = request.nextUrl.searchParams.get('aiSystemId');

      if (ctx.status !== 200) {
        return NextResponse.json(
          { ok: false, error: ctx.error },
          { status: ctx.status }
        );
      }

      let query = supabase
        .from('evidence')
        .select('*')
        .eq('workspace_id', ctx.workspaceId);

      if (obligationId) {
        query = query.eq('obligation_id', obligationId);
      }

      // If filtering by AI system, find related obligations (via risk assessment)
      if (aiSystemId) {
        // Get obligations related to this system's assessment
        const { data: obligations } = await supabase
          .from('obligations')
          .select('id')
          .eq('workspace_id', ctx.workspaceId)
          .limit(100);

        if (obligations && obligations.length > 0) {
          const obligationIds = obligations.map((o) => o.id);
          query = query.in('obligation_id', obligationIds);
        }
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('[api/evidence] GET failed:', error);
        return NextResponse.json(
          { ok: false, error: 'Failed to fetch evidence' },
          { status: 500 }
        );
      }

      return NextResponse.json({ ok: true, evidence: data ?? [] });
    },
    {
      endpoint: '/api/evidence',
      method: 'GET',
      userId,
      workspaceId,
    }
  );
}

/** POST /api/evidence — upload evidence metadata (file storage handled separately) */
export async function POST(request: NextRequest) {
  let body: CreateEvidenceRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Invalid JSON' },
      { status: 400 }
    );
  }

  if (!body.title?.trim()) {
    return NextResponse.json(
      { ok: false, error: 'title is required' },
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

  // Get company_id from workspace
  const { data: company } = await supabase
    .from('companies')
    .select('id')
    .eq('workspace_id', ctx.workspaceId)
    .limit(1)
    .maybeSingle();

  if (!company) {
    return NextResponse.json(
      { ok: false, error: 'No company found in workspace' },
      { status: 409 }
    );
  }

  const { data, error } = await supabase
    .from('evidence')
    .insert({
      company_id: company.id,
      workspace_id: ctx.workspaceId,
      obligation_id: body.obligationId || null,
      title: body.title.trim(),
      description: body.description?.trim() || null,
      uploaded_by: ctx.userId,
      status: 'submitted',
    })
    .select('*')
    .single();

  if (error || !data) {
    console.error('[api/evidence] insert failed:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to create evidence record' },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, evidence: data });
}

/** PUT /api/evidence/:id — update evidence status or details */
export async function PUT(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const evidenceId = pathname.split('/').pop();

  if (!evidenceId) {
    return NextResponse.json(
      { ok: false, error: 'Evidence ID required' },
      { status: 400 }
    );
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Invalid JSON' },
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

  const updateData: any = {};
  if (body.title) updateData.title = body.title.trim();
  if (body.description) updateData.description = body.description.trim();
  if (body.status) updateData.status = body.status;

  const { data, error } = await supabase
    .from('evidence')
    .update(updateData)
    .eq('id', evidenceId)
    .eq('workspace_id', ctx.workspaceId)
    .select('*')
    .single();

  if (error) {
    console.error('[api/evidence] PUT failed:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to update evidence' },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, evidence: data });
}

/** DELETE /api/evidence/:id — delete evidence record */
export async function DELETE(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const evidenceId = pathname.split('/').pop();

  if (!evidenceId) {
    return NextResponse.json(
      { ok: false, error: 'Evidence ID required' },
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

  const { error } = await supabase
    .from('evidence')
    .delete()
    .eq('id', evidenceId)
    .eq('workspace_id', ctx.workspaceId);

  if (error) {
    console.error('[api/evidence] DELETE failed:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to delete evidence' },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
