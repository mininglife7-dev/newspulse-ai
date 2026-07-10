import { NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase-server';
import { logAuditEvent } from '@/lib/audit-log';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface ReviewEvidenceBody {
  status: 'under_review' | 'approved' | 'rejected';
  review_comments?: string;
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
    user,
    workspaceId: membership.workspace_id as string,
  };
}

/** PATCH /api/evidence/[id]/review — review/approve/reject evidence */
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

  let body: ReviewEvidenceBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Invalid request body' },
      { status: 400 }
    );
  }

  // Validate status
  if (!['under_review', 'approved', 'rejected'].includes(body.status)) {
    return NextResponse.json(
      { ok: false, error: 'Invalid review status' },
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

  // Update evidence with review
  const updateData: any = {
    status: body.status,
    reviewer_id: ctx.user.id,
    reviewed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (body.review_comments) {
    updateData.review_comments = body.review_comments;
  }

  const { data, error } = await supabase
    .from('evidence')
    .update(updateData)
    .eq('id', params.id)
    .select();

  if (error) {
    console.error('[api/evidence/[id]/review] update failed:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to review evidence' },
      { status: 500 }
    );
  }

  // Log audit event
  const evidence = data?.[0];
  if (evidence) {
    const actionTypeMap: Record<string, string> = {
      under_review: 'evidence_reviewed',
      approved: 'evidence_approved',
      rejected: 'evidence_rejected',
    };

    await logAuditEvent(
      supabase,
      ctx.workspaceId,
      ctx.user.id,
      actionTypeMap[body.status] as any,
      'evidence',
      evidence.id,
      evidence.title,
      {
        previous_status: (evidence as any).previous_status,
        new_status: body.status,
        review_comments: body.review_comments || null,
      }
    );
  }

  return NextResponse.json({
    ok: true,
    evidence: data?.[0],
  });
}
