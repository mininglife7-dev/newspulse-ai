import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const runtime = 'nodejs';

interface UpdateAISystemRequest {
  id: string;
  workspace_id: string;
  name?: string;
  description?: string;
  category?:
    | 'large_language_model'
    | 'computer_vision'
    | 'recommendation'
    | 'autonomous'
    | 'biometric'
    | 'other';
  status?: 'deployed' | 'in_development' | 'planned' | 'retired';
  risk_level?: 'low' | 'medium' | 'high';
}

export async function PUT(req: NextRequest) {
  try {
    const body: UpdateAISystemRequest = await req.json();

    // Validate required fields
    if (!body.id || !body.workspace_id) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Missing required fields: id, workspace_id',
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

    // Update AI system
    const updateData: any = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined)
      updateData.description = body.description;
    if (body.category !== undefined) updateData.category = body.category;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.risk_level !== undefined) updateData.risk_level = body.risk_level;
    updateData.updated_at = new Date().toISOString();

    const { data: aiSystem, error: updateError } = await supabase
      .from('ai_systems')
      .update(updateData)
      .eq('id', body.id)
      .eq('workspace_id', body.workspace_id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { ok: false, error: updateError.message },
        { status: 500 }
      );
    }

    if (!aiSystem) {
      return NextResponse.json(
        { ok: false, error: 'AI system not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      ai_system: aiSystem,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || 'Failed to update AI system',
      },
      { status: 500 }
    );
  }
}
