import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { logger, measureDuration } from '@/lib/logger';
import { sendEmail } from '@/lib/email';
import { obligationAssigned } from '@/lib/email-templates';
import { triggerWebhooks } from '@/lib/webhook';

export const runtime = 'nodejs';

interface IdentifyObligationsRequest {
  workspace_id: string;
  ai_system_id: string;
  risk_assessment_id?: string;
  assessment_type: 'prohibited' | 'high_risk' | 'general';
  risk_score: number;
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  try {
    const body: IdentifyObligationsRequest = await req.json();

    logger.info('Obligation identification initiated', {
      requestId,
      workspaceId: body.workspace_id,
      aiSystemId: body.ai_system_id,
      assessmentType: body.assessment_type,
      riskScore: body.risk_score,
    });

    // Validate required fields
    if (!body.workspace_id || !body.ai_system_id || !body.assessment_type) {
      logger.warn('Invalid obligation identification request', {
        requestId,
        workspace_id: !!body.workspace_id,
        ai_system_id: !!body.ai_system_id,
        assessment_type: !!body.assessment_type,
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
      logger.warn('Unauthorized obligation identification attempt', {
        requestId,
        workspaceId: body.workspace_id,
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
      logger.warn('Access denied - obligation identification', {
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
      logger.warn('AI system not found for obligation identification', {
        requestId,
        aiSystemId: body.ai_system_id,
        workspaceId: body.workspace_id,
      });

      return NextResponse.json(
        { ok: false, error: 'AI system not found' },
        { status: 404 }
      );
    }

    // Define obligations based on assessment type and risk score
    const obligations: any[] = [];

    if (body.assessment_type === 'prohibited') {
      obligations.push({
        category: 'compliance',
        title: 'Prohibited AI System',
        description:
          'This AI system falls under prohibited uses per EU AI Act Article 5. Immediate action required.',
        priority: 'critical',
        deadline_days: 30,
      });
    } else if (body.assessment_type === 'high_risk') {
      obligations.push({
        category: 'documentation',
        title: 'High-Risk AI System Documentation',
        description:
          'Comprehensive documentation required including training data, testing procedures, and usage guidelines per Article 13.',
        priority: 'high',
        deadline_days: 90,
      });

      if (body.risk_score >= 70) {
        obligations.push({
          category: 'monitoring',
          title: 'Continuous Performance Monitoring',
          description:
            'Implement system for monitoring performance and compliance with Article 15 requirements.',
          priority: 'high',
          deadline_days: 90,
        });

        obligations.push({
          category: 'governance',
          title: 'Human Oversight Procedures',
          description:
            'Establish procedures for human oversight and intervention per Article 14.',
          priority: 'high',
          deadline_days: 90,
        });
      }
    } else {
      // General compliance for all systems
      obligations.push({
        category: 'transparency',
        title: 'Transparency and Disclosure',
        description:
          'Users should be informed when interacting with AI systems per Article 52.',
        priority: 'medium',
        deadline_days: 180,
      });
    }

    logger.info('Obligations generated', {
      requestId,
      assessmentType: body.assessment_type,
      obligationCount: obligations.length,
      riskScore: body.risk_score,
    });

    // Create obligations in database
    const obligationRecords = obligations.map((o) => ({
      workspace_id: body.workspace_id,
      company_id: aiSystem.company_id,
      ai_system_id: body.ai_system_id,
      risk_assessment_id: body.risk_assessment_id || null,
      category: o.category,
      title: o.title,
      description: o.description,
      priority: o.priority,
      status: 'identified',
      deadline_days: o.deadline_days,
      source: 'EU_AI_ACT',
      created_by: user.id,
    }));

    const { data: createdObligations, error: createError } = await supabase
      .from('obligations')
      .insert(obligationRecords)
      .select();

    if (createError) {
      logger.error('Failed to create obligations', {
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
    logger.info('Obligations identified successfully', {
      requestId,
      obligationsCreated: createdObligations?.length || 0,
      duration,
    });

    // Send email notifications to workspace owner
    try {
      const { data: workspace } = await supabase
        .from('workspaces')
        .select('name, owner_id')
        .eq('id', body.workspace_id)
        .single();

      if (workspace?.owner_id) {
        const { data } = await supabase.auth.admin.getUserById(
          workspace.owner_id
        );

        if (data?.user?.email) {
          for (const obligation of createdObligations || []) {
            const { html, text } = obligationAssigned(
              data.user.email,
              obligation.title,
              workspace.name
            );

            await sendEmail({
              to: data.user.email,
              subject: `New Obligation: ${obligation.title}`,
              html,
              text,
              categories: ['euro-ai-obligation-assigned'],
            }).catch((err) => {
              logger.warn('Failed to send obligation notification email', {
                requestId,
                obligationId: obligation.id,
                error: err.message,
              });
            });
          }
        }
      }
    } catch (emailError: any) {
      logger.warn('Email notification failed for obligation creation', {
        requestId,
        error: emailError.message,
      });
    }

    // Trigger webhooks for each created obligation
    try {
      for (const obligation of createdObligations || []) {
        triggerWebhooks(
          body.workspace_id,
          'obligation.created',
          'obligation',
          obligation.id,
          {
            id: obligation.id,
            title: obligation.title,
            category: obligation.category,
            priority: obligation.priority,
            deadline_days: obligation.deadline_days,
            status: obligation.status,
            ai_system_id: body.ai_system_id,
          }
        ).catch((err) => {
          logger.warn('Webhook trigger failed for obligation creation', {
            requestId,
            obligationId: obligation.id,
            error: err.message,
          });
        });
      }
    } catch (webhookError: any) {
      logger.warn('Webhook notification failed for obligation creation', {
        requestId,
        error: webhookError.message,
      });
    }

    return NextResponse.json(
      {
        ok: true,
        obligations_identified: createdObligations?.length || 0,
        obligations: createdObligations || [],
      },
      { status: 201 }
    );
  } catch (error: any) {
    const duration = measureDuration(startTime);

    logger.error('Unhandled exception in obligation identification', {
      requestId,
      duration,
      error: error?.message,
      stack: error?.stack,
    });

    return NextResponse.json(
      {
        ok: false,
        error: error?.message || 'Failed to identify obligations',
      },
      { status: 500 }
    );
  }
}
