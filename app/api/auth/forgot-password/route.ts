import { NextResponse } from 'next/server';
import { resetPassword } from '@/lib/auth';

export const runtime = 'nodejs';

/**
 * POST /api/auth/forgot-password
 *
 * Initiates password reset flow. Sends reset email to requested address.
 * Frontend: Call from forgot-password page when user submits email
 * Backend: Wraps lib/auth.resetPassword() in HTTP endpoint
 * Supabase: Sends email with recovery link to /auth/reset-password?code=...
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    await resetPassword(email);

    return NextResponse.json(
      { message: 'Password reset email sent' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[api/auth/forgot-password] error:', error);

    return NextResponse.json(
      { error: error?.message || 'Failed to send reset email' },
      { status: 500 }
    );
  }
}
