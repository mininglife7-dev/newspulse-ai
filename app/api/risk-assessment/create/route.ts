import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { logger, measureDuration } from '@/lib/logger';

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
  const startTime = Date.now();
  const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  try {
    const body: CreateRiskAssessmentRequest = await req.json();

    logger.info('Risk assessment creation initiated', {
      requestId,
      workspaceId: body.workspace_id,
      aiSystemId: body.ai_system_id,
      assessmentType: body.assessment_type,
    });

    // Validate required fields
    if (
      !body.workspace_id ||
      !body.ai_system_id ||
      !body.assessment_type ||
      !body.responses
    ) {
      logger.warn('Invalid request - missing required fields', {
        requestId,
        provided: {
          workspace_id: !!body.workspace_id,
          ai_system_id: !!body.ai_system_id,
          assessment_type: !!body.assessment_type,
          responses: !!body.responses,
        },
      });

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
      logger.warn('Unauthorized risk assessment attempt', {
        requestId,
        workspaceId: body.workspace_id,
        authError: authError?.message,
      });

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
      logger.warn('Access denied - user not workspace member', {
        requestId,
        userId: user.id,
        workspaceId: body.workspace_id,
      });

      return NextResponse.json(
        { ok: false, error: 'Access denied to this workspace' },
        { status: 403 }
      );
    }

    // Verify AI system exists and get company_id
    const { data: aiSystem, error: aiError } = await supabase
      .from('ai_systems')
      .select('id, company_id')
      .eq('id', body.ai_system_id)
      .eq('workspace_id', body.workspace_id)
      .single();

    if (aiError || !aiSystem) {
      logger.warn('AI system not found', {
        requestId,
        aiSystemId: body.ai_system_id,
        workspaceId: body.workspace_id,
      });

      return NextResponse.json(
        { ok: false, error: 'AI system not found' },
        { status: 404 }
      );
    }

    // Calculate risk score based on responses
    const affirmativeAnswers = body.responses.filter((r) => r.answer).length;
    const totalQuestions = body.responses.length;
    const riskScore =
      totalQuestions > 0
        ? Math.round((affirmativeAnswers / totalQuestions) * 100)
        : 0;

    // Map assessment type to risk level
    const riskLevelMap: Record<string, string> = {
      prohibited: 'unacceptable',
      high_risk: 'high',
      general: 'medium',
    };

    logger.info('Risk score calculated', {
      requestId,
      affirmativeAnswers,
      totalQuestions,
      riskScore,
      assessmentType: body.assessment_type,
    });

    // Create risk assessment
    const { data: assessment, error: createError } = await supabase
      .from('risk_assessments')
      .insert([
        {
          workspace_id: body.workspace_id,
          ai_system_id: body.ai_system_id,
          company_id: aiSystem.company_id,
          assessment_type: body.assessment_type,
          risk_level: riskLevelMap[body.assessment_type] || 'medium',
          risk_score: riskScore,
          responses: body.responses,
          assessment_data: { responses: body.responses },
          created_by: user.id,
          status: 'completed',
        },
      ])
      .select()
      .single();

    if (createError) {
      logger.error('Failed to create risk assessment', {
        requestId,
        workspaceId: body.workspace_id,
        aiSystemId: body.ai_system_id,
        error: createError.message,
      });

      return NextResponse.json(
        { ok: false, error: createError.message },
        { status: 500 }
      );
    }

    const duration = measureDuration(startTime);
    logger.info('Risk assessment created successfully', {
      requestId,
      assessmentId: assessment.id,
      riskScore: assessment.risk_score,
      duration,
    });

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
    const duration = measureDuration(startTime);

    logger.error('Unhandled exception in risk assessment creation', {
      requestId,
      duration,
      error: error?.message,
      stack: error?.stack,
    });

    return NextResponse.json(
      {
        ok: false,
        error: error?.message || 'Failed to create risk assessment',
      },
      { status: 500 }
    );
  }
}
