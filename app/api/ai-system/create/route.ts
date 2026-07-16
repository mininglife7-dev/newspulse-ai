import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const runtime = 'nodejs';

interface CreateAISystemRequest {
  workspace_id: string;
  name: string;
  description?: string;
  category:
    | 'large_language_model'
    | 'computer_vision'
    | 'recommendation'
    | 'autonomous'
    | 'biometric'
    | 'other';
  status: 'deployed' | 'in_development' | 'planned' | 'retired';
  risk_level?: 'low' | 'medium' | 'high';
}

export async function POST(req: NextRequest) {
  try {
    const body: CreateAISystemRequest = await req.json();

    // Validate required fields
    if (!body.workspace_id || !body.name || !body.category) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Missing required fields: workspace_id, name, category',
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

    // Create AI system
    const { data: aiSystem, error: createError } = await supabase
      .from('ai_systems')
      .insert([
        {
          workspace_id: body.workspace_id,
          name: body.name,
          description: body.description,
          category: body.category,
          status: body.status || 'in_development',
          risk_level: body.risk_level || 'medium',
          created_by: user.id,
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
        ai_system: aiSystem,
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || 'Failed to create AI system',
      },
      { status: 500 }
    );
  }
}
