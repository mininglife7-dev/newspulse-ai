import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

type CookieToSet = { name: string; value: string; options?: CookieOptions };

/**
 * Refreshes the Supabase auth session on every matched request and returns both
 * the (possibly cookie-updated) response and the current user.
 *
 * Running this in middleware keeps the customer's session alive and lets route
 * protection decisions be made from a verified user, not client-supplied state.
 * If Supabase env vars are absent (e.g. a build with stubs), it degrades to
 * "no user" rather than throwing, so the app still boots.
 */
export async function updateSession(request: NextRequest): Promise<{
  response: NextResponse;
  user: { id: string; email?: string } | null;
}> {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return { response, user: null };
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // getUser() revalidates the token against Supabase — do not trust getSession()
  // in middleware, which only decodes the cookie.
  let user: { id: string; email?: string } | null = null;
  try {
    const {
      data: { user: u },
    } = await supabase.auth.getUser();
    user = u ? { id: u.id, email: u.email ?? undefined } : null;
  } catch {
    user = null;
  }

  return { response, user };
}
