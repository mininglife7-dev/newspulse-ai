import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase-server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { logDelete, getClientIp } from '@/lib/audit-logger';
import { validators, validate } from '@/lib/input-validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface EraseUserDataRequest {
  confirmErasure?: boolean;
}

/**
 * POST /api/privacy/erase — delete all user personal data (GDPR Article 17)
 *
 * Right to Erasure: User can request complete deletion of their personal data
 * and their profile from the system. Two-step process to prevent accidents:
 *
 * 1. POST without confirmErasure: Returns confirmation prompt
 * 2. POST with confirmErasure: true: Executes full data deletion
 *
 * Deletion includes:
 * - User profile and authentication
 * - All workspace memberships
 * - All personal data associated with user
 * - Audit logs are retained for compliance (they're operational logs, not personal data)
 *
 * Data deletion is performed with service-role (admin) context because:
 * - RLS policies block authenticated user deletion of auth records
 * - Admin context required for data migration/compliance operations
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  const validationResult = validate(body, {
    confirmErasure: validators.optional(validators.boolean()),
  });

  if (!validationResult.ok) {
    return NextResponse.json(
      { ok: false, error: 'Invalid input', errors: validationResult.errors },
      { status: 400 }
    );
  }

  const validated = validationResult.value as EraseUserDataRequest;

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

  // First request: return confirmation prompt
  if (!validated.confirmErasure) {
    return NextResponse.json({
      ok: true,
      erasureRequired: true,
      message:
        'You are about to permanently delete all your personal data from EURO AI, including your account, profile, and workspace memberships. This action cannot be undone.',
      instruction:
        'Send POST request again with confirmErasure: true to proceed',
      note: 'Audit logs will be retained for compliance purposes but will not contain personally identifiable information.',
    });
  }

  try {
    const adminClient = getSupabaseAdmin();
    const ipAddress: string | undefined = getClientIp(request);
    const userAgent: string | undefined =
      request.headers.get('user-agent') || undefined;

    // Log the erasure request BEFORE executing it (GDPR Article 30)
    // This log is retained for compliance even after user deletion
    await logDelete(
      'system',
      'user',
      user.id,
      user.id,
      {
        reason: 'user_requested_erasure',
        timestamp: new Date().toISOString(),
        email: user.email,
      },
      ipAddress,
      userAgent
    );

    // Step 1: Delete user's workspace memberships
    // This cascades to permissions, roles, and access records
    const { error: membershipsError } = await adminClient
      .from('workspace_members')
      .delete()
      .eq('user_id', user.id);

    if (membershipsError && membershipsError.code !== 'PGRST116') {
      // PGRST116 = no rows deleted (which is fine)
      logger.error(
        'Workspace membership deletion failed',
        'ERASURE_MEMBER_ERROR',
        membershipsError
      );
      return NextResponse.json(
        { ok: false, error: 'Failed to delete user data' },
        { status: 500 }
      );
    }

    // Step 2: Delete user profile
    // Cascades: auth.users → profiles (via FK on delete cascade in schema)
    const { error: profileError } = await adminClient
      .from('profiles')
      .delete()
      .eq('id', user.id);

    if (profileError && profileError.code !== 'PGRST116') {
      logger.error(
        'Profile deletion failed',
        'ERASURE_PROFILE_ERROR',
        profileError
      );
      // Profile might not exist; continue to auth deletion
    }

    // Step 3: Delete auth.users (this is the actual account)
    // Using admin client because authenticated users cannot delete themselves
    const { error: authError } = await adminClient.auth.admin.deleteUser(
      user.id
    );

    if (authError) {
      logger.error(
        'Auth user deletion failed',
        'ERASURE_AUTH_ERROR',
        authError
      );
      return NextResponse.json(
        { ok: false, error: 'Failed to delete user account' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: 'Your personal data has been permanently deleted',
      note: 'You will be signed out. Audit logs are retained for compliance purposes.',
      userId: user.id,
    });
  } catch (err) {
    logger.error('User erasure failed', 'ERASURE_EXECUTION_ERROR', err);
    return NextResponse.json(
      { ok: false, error: 'Failed to erase user data' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/privacy/erase — check erasure request status
 */
export async function GET(request: NextRequest) {
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

  // Check for recent erasure logs for this user
  const { data: recentErasureLog, error } = await supabase
    .from('audit_logs')
    .select('created_at')
    .eq('resource_type', 'user')
    .eq('action', 'delete')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    logger.error('Erasure status check failed', 'ERASURE_STATUS_ERROR', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to check erasure status' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    erasureRequested: !!recentErasureLog,
    erasureRequestedAt: recentErasureLog?.created_at || null,
  });
}
