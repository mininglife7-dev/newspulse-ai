import { NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase-server';

export interface ApiContext {
  status: 200 | 401 | 409 | 500;
  error?: string;
  workspaceId?: string;
  companyId?: string | null;
}

interface WorkspaceMembership {
  workspace_id: string;
}

interface Company {
  id: string;
}

/**
 * Resolve the caller's active workspace and optional company.
 * Used by all API routes for consistent auth + authorization.
 *
 * Returns 200 + workspaceId on success.
 * Returns 401 if not authenticated.
 * Returns 409 if no workspace (user must complete setup first).
 */
export async function resolveContext(
  supabase: ReturnType<typeof createRouteClient>,
  options?: { includeCompany?: boolean }
): Promise<ApiContext> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return { status: 401, error: 'Authentication required' };

  const { data: membership, error: membershipError } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle();

  if (membershipError || !membership) {
    console.error('[api-context] workspace query failed:', membershipError);
    return {
      status: membershipError ? 500 : 409,
      error: membershipError ? 'Database access failed' : 'No workspace — complete company setup first',
    };
  }

  const workspaceId = (membership as WorkspaceMembership).workspace_id;

  if (options?.includeCompany) {
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('id')
      .eq('workspace_id', workspaceId)
      .limit(1)
      .maybeSingle();

    if (companyError) {
      console.error('[api-context] company query failed:', companyError);
      return {
        status: 500,
        error: 'Database access failed',
      };
    }

    return {
      status: 200,
      workspaceId,
      companyId: (company as Company | null)?.id ?? null,
    };
  }

  return {
    status: 200,
    workspaceId,
  };
}

/**
 * Helper to check context and return error response if needed.
 * Usage: const ctx = await resolveContext(...); if (ctx.status !== 200) return contextError(ctx);
 */
export function contextError(ctx: ApiContext) {
  return NextResponse.json(
    { ok: false, error: ctx.error },
    { status: ctx.status }
  );
}
