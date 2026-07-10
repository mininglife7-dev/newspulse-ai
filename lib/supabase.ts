import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Public (browser-safe) client — uses the anon / publishable key.
 * Sessions are stored in cookies (@supabase/ssr) so the middleware and
 * route handlers can see them; this is what makes sign-in survive
 * navigation and server-side route protection work.
 *
 * Lazily instantiated on first property access: creating it at module
 * top-level crashes `next build` when env vars are absent, because this
 * module is imported for its types by pages collected at build time.
 */
let _browser: SupabaseClient | null = null;
function getBrowserClient(): SupabaseClient {
  if (_browser) return _browser;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY'
    );
  }
  _browser = createBrowserClient(url, key);
  return _browser;
}

export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getBrowserClient();
    const value = Reflect.get(client, prop, client);
    return typeof value === 'function' ? value.bind(client) : value;
  },
});

/**
 * For server-only admin client, import from @/lib/supabase-admin instead.
 * This separation prevents accidental use of the admin key in client components.
 */
