import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * OAuth / email-confirmation callback. Supabase redirects here with a `code`
 * that we exchange for a session cookie, then send the customer on to their
 * destination. Safe to no-op if there is no code.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const redirectParam = url.searchParams.get('redirect') || '/';
  // Only allow same-origin relative redirects (prevent open-redirect abuse).
  const redirectTo = redirectParam.startsWith('/') ? redirectParam : '/';

  if (code) {
    try {
      const supabase = createSupabaseServerClient();
      await supabase.auth.exchangeCodeForSession(code);
    } catch (err) {
      console.error('[auth/callback] exchange failed:', err);
      return NextResponse.redirect(new URL('/login?error=callback', url.origin));
    }
  }

  return NextResponse.redirect(new URL(redirectTo, url.origin));
}
