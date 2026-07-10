import { NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase-server';
import { createNotificationsForTeam } from '@/lib/notifications';
import { logAuditEvent } from '@/lib/audit-log';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface UpdateStatusBody {
  status: 'draft' | 'in_review' | 'finalized';
}

async function resolveContext(supabase: ReturnType<typeof createRouteClient>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: 401 as const, error: 'Authentication required' };

  const { data: membership } = await supabase
    .from('workspace_members')
    .select('workspace_id, role')
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
    role: membership.role as string,
  };
}

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

  let body: UpdateStatusBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Invalid request body' },
      { status: 400 }
    );
  }

  // Validate status
  if (!['draft', 'in_review', 'finalized'].includes(body.status)) {
    return NextResponse.json(
      { ok: false, error: 'Invalid status' },
      { status: 400 }
    );
  }

  try {
    // Verify assessment belongs to workspace
    const { data: existing, error: checkError } = await supabase
      .from('risk_assessments')
      .select('id, status')
      .eq('id', params.id)
      .eq('workspace_id', ctx.workspaceId)
      .maybeSingle();

    if (checkError || !existing) {
      return NextResponse.json(
        { ok: false, error: 'Assessment not found' },
        { status: 404 }
      );
    }

    const previousStatus = (existing as any).status;

    // Update status
    const { data, error } = await supabase
      .from('risk_assessments')
      .update({
        status: body.status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .select();

    if (error) {
      console.error('[api/risk-assessments/[id]/status] update failed:', error);
      return NextResponse.json(
        { ok: false, error: 'Failed to update assessment status' },
        { status: 500 }
      );
    }

    const assessment = data?.[0];

    // Log audit event
    if (assessment) {
      await logAuditEvent(
        supabase,
        ctx.workspaceId,
        ctx.user.id,
        'assessment_status_changed',
        'risk_assessment',
        assessment.id,
        `Assessment Status: ${body.status}`,
        {
          previous_status: previousStatus,
          new_status: body.status,
        }
      );
    }

    // Create notifications for status transitions
    if (assessment && body.status === 'finalized' && previousStatus !== 'finalized') {
      await createNotificationsForTeam(
        supabase,
        ctx.workspaceId,
        ctx.user.id,
        'assessment_completed',
        'Risk Assessment',
        {
          message: 'Risk assessment has been finalized and is ready for review',
          entityType: 'risk_assessment',
          entityId: assessment.id,
          actionUrl: '/assessments',
        }
      );
    }

    return NextResponse.json({
      ok: true,
      assessment: data?.[0],
    });
  } catch (err) {
    console.error('[api/risk-assessments/[id]/status] error:', err);
    return NextResponse.json(
      { ok: false, error: 'Failed to update assessment status' },
      { status: 500 }
    );
  }
}
