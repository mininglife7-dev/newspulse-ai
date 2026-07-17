import { NextRequest, NextResponse } from 'next/server';
import { requireAdminToken } from '@/lib/api-auth';
import { getSupabaseAdmin } from '@/lib/supabase';

/**
 * TEMPORARY DEVELOPMENT ENDPOINT
 *
 * Manually verify a user's email without requiring email confirmation.
 * Used for testing when Supabase email service is not configured.
 *
 * MUST BE REMOVED before production release.
 *
 * POST /api/admin/verify-email
 * Authorization: Bearer <ADMIN_TOKEN>
 * Body: { email: "user@example.com" }
 */

export async function POST(req: NextRequest) {
  // Require admin authentication
  if (!requireAdminToken(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { email } = await req.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }

    const admin = getSupabaseAdmin();

    // Find user by email
    const { data: users, error: listError } =
      await admin.auth.admin.listUsers();

    if (listError) {
      console.error('[admin/verify-email] Failed to list users:', listError);
      return NextResponse.json(
        { error: 'Failed to find user' },
        { status: 500 }
      );
    }

    const user = users?.find((u: any) => u.email === email);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Mark email as confirmed
    const { error: updateError } = await admin.auth.admin.updateUserById(
      user.id,
      {
        email_confirm: true,
      }
    );

    if (updateError) {
      console.error(
        '[admin/verify-email] Failed to verify email:',
        updateError
      );
      return NextResponse.json(
        { error: 'Failed to verify email' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: `Email verified for ${email}`,
      user_id: user.id,
    });
  } catch (error) {
    console.error('[admin/verify-email] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
