import { NextRequest, NextResponse } from 'next/server';
import { resendVerification } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    // Validate email format
    if (
      !email ||
      typeof email !== 'string' ||
      !email.includes('@') ||
      !email.includes('.')
    ) {
      return NextResponse.json(
        { ok: false, error: 'Valid email address is required' },
        { status: 400 }
      );
    }

    await resendVerification(email);

    return NextResponse.json({
      ok: true,
      message: 'Verification email resent successfully. Check your inbox.',
    });
  } catch (error) {
    console.error('[api/auth/resend-verification] Error:', error);

    // Never expose internal error details (prevents user enumeration and information disclosure)
    return NextResponse.json(
      {
        ok: false,
        error:
          'Failed to resend verification email. Please try again or contact support.',
      },
      { status: 500 }
    );
  }
}
