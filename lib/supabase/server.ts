import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { SupabaseClient } from '@supabase/supabase-js';

type CookieToSet = { name: string; value: string; options?: CookieOptions };

/**
 * Server-side Supabase client bound to the request's auth cookies.
 *
 * Use this inside Server Components, Route Handlers, and Server Actions to act
 * *as the signed-in customer*. Row Level Security is enforced by the customer's
 * own JWT — this client can only see rows the policies allow.
 *
 * (For privileged, cross-user maintenance work use `getSupabaseAdmin()` from
 * `@/lib/supabase`, which bypasses RLS and must never be exposed to the client.)
 */
export function createSupabaseServerClient(): SupabaseClient {
  const cookieStore = cookies();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY'
    );
  }

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // `setAll` is called from a Server Component render, where mutating
          // cookies throws. The session is refreshed in middleware instead, so
          // this is safe to ignore.
        }
      },
    },
  });
}
