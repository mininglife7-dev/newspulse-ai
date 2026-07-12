import { NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/obligations
 * List obligations for the user's workspace
 *
 * Query params:
 * - company_id: Filter by company (optional)
 * - status: Filter by status (identified|in_progress|completed|not_applicable)
 * - priority: Filter by priority (critical|high|medium|low)
 * - source: Filter by source (EU_AI_ACT|GDPR|LOCAL_REGULATION)
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const supabase = await createRouteClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: 'Authentication required' }, { status: 401 });
  }

  // Get user's workspace
  const { data: membership } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle();

  if (!membership) {
    return NextResponse.json(
      { ok: false, error: 'No workspace found' },
      { status: 409 }
    );
  }

  // Build query
  let query = supabase
    .from('obligations')
    .select('*')
    .eq('workspace_id', membership.workspace_id);

  // Apply filters
  const companyId = url.searchParams.get('company_id');
  if (companyId) {
    query = query.eq('company_id', companyId);
  }

  const status = url.searchParams.get('status');
  if (status) {
    query = query.eq('status', status);
  }

  const priority = url.searchParams.get('priority');
  if (priority) {
    query = query.eq('priority', priority);
  }

  const source = url.searchParams.get('source');
  if (source) {
    query = query.eq('source', source);
  }

  const { data: obligations, error } = await query.order('created_at', { ascending: false });

  if (error) {
    console.error('[api/obligations] list failed:', error);
    return NextResponse.json(
      { ok: false, error: 'Could not load obligations' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    obligations: obligations ?? [],
    count: obligations?.length ?? 0,
  });
}

/**
 * POST /api/obligations
 * Create a new obligation
 *
 * Request body:
 * {
 *   "company_id": "uuid",
 *   "title": "string",
 *   "description": "string",
 *   "source": "EU_AI_ACT|GDPR|LOCAL_REGULATION",
 *   "priority": "critical|high|medium|low",
 *   "due_date": "YYYY-MM-DD" (optional)
 * }
 */
export async function POST(req: Request) {
  let body: {
    company_id: string;
    title: string;
    description?: string;
    source?: string;
    priority?: string;
    due_date?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  // Validate input
  if (!body.company_id) {
    return NextResponse.json(
      { ok: false, error: 'company_id is required' },
      { status: 400 }
    );
  }

  if (!body.title) {
    return NextResponse.json({ ok: false, error: 'title is required' }, { status: 400 });
  }

  // Authenticate
  const supabase = await createRouteClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: 'Authentication required' }, { status: 401 });
  }

  // Verify user has access to the company
  const { data: company, error: companyError } = await supabase
    .from('companies')
    .select('id, workspace_id')
    .eq('id', body.company_id)
    .maybeSingle();

  if (companyError || !company) {
    return NextResponse.json({ ok: false, error: 'Company not found' }, { status: 404 });
  }

  // Verify user is member of workspace
  const { data: membership } = await supabase
    .from('workspace_members')
    .select('id')
    .eq('workspace_id', company.workspace_id)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle();

  if (!membership) {
    return NextResponse.json({ ok: false, error: 'Access denied' }, { status: 403 });
  }

  // Create obligation
  const { data: obligation, error: insertError } = await supabase
    .from('obligations')
    .insert({
      company_id: body.company_id,
      workspace_id: company.workspace_id,
      title: body.title,
      description: body.description || null,
      source: body.source || 'EU_AI_ACT',
      priority: body.priority || 'medium',
      due_date: body.due_date || null,
      status: 'identified',
    })
    .select();

  if (insertError || !obligation || obligation.length === 0) {
    console.error('[api/obligations] insert failed:', insertError);
    return NextResponse.json(
      { ok: false, error: 'Could not create obligation' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    obligation: obligation[0],
  });
}
