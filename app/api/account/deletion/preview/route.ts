import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase-server';

/**
 * GET /api/account/deletion/preview
 *
 * Show authenticated user what personal data will be deleted.
 * CRITICAL: Does NOT include workspace data the user owns.
 * Workspace deletion is a SEPARATE operation.
 *
 * GDPR Article 17: Right to Erasure
 */

export const dynamic = 'force-dynamic';

interface DeletionPreview {
  personal: {
    profile: {
      id: string;
      email: string;
      first_name: string | null;
      last_name: string | null;
      created_at: string;
    } | null;
    consent_records: number;
    personal_actions: number; // audit_log entries where user_id = this user
  };
  workspaces_owned: Array<{
    id: string;
    name: string;
    member_count: number;
    has_other_members: boolean;
    status: string;
  }>;
  workspaces_member: Array<{
    id: string;
    name: string;
    role: string;
  }>;
  warnings: string[];
  blockers: string[];
}

export async function GET(request: NextRequest) {
  const supabase = await createRouteClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    return NextResponse.json(
      { ok: false, error: 'Authentication required' },
      { status: 401 }
    );
  }

  try {
    // Fetch personal profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name, created_at')
      .eq('id', user.id)
      .maybeSingle();

    // Count consent audit records (personal)
    const { count: consentCount } = await supabase
      .from('consent_audit_log')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id);

    // Count actions user performed (audit_log entries where user_id = this user)
    const { count: actionCount } = await supabase
      .from('audit_log')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id);

    // Get workspaces user OWNS (critical: these must be transferred or deleted separately)
    const { data: ownedWorkspaces } = await supabase
      .from('workspaces')
      .select(
        `
        id,
        name,
        status,
        workspace_members(
          id
        )
      `
      )
      .eq('owner_id', user.id);

    // Get workspaces user is MEMBER OF (user will be removed from these)
    const ownedWorkspaceIds = ownedWorkspaces?.map((w) => w.id) ?? [];
    let memberWorkspacesData = null;
    if (ownedWorkspaceIds.length === 0) {
      const { data } = await supabase
        .from('workspace_members')
        .select(
          `
          role,
          workspace_id,
          workspaces(
            id,
            name
          )
        `
        )
        .eq('user_id', user.id);
      memberWorkspacesData = data;
    } else {
      const { data } = await supabase
        .from('workspace_members')
        .select(
          `
          role,
          workspace_id,
          workspaces(
            id,
            name
          )
        `
        )
        .eq('user_id', user.id)
        .not('workspace_id', 'in', `(${ownedWorkspaceIds.join(',')})`);
      memberWorkspacesData = data;
    }

    const warnings: string[] = [];
    const blockers: string[] = [];

    // Analyze owned workspaces
    const ownedWithAnalysis = (ownedWorkspaces || []).map((ws) => {
      const memberCount = (ws.workspace_members?.length as number) || 1;
      const hasOtherMembers = memberCount > 1;

      if (hasOtherMembers) {
        blockers.push(
          `Cannot delete account: You own "${ws.name}" with ${memberCount - 1} other members. Transfer ownership or delete the workspace separately.`
        );
      }

      return {
        id: ws.id,
        name: ws.name,
        member_count: memberCount,
        has_other_members: hasOtherMembers,
        status: ws.status,
      };
    });

    if (ownedWithAnalysis.length > 0 && blockers.length === 0) {
      warnings.push(
        `You own ${ownedWithAnalysis.length} workspace(s) with no other members. You must delete these workspaces separately before deleting your account.`
      );
    }

    const preview: DeletionPreview = {
      personal: {
        profile: profile || {
          id: user.id,
          email: user.email || '',
          first_name: null,
          last_name: null,
          created_at: new Date().toISOString(),
        },
        consent_records: consentCount || 0,
        personal_actions: actionCount || 0,
      },
      workspaces_owned: ownedWithAnalysis,
      workspaces_member: (memberWorkspacesData || []).map((m) => ({
        id: m.workspace_id,
        name: (m.workspaces as any)?.name || 'Unknown',
        role: m.role,
      })),
      warnings,
      blockers,
    };

    return NextResponse.json({
      ok: true,
      preview,
      can_delete_account: blockers.length === 0,
    });
  } catch (error) {
    console.error('Account deletion preview error:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to generate deletion preview' },
      { status: 500 }
    );
  }
}
