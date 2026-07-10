import { NextResponse } from 'next/server';
import { resendEmailConfirmation } from '@/lib/auth';

export const runtime = 'nodejs';

/**
 * POST /api/auth/resend
 *
 * Resends signup confirmation email to the requested address.
 * Frontend: Called from verify-email page when user clicks "resend verification link"
 * Backend: Wraps lib/auth.resendEmailConfirmation() in HTTP endpoint
 * Supabase: Sends confirmation email with verification link to /auth/confirm
 *
 * Rate limiting: Supabase enforces 1 email/sec. Client should show cooldown UI.
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

    await resendEmailConfirmation(email);

    return NextResponse.json(
      { message: 'Verification email resent' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[api/auth/resend] error:', error);

    // Handle specific error types
    const message = error?.message || 'Failed to resend email';

    if (message.includes('rate')) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait before trying again.' },
        { status: 429 }
      );
    }

    if (message.includes('already')) {
      return NextResponse.json(
        { error: 'This account is already verified.' },
        { status: 400 }
      );
    }

    if (message.includes('not found') || message.includes('not exist')) {
      return NextResponse.json(
        { error: 'Email not found in system.' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
