import { NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes for large file uploads

/**
 * GET /api/evidence
 * List evidence files for the user's workspace
 *
 * Query params:
 * - company_id: Filter by company (optional)
 * - obligation_id: Filter by obligation (optional)
 * - status: Filter by status (submitted|under_review|approved|rejected)
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
    .from('evidence')
    .select(
      `id, company_id, obligation_id, title, description, file_type, file_size,
       status, uploaded_by, created_at, updated_at,
       obligations(id, title, status)`
    )
    .eq('workspace_id', membership.workspace_id);

  // Apply filters
  const companyId = url.searchParams.get('company_id');
  if (companyId) {
    query = query.eq('company_id', companyId);
  }

  const obligationId = url.searchParams.get('obligation_id');
  if (obligationId) {
    query = query.eq('obligation_id', obligationId);
  }

  const status = url.searchParams.get('status');
  if (status) {
    query = query.eq('status', status);
  }

  const { data: evidenceList, error } = await query.order('created_at', { ascending: false });

  if (error) {
    console.error('[api/evidence] list failed:', error);
    return NextResponse.json(
      { ok: false, error: 'Could not load evidence' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    evidence: evidenceList ?? [],
    count: evidenceList?.length ?? 0,
  });
}

/**
 * POST /api/evidence
 * Create evidence record with file metadata
 *
 * Request body:
 * {
 *   "company_id": "uuid",
 *   "obligation_id": "uuid" (optional),
 *   "title": "string",
 *   "description": "string" (optional),
 *   "file_type": "pdf|docx|xlsx|txt|other",
 *   "file_size": 1024 (in bytes)
 * }
 *
 * For actual file storage, integrate with Supabase Storage or S3
 */
export async function POST(req: Request) {
  let body: {
    company_id: string;
    obligation_id?: string;
    title: string;
    description?: string;
    file_type: string;
    file_size: number;
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

  if (!body.file_type) {
    return NextResponse.json({ ok: false, error: 'file_type is required' }, { status: 400 });
  }

  if (typeof body.file_size !== 'number' || body.file_size < 0) {
    return NextResponse.json({ ok: false, error: 'file_size must be a non-negative number' }, { status: 400 });
  }

  // Validate file size (max 50MB)
  if (body.file_size > 50 * 1024 * 1024) {
    return NextResponse.json(
      { ok: false, error: 'File size exceeds 50MB limit' },
      { status: 413 }
    );
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
    return NextResponse.json(
      { ok: false, error: 'Company not found' },
      { status: 404 }
    );
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

  // If obligation_id provided, verify it exists and belongs to the company
  if (body.obligation_id) {
    const { data: obligation } = await supabase
      .from('obligations')
      .select('id')
      .eq('id', body.obligation_id)
      .eq('company_id', body.company_id)
      .maybeSingle();

    if (!obligation) {
      return NextResponse.json(
        { ok: false, error: 'Obligation not found or not in this company' },
        { status: 404 }
      );
    }
  }

  // Create evidence record
  const { data: evidence, error: insertError } = await supabase
    .from('evidence')
    .insert({
      company_id: body.company_id,
      workspace_id: company.workspace_id,
      obligation_id: body.obligation_id || null,
      title: body.title,
      description: body.description || null,
      file_type: body.file_type,
      file_size: body.file_size,
      uploaded_by: user.id,
      status: 'submitted',
    })
    .select();

  if (insertError || !evidence || evidence.length === 0) {
    console.error('[api/evidence] insert failed:', insertError);
    return NextResponse.json(
      { ok: false, error: 'Could not create evidence record' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    evidence: evidence[0],
    message: 'Evidence record created. Ready for file upload to storage.',
  });
}
