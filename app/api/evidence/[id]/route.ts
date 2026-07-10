import { NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface UpdateEvidenceBody {
  title?: string;
  description?: string;
  status?: 'submitted' | 'under_review' | 'approved' | 'rejected';
  file_url?: string;
  file_type?: string;
  file_size?: number;
}

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

/** GET /api/evidence/[id] — fetch a single piece of evidence */
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createRouteClient();
  const ctx = await resolveContext(supabase);
  if (ctx.status !== 200) {
    return NextResponse.json(
      { ok: false, error: ctx.error },
      { status: ctx.status }
    );
  }

  const { data, error } = await supabase
    .from('evidence')
    .select('*')
    .eq('id', params.id)
    .eq('workspace_id', ctx.workspaceId)
    .maybeSingle();

  if (error) {
    console.error('[api/evidence/[id]] fetch failed:', error);
    return NextResponse.json(
      { ok: false, error: 'Could not load evidence' },
      { status: 500 }
    );
  }

  if (!data) {
    return NextResponse.json(
      { ok: false, error: 'Evidence not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    ok: true,
    evidence: data,
  });
}

/** PATCH /api/evidence/[id] — update evidence */
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createRouteClient();
  const ctx = await resolveContext(supabase);
  if (ctx.status !== 200) {
    return NextResponse.json(
      { ok: false, error: ctx.error },
      { status: ctx.status }
    );
  }

  let body: UpdateEvidenceBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Invalid request body' },
      { status: 400 }
    );
  }

  // Verify evidence belongs to workspace
  const { data: existing, error: checkError } = await supabase
    .from('evidence')
    .select('id')
    .eq('id', params.id)
    .eq('workspace_id', ctx.workspaceId)
    .maybeSingle();

  if (checkError || !existing) {
    return NextResponse.json(
      { ok: false, error: 'Evidence not found' },
      { status: 404 }
    );
  }

  // Update evidence
  const { data, error } = await supabase
    .from('evidence')
    .update({
      title: body.title,
      description: body.description,
      status: body.status,
      file_url: body.file_url,
      file_type: body.file_type,
      file_size: body.file_size,
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.id)
    .select();

  if (error) {
    console.error('[api/evidence/[id]] update failed:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to update evidence' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    evidence: data?.[0],
  });
}

/** DELETE /api/evidence/[id] — delete evidence */
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createRouteClient();
  const ctx = await resolveContext(supabase);
  if (ctx.status !== 200) {
    return NextResponse.json(
      { ok: false, error: ctx.error },
      { status: ctx.status }
    );
  }

  // Verify evidence belongs to workspace
  const { data: existing, error: checkError } = await supabase
    .from('evidence')
    .select('id')
    .eq('id', params.id)
    .eq('workspace_id', ctx.workspaceId)
    .maybeSingle();

  if (checkError || !existing) {
    return NextResponse.json(
      { ok: false, error: 'Evidence not found' },
      { status: 404 }
    );
  }

  const { error } = await supabase
    .from('evidence')
    .delete()
    .eq('id', params.id);

  if (error) {
    console.error('[api/evidence/[id]] delete failed:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to delete evidence' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
  });
}
