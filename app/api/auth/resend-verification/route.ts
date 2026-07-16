import { NextRequest, NextResponse } from 'next/server';
import { resendVerificationEmail } from '@/lib/auth';
import { logger } from '@/lib/structured-logger';

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  try {
    const { email } = await req.json();

    if (!email || typeof email !== 'string') {
      logger.warn(
        'Verification resend request missing email',
        'AUTH_RESEND_VERIFICATION_MISSING_EMAIL',
        { provided: !!email },
        Date.now() - startTime
      );
      return NextResponse.json(
        { ok: false, error: 'Email is required' },
        { status: 400 }
      );
    }

    const emailStart = Date.now();
    await resendVerificationEmail(email);
    const emailDuration = Date.now() - emailStart;

    logger.info(
      'Verification email resent successfully',
      'AUTH_VERIFICATION_EMAIL_SENT',
      {
        email: email.replace(/^[^@]{1,2}/, (match) => match + '*****'), // obfuscate email
        email_service_ms: emailDuration,
      },
      Date.now() - startTime
    );

    return NextResponse.json({
      ok: true,
      message: 'Verification email resent successfully. Check your inbox.',
    });
  } catch (error) {
    logger.error(
      'Failed to resend verification email',
      'AUTH_RESEND_VERIFICATION_ERROR',
      error,
      {}
    );

    const errorMessage = error instanceof Error ? error.message : 'Failed to resend verification email';

    return NextResponse.json(
      { ok: false, error: errorMessage },
      { status: 500 }
    );
  }
}
