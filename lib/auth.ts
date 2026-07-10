import { createSupabaseServerClient } from '@/lib/supabase/server';

export interface AuthUser {
  id: string;
  email: string | null;
}

/**
 * Returns the currently authenticated customer, or null when no valid session
 * exists. `getUser()` verifies the JWT with Supabase, so the result is
 * trustworthy for authorization decisions (unlike a decoded cookie).
 *
 * Never throws for the "not signed in" case — callers branch on null. Only a
 * genuine misconfiguration (missing env) surfaces as null too, failing closed.
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const supabase = createSupabaseServerClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user) return null;
    return { id: user.id, email: user.email ?? null };
  } catch (err) {
    console.error('[auth] getCurrentUser failed:', err);
    return null;
  }
}
