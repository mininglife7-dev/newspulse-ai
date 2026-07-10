import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** POST /auth/signout — end the customer's session and return home. */
export async function POST(req: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    await supabase.auth.signOut();
  } catch (err) {
    console.error('[auth/signout] failed:', err);
  }
  return NextResponse.redirect(new URL('/', req.url), { status: 303 });
}
