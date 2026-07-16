import type { createRouteClient } from '@/lib/supabase-server';

export type WorkspaceContext =
  | { status: 200; workspaceId: string; companyId: string | null }
  | { status: 401 | 409; error: string };

/**
 * Resolve the caller's active workspace (and its company) or explain why not.
 * All queries run as the signed-in user, so RLS applies. Shared by every
 * /api/ai-systems route handler so the auth + workspace gate is defined once.
 */
export async function resolveWorkspaceContext(
  supabase: Awaited<ReturnType<typeof createRouteClient>>
): Promise<WorkspaceContext> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: 401, error: 'Authentication required' };

  const { data: membership } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle();

  if (!membership) {
    return {
      status: 409,
      error: 'No workspace yet — complete company setup first',
    };
  }

  const { data: company } = await supabase
    .from('companies')
    .select('id')
    .eq('workspace_id', membership.workspace_id)
    .limit(1)
    .maybeSingle();

  return {
    status: 200,
    workspaceId: membership.workspace_id as string,
    companyId: (company?.id as string) ?? null,
  };
}
