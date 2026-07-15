import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const runtime = 'nodejs';

interface IdentifyObligationsRequest {
  workspace_id: string;
  ai_system_id: string;
  risk_assessment_id?: string;
  assessment_type: 'prohibited' | 'high_risk' | 'general';
  risk_score: number;
}

export async function POST(req: NextRequest) {
  try {
    const body: IdentifyObligationsRequest = await req.json();

    // Validate required fields
    if (!body.workspace_id || !body.ai_system_id || !body.assessment_type) {
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

    // Verify AI system exists and get company_id
    const { data: aiSystem, error: aiError } = await supabase
      .from('ai_systems')
      .select('id, company_id')
      .eq('id', body.ai_system_id)
      .eq('workspace_id', body.workspace_id)
      .single();

    if (aiError || !aiSystem) {
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
        description: 'This AI system falls under prohibited uses per EU AI Act Article 5. Immediate action required.',
        priority: 'critical',
        deadline_days: 30,
      });
    } else if (body.assessment_type === 'high_risk') {
      obligations.push({
        category: 'documentation',
        title: 'High-Risk AI System Documentation',
        description: 'Comprehensive documentation required including training data, testing procedures, and usage guidelines per Article 13.',
        priority: 'high',
        deadline_days: 90,
      });

      if (body.risk_score >= 70) {
        obligations.push({
          category: 'monitoring',
          title: 'Continuous Performance Monitoring',
          description: 'Implement system for monitoring performance and compliance with Article 15 requirements.',
          priority: 'high',
          deadline_days: 90,
        });

        obligations.push({
          category: 'governance',
          title: 'Human Oversight Procedures',
          description: 'Establish procedures for human oversight and intervention per Article 14.',
          priority: 'high',
          deadline_days: 90,
        });
      }
    } else {
      // General compliance for all systems
      obligations.push({
        category: 'transparency',
        title: 'Transparency and Disclosure',
        description: 'Users should be informed when interacting with AI systems per Article 52.',
        priority: 'medium',
        deadline_days: 180,
      });
    }

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
      return NextResponse.json(
        { ok: false, error: createError.message },
        { status: 500 }
      );
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
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || 'Failed to identify obligations',
      },
      { status: 500 }
    );
  }
}
