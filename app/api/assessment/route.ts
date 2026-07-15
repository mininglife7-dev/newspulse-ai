import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase-server';

export interface AssessmentBody {
  ai_system_id: string;
  risk_level: 'unacceptable' | 'high' | 'medium' | 'low';
  risk_score?: number;
  assessment_data?: Record<string, unknown>;
  status?: 'draft' | 'in_review' | 'finalized';
}

function resolveContext(supabase: any) {
  return new Promise<{ workspace_id?: string; error?: { status: number; message: string } }>(async (resolve) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      resolve({ error: { status: 401, message: 'Authentication required' } });
      return;
    }

    const { data: membership } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle();

    if (!membership) {
      resolve({ error: { status: 409, message: 'No workspace yet — complete company setup first' } });
      return;
    }

    resolve({ workspace_id: membership.workspace_id });
  });
}

export async function GET(req: NextRequest) {
  const supabase = await createRouteClient();
  const context = await resolveContext(supabase);

  if (context.error) {
    return NextResponse.json(
      { ok: false, error: context.error.message },
      { status: context.error.status }
    );
  }

  try {
    const { data: assessments, error } = await supabase
      .from('risk_assessments')
      .select('*')
      .eq('workspace_id', context.workspace_id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({
      ok: true,
      assessments: assessments || [],
    });
  } catch (error) {
    console.error('[api/assessment] GET failed:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch assessments' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  let body: AssessmentBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  const supabase = await createRouteClient();
  const context = await resolveContext(supabase);

  if (context.error) {
    return NextResponse.json(
      { ok: false, error: context.error.message },
      { status: context.error.status }
    );
  }

  if (!body.ai_system_id) {
    return NextResponse.json(
      { ok: false, error: 'ai_system_id is required' },
      { status: 400 }
    );
  }

  if (!body.risk_level || !['unacceptable', 'high', 'medium', 'low'].includes(body.risk_level)) {
    return NextResponse.json(
      { ok: false, error: 'risk_level must be one of: unacceptable, high, medium, low' },
      { status: 400 }
    );
  }

  try {
    // Verify the AI system belongs to this workspace
    const { data: system, error: sysError } = await supabase
      .from('ai_systems')
      .select('id, company_id')
      .eq('id', body.ai_system_id)
      .eq('workspace_id', context.workspace_id)
      .single();

    if (sysError || !system) {
      return NextResponse.json(
        { ok: false, error: 'AI system not found in this workspace' },
        { status: 404 }
      );
    }

    const { data: assessment, error: insertError } = await supabase
      .from('risk_assessments')
      .insert({
        ai_system_id: body.ai_system_id,
        company_id: system.company_id,
        workspace_id: context.workspace_id,
        risk_level: body.risk_level,
        risk_score: body.risk_score ?? null,
        assessment_data: body.assessment_data ?? {},
        status: body.status ?? 'draft',
      })
      .select('*')
      .single();

    if (insertError) throw insertError;

    return NextResponse.json({
      ok: true,
      assessment,
    });
  } catch (error) {
    console.error('[api/assessment] POST failed:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to create assessment' },
      { status: 500 }
    );
  }
}
