import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase-server';
import { logger } from '@/lib/logger';
import { validators, validate } from '@/lib/input-validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface CreateEvidenceRequest {
  title: string;
  description?: string;
  obligationId?: string;
}

interface RouteContext {
  status: number;
  workspaceId?: string;
  userId?: string;
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
    logger.error(
      'Workspace membership lookup failed',
      'MEMBERSHIP_LOOKUP_ERROR',
      memberError
    );
    return { status: 500, error: 'Membership lookup failed' };
  }

  if (!membership) {
    return { status: 403, error: 'Not a workspace member' };
  }

  return {
    status: 200,
    workspaceId: membership.workspace_id as string,
    userId: user.id,
  };
}

/** GET /api/evidence — fetch evidence for a workspace or obligation */
export async function GET(request: NextRequest) {
  const obligationId = request.nextUrl.searchParams.get('obligationId');

  const supabase = await createRouteClient();
  const ctx = await resolveContext(supabase);
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

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    logger.error('Evidence list fetch failed', 'EVIDENCE_FETCH_ERROR', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch evidence' },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, evidence: data ?? [] });
}

/** POST /api/evidence — upload evidence metadata (file storage handled separately) */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Invalid JSON' },
      { status: 400 }
    );
  }

  const validationResult = validate(body, {
    title: validators.string({ minLength: 1 }),
    description: validators.optional(validators.string()),
    obligationId: validators.optional(validators.string()),
  });

  if (!validationResult.ok) {
    return NextResponse.json(
      { ok: false, error: 'Invalid input', errors: validationResult.errors },
      { status: 400 }
    );
  }

  const validated = validationResult.value as CreateEvidenceRequest;

  const supabase = await createRouteClient();
  const ctx = await resolveContext(supabase);
  if (ctx.status !== 200) {
    return NextResponse.json(
      { ok: false, error: ctx.error },
      { status: ctx.status }
    );
  }

  // Get company_id from workspace
  const { data: company, error: companyError } = await supabase
    .from('companies')
    .select('id')
    .eq('workspace_id', ctx.workspaceId)
    .limit(1)
    .maybeSingle();

  if (companyError) {
    logger.error('Company lookup failed', 'COMPANY_LOOKUP_ERROR', companyError);
    return NextResponse.json(
      { ok: false, error: 'Failed to resolve company' },
      { status: 500 }
    );
  }

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
      obligation_id: validated.obligationId || null,
      title: validated.title.trim(),
      description: validated.description?.trim() || null,
      uploaded_by: ctx.userId,
      status: 'submitted',
    })
    .select('*')
    .single();

  if (error || !data) {
    logger.error('Evidence creation failed', 'EVIDENCE_CREATE_ERROR', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to create evidence record' },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, evidence: data });
}
