import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase-server';

interface AssessmentUpdateBody {
  risk_level?: 'unacceptable' | 'high' | 'medium' | 'low';
  risk_score?: number;
  assessment_data?: Record<string, unknown>;
  status?: 'draft' | 'in_review' | 'finalized';
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createRouteClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { ok: false, error: 'Authentication required' },
      { status: 401 }
    );
  }

  try {
    const { data: assessment, error } = await supabase
      .from('risk_assessments')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !assessment) {
      return NextResponse.json(
        { ok: false, error: 'Assessment not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      assessment,
    });
  } catch (error) {
    console.error('[api/assessment/[id]] GET failed:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch assessment' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  let body: AssessmentUpdateBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  const supabase = await createRouteClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { ok: false, error: 'Authentication required' },
      { status: 401 }
    );
  }

  try {
    // Verify assessment exists and belongs to user's workspace
    const { data: assessment } = await supabase
      .from('risk_assessments')
      .select('workspace_id')
      .eq('id', id)
      .single();

    if (!assessment) {
      return NextResponse.json(
        { ok: false, error: 'Assessment not found' },
        { status: 404 }
      );
    }

    // Verify user has access to this workspace
    const { data: membership } = await supabase
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', assessment.workspace_id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (!membership) {
      return NextResponse.json(
        { ok: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    // Build update payload (only update provided fields)
    const updatePayload: any = {
      updated_at: new Date().toISOString(),
    };

    if (body.risk_level !== undefined) updatePayload.risk_level = body.risk_level;
    if (body.risk_score !== undefined) updatePayload.risk_score = body.risk_score;
    if (body.assessment_data !== undefined) updatePayload.assessment_data = body.assessment_data;
    if (body.status !== undefined) updatePayload.status = body.status;

    const { data: updated, error: updateError } = await supabase
      .from('risk_assessments')
      .update(updatePayload)
      .eq('id', id)
      .select('*')
      .single();

    if (updateError) throw updateError;

    return NextResponse.json({
      ok: true,
      assessment: updated,
    });
  } catch (error) {
    console.error('[api/assessment/[id]] PATCH failed:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to update assessment' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createRouteClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { ok: false, error: 'Authentication required' },
      { status: 401 }
    );
  }

  try {
    // Verify assessment exists and belongs to user's workspace
    const { data: assessment } = await supabase
      .from('risk_assessments')
      .select('workspace_id')
      .eq('id', id)
      .single();

    if (!assessment) {
      return NextResponse.json(
        { ok: false, error: 'Assessment not found' },
        { status: 404 }
      );
    }

    // Verify user has access to this workspace
    const { data: membership } = await supabase
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', assessment.workspace_id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (!membership) {
      return NextResponse.json(
        { ok: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    const { error: deleteError } = await supabase
      .from('risk_assessments')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;

    return NextResponse.json({
      ok: true,
      message: 'Assessment deleted',
    });
  } catch (error) {
    console.error('[api/assessment/[id]] DELETE failed:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to delete assessment' },
      { status: 500 }
    );
  }
}
