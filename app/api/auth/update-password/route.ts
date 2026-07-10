import { NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase-server';
import { updatePassword } from '@/lib/auth';

export const runtime = 'nodejs';

/**
 * POST /api/auth/update-password
 *
 * Updates user password in recovery session (after clicking reset link).
 * Frontend: Called from reset-password page when user submits new password
 * Backend: Uses Supabase recovery session to call updatePassword()
 * Requires: User must be authenticated in recovery session (from email link)
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    // Verify user is authenticated (must be in recovery session)
    const supabase = createRouteClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Update password in recovery session
    await updatePassword(password);

    return NextResponse.json(
      { message: 'Password updated successfully' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[api/auth/update-password] error:', error);

    return NextResponse.json(
      { error: error?.message || 'Failed to update password' },
      { status: 500 }
    );
  }
}
