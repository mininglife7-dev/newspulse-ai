import { NextResponse } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { createRouteClient } from '@/lib/supabase-server';
import { safeRedirectPath } from '@/lib/routes';
import { recordConsent } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /auth/confirm — lands the links Supabase sends by email
 * (signup confirmation, magic link, password recovery).
 *
 * Supports both link styles so it works regardless of how the Supabase
 * email templates are configured:
 *   - ?code=...            → PKCE code exchange
 *   - ?token_hash=&type=   → OTP verification
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const next = safeRedirectPath(url.searchParams.get('next'));
  const code = url.searchParams.get('code');
  const tokenHash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type') as EmailOtpType | null;

  try {
    const supabase = await createRouteClient();
    let verified = false;

    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) verified = true;
    } else if (tokenHash && type) {
      const { error } = await supabase.auth.verifyOtp({
        type,
        token_hash: tokenHash,
      });
      if (!error) verified = true;
    }

    if (verified) {
      // Record GDPR Article 7 consent (non-blocking)
      // Fire-and-forget: don't wait for consent recording or fail if it errors
      recordConsent(true, false, '1.0').catch((err) => {
        console.error('[auth/confirm] consent recording failed:', err);
      });

      return NextResponse.redirect(new URL(next, url));
    }
  } catch (err) {
    console.error('[auth/confirm] verification failed:', err);
  }

  return NextResponse.redirect(
    new URL('/auth/signin?error=verification_failed', url)
  );
}
