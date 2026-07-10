import { NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export interface WorkspaceSetupBody {
  companyName: string;
  legalName?: string;
  country: string;
  industry: string;
  employees?: string;
  website?: string;
  description?: string;
}

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics (Müller → muller)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  const suffix = crypto.randomUUID().slice(0, 8);
  return base ? `${base}-${suffix}` : suffix;
}

/**
 * POST /api/workspace — create the customer's workspace, company profile,
 * and owner membership in one call. Runs as the signed-in user, so every
 * write is checked by Row Level Security.
 */
export async function POST(req: Request) {
  let body: WorkspaceSetupBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  const companyName = body.companyName?.trim();
  const country = body.country?.trim();
  const industry = body.industry?.trim();
  if (!companyName || !country || !industry) {
    return NextResponse.json(
      { ok: false, error: 'companyName, country and industry are required' },
      { status: 400 }
    );
  }

  const supabase = await createRouteClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: 'Authentication required' },
      { status: 401 }
    );
  }

  // 1. Workspace (tenant boundary)
  const { data: workspace, error: wsError } = await supabase
    .from('workspaces')
    .insert({
      slug: slugify(companyName),
      name: companyName,
      description: body.description?.trim() || null,
      owner_id: user.id,
    })
    .select('id, slug, name')
    .single();

  if (wsError || !workspace) {
    console.error('[api/workspace] workspace insert failed:', wsError);
    return NextResponse.json(
      { ok: false, error: 'Could not create workspace' },
      { status: 500 }
    );
  }

  // 2. Owner membership (activates RLS access to the workspace)
  const { error: memberError } = await supabase
    .from('workspace_members')
    .insert({
      workspace_id: workspace.id,
      user_id: user.id,
      role: 'owner',
      email: user.email ?? '',
      status: 'active',
      joined_at: new Date().toISOString(),
    });

  if (memberError) {
    console.error('[api/workspace] member insert failed:', memberError);
    return NextResponse.json(
      { ok: false, error: 'Could not create workspace membership' },
      { status: 500 }
    );
  }

  // 3. Company profile (the governed entity)
  const { data: company, error: companyError } = await supabase
    .from('companies')
    .insert({
      workspace_id: workspace.id,
      name: companyName,
      legal_name: body.legalName?.trim() || null,
      country,
      industry,
      employees_range: body.employees?.trim() || null,
      website: body.website?.trim() || null,
      governance_priorities: body.description?.trim() || null,
    })
    .select('id')
    .single();

  if (companyError || !company) {
    console.error('[api/workspace] company insert failed:', companyError);
    return NextResponse.json(
      { ok: false, error: 'Could not create company profile' },
      { status: 500 }
    );
  }

  // 4. Point the user's profile at their new workspace (best effort —
  // profile row may not exist if the signup trigger isn't installed).
  const { error: profileError } = await supabase.from('profiles').upsert({
    id: user.id,
    email: user.email ?? '',
    current_workspace_id: workspace.id,
  });
  if (profileError) {
    console.warn('[api/workspace] profile upsert failed:', profileError);
  }

  return NextResponse.json({
    ok: true,
    workspace: { id: workspace.id, slug: workspace.slug, name: workspace.name },
    companyId: company.id,
  });
}
