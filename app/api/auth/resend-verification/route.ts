import { NextRequest, NextResponse } from 'next/server';
import { resendVerification } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { ok: false, error: 'Email is required' },
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

    const errorMessage = error instanceof Error ? error.message : 'Failed to resend verification email';

    return NextResponse.json(
      { ok: false, error: errorMessage },
      { status: 500 }
    );
  }
}
