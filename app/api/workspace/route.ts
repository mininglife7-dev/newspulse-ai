import { NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase-server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { validators, validate } from '@/lib/input-validation';

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

  // The setup form submits untouched optional inputs as '' (an empty text box).
  // `optional` only treats undefined/null as absent, so a blank '' would fall
  // through to the inner check — and website's url() rejects '' — which blocked
  // workspace creation. Normalize blank optionals to undefined first. (Kept in
  // the route rather than in `optional` so JSON APIs still reject malformed
  // blank values for non-string fields like booleans.)
  if (body && typeof body === 'object') {
    for (const key of ['legalName', 'employees', 'website', 'description'] as const) {
      if (body[key] === '') delete body[key];
    }
  }

  // Validate input using schema
  const validationResult = validate(body, {
    companyName: validators.string({ minLength: 1, maxLength: 255 }),
    country: validators.string({ minLength: 1, maxLength: 255 }),
    industry: validators.string({ minLength: 1, maxLength: 255 }),
    legalName: validators.optional(validators.string({ maxLength: 255 })),
    employees: validators.optional(validators.string({ maxLength: 100 })),
    website: validators.optional(validators.url()),
    description: validators.optional(validators.string({ maxLength: 2000 })),
  });

  if (!validationResult.ok) {
    return NextResponse.json(
      { ok: false, error: 'Invalid input', errors: validationResult.errors },
      { status: 400 }
    );
  }

  const validated = validationResult.value as WorkspaceSetupBody;
  const companyName = validated.companyName;
  const country = validated.country;
  const industry = validated.industry;

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
    logger.error(
      'Workspace creation failed',
      'WORKSPACE_INSERT_ERROR',
      wsError
    );
    return NextResponse.json(
      { ok: false, error: 'Could not create workspace' },
      { status: 500 }
    );
  }

  // The workspace row is now committed. These separate PostgREST calls are not
  // wrapped in one transaction, so if a later step fails we must undo it —
  // otherwise a failed setup leaves an orphan workspace and the customer's
  // retry (which mints a fresh slug) piles up duplicates. Delete with the
  // service-role client because there is no RLS delete policy for owners;
  // workspace_members and companies cascade-delete with the workspace.
  const rollbackWorkspace = async () => {
    try {
      await getSupabaseAdmin()
        .from('workspaces')
        .delete()
        .eq('id', workspace.id);
    } catch (cleanupErr) {
      console.error(
        '[api/workspace] rollback failed; orphan workspace may remain:',
        workspace.id,
        cleanupErr
      );
    }
  };

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
    logger.error(
      'Workspace membership creation failed',
      'WORKSPACE_MEMBER_ERROR',
      memberError
    );
    await rollbackWorkspace();
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
    logger.error(
      'Company profile creation failed',
      'WORKSPACE_COMPANY_ERROR',
      companyError
    );
    await rollbackWorkspace();
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
    logger.warn(
      'Profile update failed (non-blocking)',
      'WORKSPACE_PROFILE_WARN',
      {
        message: profileError.message,
      }
    );
  }

  return NextResponse.json({
    ok: true,
    workspace: { id: workspace.id, slug: workspace.slug, name: workspace.name },
    companyId: company.id,
  });
}
