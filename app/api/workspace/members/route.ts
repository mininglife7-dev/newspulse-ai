import { NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase-server';
import { createNotification } from '@/lib/notifications';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface InviteMemberBody {
  email: string;
  role: 'viewer' | 'member' | 'admin' | 'owner';
}

/**
 * Resolve the caller's active workspace and role.
 */
async function resolveContext(supabase: ReturnType<typeof createRouteClient>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: 401 as const, error: 'Authentication required' };

  const { data: membership } = await supabase
    .from('workspace_members')
    .select('workspace_id, role')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle();

  if (!membership) {
    return {
      status: 409 as const,
      error: 'No workspace yet — complete company setup first',
    };
  }

  return {
    status: 200 as const,
    user,
    workspaceId: membership.workspace_id as string,
    role: membership.role as string,
  };
}

/**
 * Check if user has required role
 */
function hasRole(userRole: string, requiredRoles: string[]): boolean {
  const roleHierarchy: Record<string, number> = {
    owner: 4,
    admin: 3,
    member: 2,
    viewer: 1,
  };

  const userLevel = roleHierarchy[userRole] || 0;
  const minRequired = Math.max(...requiredRoles.map((r) => roleHierarchy[r] || 0));

  return userLevel >= minRequired;
}

/** GET /api/workspace/members — list workspace members */
export async function GET(req: Request) {
  const supabase = createRouteClient();
  const ctx = await resolveContext(supabase);
  if (ctx.status !== 200) {
    return NextResponse.json(
      { ok: false, error: ctx.error },
      { status: ctx.status }
    );
  }

  try {
    const { data, error } = await supabase
      .from('workspace_members')
      .select('id, email, role, status, created_at, joined_at')
      .eq('workspace_id', ctx.workspaceId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[api/workspace/members] fetch failed:', error);
      return NextResponse.json(
        { ok: false, error: 'Could not load workspace members' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      members: data || [],
      currentUserRole: ctx.role,
    });
  } catch (err) {
    console.error('[api/workspace/members] error:', err);
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch members' },
      { status: 500 }
    );
  }
}

/** POST /api/workspace/members — invite new member */
export async function POST(req: Request) {
  const supabase = createRouteClient();
  const ctx = await resolveContext(supabase);
  if (ctx.status !== 200) {
    return NextResponse.json(
      { ok: false, error: ctx.error },
      { status: ctx.status }
    );
  }

  // Only admin and owner can invite members
  if (!hasRole(ctx.role, ['admin', 'owner'])) {
    return NextResponse.json(
      { ok: false, error: 'Only admins can invite members' },
      { status: 403 }
    );
  }

  let body: InviteMemberBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Invalid request body' },
      { status: 400 }
    );
  }

  // Validate email
  if (!body.email || !body.email.includes('@')) {
    return NextResponse.json(
      { ok: false, error: 'Valid email is required' },
      { status: 400 }
    );
  }

  // Validate role
  if (!['viewer', 'member', 'admin', 'owner'].includes(body.role)) {
    return NextResponse.json(
      { ok: false, error: 'Invalid role' },
      { status: 400 }
    );
  }

  try {
    // Check if member already exists
    const { data: existing } = await supabase
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', ctx.workspaceId)
      .eq('email', body.email)
      .limit(1)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { ok: false, error: 'User already invited to workspace' },
        { status: 409 }
      );
    }

    // Create invitation
    const { data, error } = await supabase
      .from('workspace_members')
      .insert({
        workspace_id: ctx.workspaceId,
        email: body.email,
        role: body.role,
        status: 'pending',
      })
      .select();

    if (error) {
      console.error('[api/workspace/members] insert failed:', error);
      return NextResponse.json(
        { ok: false, error: 'Failed to invite member' },
        { status: 500 }
      );
    }

    // Notify other admins/owners that new member was invited
    const { data: admins } = await supabase
      .from('workspace_members')
      .select('user_id')
      .eq('workspace_id', ctx.workspaceId)
      .eq('status', 'active')
      .in('role', ['admin', 'owner']);

    if (admins && admins.length > 0) {
      for (const admin of admins) {
        if (admin.user_id !== ctx.user.id) {
          await createNotification(
            supabase,
            ctx.workspaceId,
            admin.user_id,
            'member_added',
            body.email,
            {
              message: `New team member invited with ${body.role} role`,
              entityType: 'workspace_member',
              actionUrl: '/team',
            }
          );
        }
      }
    }

    return NextResponse.json(
      {
        ok: true,
        member: data?.[0],
      },
      { status: 201 }
    );
  } catch (err) {
    console.error('[api/workspace/members] error:', err);
    return NextResponse.json(
      { ok: false, error: 'Failed to invite member' },
      { status: 500 }
    );
  }
}
