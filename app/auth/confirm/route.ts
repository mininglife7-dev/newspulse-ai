import { NextResponse } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { createRouteClient } from '@/lib/supabase-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Only same-origin paths — never absolute URLs (open-redirect guard). */
function safeNext(value: string | null): string {
  return value && value.startsWith('/') && !value.startsWith('//')
    ? value
    : '/dashboard';
}

/**
 * GET /auth/confirm — lands the links Supabase sends by email
 * (signup confirmation, magic link, password recovery).
 *
 * Supports both link styles so it works regardless of how the Supabase
 * email templates are configured:
 *   - ?code=...            → PKCE code exchange
 *   - ?token_hash=&type=   → OTP verification (includes recovery tokens)
 *
 * Recovery tokens (type='recovery') redirect to /auth/reset-password
 * so user can set new password. All others redirect to next or /dashboard.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const next = safeNext(url.searchParams.get('next'));
  const code = url.searchParams.get('code');
  const tokenHash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type') as EmailOtpType | null;

  try {
    const supabase = createRouteClient();

    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) return NextResponse.redirect(new URL(next, url));
    } else if (tokenHash && type) {
      const { error } = await supabase.auth.verifyOtp({
        type,
        token_hash: tokenHash,
      });
      if (!error) {
        // Recovery tokens (password reset) redirect to reset-password page
        // All other tokens redirect to next or dashboard
        const redirectUrl = type === 'recovery' ? '/auth/reset-password' : next;
        return NextResponse.redirect(new URL(redirectUrl, url));
      }
    }
  } catch (err) {
    console.error('[auth/confirm] verification failed:', err);
  }

  return NextResponse.redirect(
    new URL('/auth/signin?error=verification_failed', url)
  );
}
