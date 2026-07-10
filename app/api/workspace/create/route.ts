import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const runtime = 'nodejs';

interface CreateWorkspaceRequest {
  companyName: string;
  legalName?: string;
  country: string;
  industry: string;
  employees?: string;
  website?: string;
  description?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: CreateWorkspaceRequest = await req.json();

    // Validate required fields
    if (!body.companyName || !body.country || !body.industry) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Missing required fields: companyName, country, industry',
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

    // Create workspace in database
    const { data: workspace, error: createError } = await supabase
      .from('workspaces')
      .insert([
        {
          name: body.companyName,
          legal_name: body.legalName,
          country: body.country,
          industry: body.industry,
          employees: body.employees,
          website: body.website,
          description: body.description,
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

    // Add user as workspace owner
    const { error: memberError } = await supabase
      .from('workspace_members')
      .insert([
        {
          workspace_id: workspace.id,
          user_id: user.id,
          role: 'owner',
        },
      ]);

    if (memberError) {
      return NextResponse.json(
        { ok: false, error: memberError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        workspace: {
          id: workspace.id,
          name: workspace.name,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || 'Failed to create workspace',
      },
      { status: 500 }
    );
  }
}
