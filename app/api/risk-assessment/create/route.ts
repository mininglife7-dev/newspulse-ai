import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const runtime = 'nodejs';

interface RiskQuestion {
  question_id: string;
  answer: boolean;
  notes?: string;
}

interface CreateRiskAssessmentRequest {
  workspace_id: string;
  ai_system_id: string;
  assessment_type: 'prohibited' | 'high_risk' | 'general';
  responses: RiskQuestion[];
}

export async function POST(req: NextRequest) {
  try {
    const body: CreateRiskAssessmentRequest = await req.json();

    // Validate required fields
    if (!body.workspace_id || !body.ai_system_id || !body.assessment_type || !body.responses) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Missing required fields',
        },
        { status: 400 }
      );
    }

    // Get current authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { ok: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify user has access to this workspace
    const { data: member, error: memberError } = await supabase
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', body.workspace_id)
      .eq('user_id', user.id)
      .single();

    if (memberError || !member) {
      return NextResponse.json(
        { ok: false, error: 'Access denied to this workspace' },
        { status: 403 }
      );
    }

    // Calculate risk score based on responses
    const affirmativeAnswers = body.responses.filter((r) => r.answer).length;
    const totalQuestions = body.responses.length;
    const riskScore = totalQuestions > 0 ? Math.round((affirmativeAnswers / totalQuestions) * 100) : 0;

    // Create risk assessment
    const { data: assessment, error: createError } = await supabase
      .from('risk_assessments')
      .insert([
        {
          workspace_id: body.workspace_id,
          ai_system_id: body.ai_system_id,
          assessment_type: body.assessment_type,
          risk_score: riskScore,
          responses: body.responses,
          created_by: user.id,
          status: 'completed',
        },
      ])
      .select()
      .single();

    if (createError) {
      return NextResponse.json(
        { ok: false, error: createError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        assessment: {
          id: assessment.id,
          ai_system_id: assessment.ai_system_id,
          assessment_type: assessment.assessment_type,
          risk_score: assessment.risk_score,
          status: assessment.status,
          created_at: assessment.created_at,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || 'Failed to create risk assessment',
      },
      { status: 500 }
    );
  }
}
