import { NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface CreateEvidenceBody {
  obligation_id?: string;
  title: string;
  description?: string;
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

  const { data: company } = await supabase
    .from('companies')
    .select('id')
    .eq('workspace_id', membership.workspace_id)
    .limit(1)
    .maybeSingle();

  return {
    status: 200 as const,
    user,
    workspaceId: membership.workspace_id as string,
    companyId: (company?.id as string) ?? null,
  };
}

/** GET /api/evidence — list all evidence for workspace */
export async function GET(req: Request) {
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
    .eq('workspace_id', ctx.workspaceId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[api/evidence] fetch failed:', error);
    return NextResponse.json(
      { ok: false, error: 'Could not load evidence' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    evidence: data || [],
  });
}

/** POST /api/evidence — create new evidence */
export async function POST(req: Request) {
  const supabase = createRouteClient();
  const ctx = await resolveContext(supabase);
  if (ctx.status !== 200) {
    return NextResponse.json(
      { ok: false, error: ctx.error },
      { status: ctx.status }
    );
  }

  let body: CreateEvidenceBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Invalid request body' },
      { status: 400 }
    );
  }

  // Validate required fields
  if (!body.title) {
    return NextResponse.json(
      { ok: false, error: 'Title is required' },
      { status: 400 }
    );
  }

  // If obligation_id provided, verify it belongs to this workspace
  if (body.obligation_id) {
    const { data: obligation } = await supabase
      .from('obligations')
      .select('id')
      .eq('id', body.obligation_id)
      .eq('workspace_id', ctx.workspaceId)
      .limit(1)
      .maybeSingle();

    if (!obligation) {
      return NextResponse.json(
        { ok: false, error: 'Obligation not found' },
        { status: 404 }
      );
    }
  }

  // Create evidence
  const { data, error } = await supabase
    .from('evidence')
    .insert({
      company_id: ctx.companyId,
      workspace_id: ctx.workspaceId,
      obligation_id: body.obligation_id || null,
      title: body.title,
      description: body.description || null,
      file_url: body.file_url || null,
      file_type: body.file_type || null,
      file_size: body.file_size || null,
      uploaded_by: ctx.user.id,
      status: 'submitted',
    })
    .select();

  if (error) {
    console.error('[api/evidence] insert failed:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to create evidence' },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      ok: true,
      evidence: data?.[0],
    },
    { status: 201 }
  );
}
