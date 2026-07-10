import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const runtime = 'nodejs';

interface MarkReviewedRequest {
  workspace_id: string;
  update_id: string;
  notes?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: MarkReviewedRequest = await req.json();

    // Validate required fields
    if (!body.workspace_id || !body.update_id) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Missing required fields: workspace_id, update_id',
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

    // Create or update regulatory_review record
    const { data: review, error: createError } = await supabase
      .from('regulatory_reviews')
      .insert([
        {
          workspace_id: body.workspace_id,
          update_id: body.update_id,
          reviewed_by: user.id,
          notes: body.notes,
          reviewed_at: new Date().toISOString(),
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
        review: {
          id: review.id,
          update_id: review.update_id,
          reviewed_at: review.reviewed_at,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || 'Failed to mark update as reviewed',
      },
      { status: 500 }
    );
  }
}
