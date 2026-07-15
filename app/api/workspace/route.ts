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

function withTimeout<T>(promise: Promise<T>, timeoutMs: number = 25000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs)
    ),
  ]);
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

  // Idempotency check: prevent duplicate workspace creation if user already has one
  // (user can have multiple workspaces, but we prevent re-submission of same form)
  const proposedSlug = slugify(companyName);
  const { data: existing } = await supabase
    .from('workspaces')
    .select('id, slug, name')
    .eq('owner_id', user.id)
    .eq('slug', proposedSlug)
    .single();

  if (existing) {
    // Return the existing workspace (idempotent response)
    console.log('[api/workspace] Idempotent: workspace already exists', existing.id);
    return NextResponse.json({
      ok: true,
      workspace: { id: existing.id, slug: existing.slug, name: existing.name },
      isDuplicate: true,
      message: 'Workspace already exists with this name',
    });
  }

  // Atomic workspace creation: all 3 operations (workspace, membership, company) in one transaction
  const slug = proposedSlug;

  let workspace: { id: string; slug: string; name: string };
  let company: { id: string };

  try {
    const result = await withTimeout(
      supabase.rpc('create_workspace_atomic', {
        p_slug: slug,
        p_name: companyName,
        p_description: body.description?.trim() || null,
        p_owner_id: user.id,
        p_legal_name: body.legalName?.trim() || null,
        p_country: country,
        p_industry: industry,
        p_employees_range: body.employees?.trim() || null,
        p_website: body.website?.trim() || null,
        p_governance_priorities: body.description?.trim() || null,
      })
    );

    const data = result.data as { success: boolean; workspace_id?: string; company_id?: string; error?: string };

    if (!data.success || !data.workspace_id || !data.company_id) {
      console.error('[api/workspace] atomic creation failed:', data.error || 'Unknown error');
      return NextResponse.json(
        { ok: false, error: data.error || 'Could not create workspace. Please try again.' },
        { status: 500 }
      );
    }

    workspace = {
      id: data.workspace_id,
      slug,
      name: companyName,
    };

    company = {
      id: data.company_id,
    };
  } catch (error) {
    console.error('[api/workspace] atomic creation timeout/error:', error);
    return NextResponse.json(
      { ok: false, error: 'Workspace creation timed out or failed. Please try again.' },
      { status: 500 }
    );
  }

  // 4. Point the user's profile at their new workspace (best effort —
  // profile row may not exist if the signup trigger isn't installed).
  try {
    await withTimeout(
      supabase.from('profiles').upsert({
        id: user.id,
        email: user.email ?? '',
        current_workspace_id: workspace.id,
      })
    );
  } catch (error) {
    console.warn('[api/workspace] profile upsert timeout/error:', error);
    // Non-fatal: continue anyway, workspace is already created
  }

  return NextResponse.json({
    ok: true,
    workspace: { id: workspace.id, slug: workspace.slug, name: workspace.name },
    companyId: company.id,
  });
}
