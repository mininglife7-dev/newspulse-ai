import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const runtime = 'nodejs';

interface CreateEvidenceRequest {
  workspace_id: string;
  obligation_id?: string;
  ai_system_id?: string;
  title: string;
  description?: string;
  category: 'documentation' | 'testing' | 'audit' | 'policy' | 'training' | 'other';
  evidence_type: 'file' | 'url' | 'note' | 'attestation';
  file_url?: string;
  external_url?: string;
  content?: string;
  tags?: string[];
}

export async function POST(req: NextRequest) {
  try {
    const body: CreateEvidenceRequest = await req.json();

    // Validate required fields
    if (!body.workspace_id || !body.title || !body.category || !body.evidence_type) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Missing required fields: workspace_id, title, category, evidence_type',
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

    // Create evidence record
    const { data: evidence, error: createError } = await supabase
      .from('evidence')
      .insert([
        {
          workspace_id: body.workspace_id,
          obligation_id: body.obligation_id,
          ai_system_id: body.ai_system_id,
          title: body.title,
          description: body.description,
          category: body.category,
          evidence_type: body.evidence_type,
          file_url: body.file_url,
          external_url: body.external_url,
          content: body.content,
          tags: body.tags || [],
          status: 'submitted',
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
        evidence: {
          id: evidence.id,
          title: evidence.title,
          category: evidence.category,
          status: evidence.status,
          created_at: evidence.created_at,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || 'Failed to create evidence',
      },
      { status: 500 }
    );
  }
}
