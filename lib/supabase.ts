import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// =============================================================================
// Public (browser-safe) client — uses the anon / publishable key.
// This is the canonical export per the project spec.
//
// Instantiated lazily behind a Proxy so that merely importing this module
// (e.g. for its exported types during `next build` page-data collection)
// never calls `createClient` with missing env vars. The real client is
// created on first property access.
// =============================================================================
let _browser: SupabaseClient | null = null;
function getBrowserClient(): SupabaseClient {
  if (_browser) return _browser;
  _browser = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { persistSession: false },
    }
  );
  return _browser;
}

export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    return Reflect.get(getBrowserClient(), prop, receiver);
  },
});

// =============================================================================
// Server-only admin client — uses the service-role / secret key.
// NEVER import this from a client component. Bypasses RLS.
// =============================================================================
let _admin: SupabaseClient | null = null;
export function getSupabaseAdmin(): SupabaseClient {
  if (_admin) return _admin;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY'
    );
  }
  _admin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _admin;
}

// =============================================================================
// Types
// =============================================================================
export interface NewsArticle {
  title: string;
  url: string;
  source: string;
  date: string | null;
  description: string | null;
  ai_summary: string;
}

export interface SearchHistoryRow {
  id: string;
  keyword: string;
  results: NewsArticle[];
  result_count: number;
  created_at: string;
  /** Owner of the row. Null only for legacy pre-auth rows (see migration). */
  user_id: string | null;
}

// =============================================================================
// Helpers — server-side data access
//
// EVERY helper is scoped to a `userId` and filters by `user_id` in the query
// itself. This means customer isolation is enforced in application code
// regardless of the database's RLS state (the RLS migration adds a second,
// database-level guarantee). A client can be injected for testing; it defaults
// to the service-role admin client.
// =============================================================================

/**
 * Persist a search + its results for a specific customer.
 * Returns the inserted row, or null on failure (errors logged).
 */
export async function saveSearch(
  userId: string,
  keyword: string,
  results: NewsArticle[],
  client: SupabaseClient = getSupabaseAdmin()
): Promise<SearchHistoryRow | null> {
  if (!userId) {
    console.error('[supabase] saveSearch called without userId — refusing');
    return null;
  }
  try {
    const { data, error } = await client
      .from('news_searches')
      .insert({
        user_id: userId,
        keyword,
        results,
        result_count: results.length,
      })
      .select()
      .single();

    if (error) {
      console.error('[supabase] saveSearch error:', error);
      return null;
    }
    return data as SearchHistoryRow;
  } catch (err) {
    console.error('[supabase] saveSearch exception:', err);
    return null;
  }
}

/** Fetch a customer's most recent searches, newest first. */
export async function getSearchHistory(
  userId: string,
  limit = 50,
  client: SupabaseClient = getSupabaseAdmin()
): Promise<SearchHistoryRow[]> {
  if (!userId) return [];
  try {
    const { data, error } = await client
      .from('news_searches')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[supabase] getSearchHistory error:', error);
      return [];
    }
    return (data ?? []) as SearchHistoryRow[];
  } catch (err) {
    console.error('[supabase] getSearchHistory exception:', err);
    return [];
  }
}

/** Fetch one saved search by id — only if it belongs to the customer. */
export async function getSearchById(
  userId: string,
  id: string,
  client: SupabaseClient = getSupabaseAdmin()
): Promise<SearchHistoryRow | null> {
  if (!userId || !id) return null;
  try {
    const { data, error } = await client
      .from('news_searches')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('[supabase] getSearchById error:', error);
      return null;
    }
    return (data as SearchHistoryRow) ?? null;
  } catch (err) {
    console.error('[supabase] getSearchById exception:', err);
    return null;
  }
}

/** Delete one saved search by id — only if it belongs to the customer. */
export async function deleteSearchById(
  userId: string,
  id: string,
  client: SupabaseClient = getSupabaseAdmin()
): Promise<{ ok: boolean; deleted?: string; error?: string }> {
  if (!userId || !id) return { ok: false, error: 'Missing id.' };
  try {
    const { data, error } = await client
      .from('news_searches')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)
      .select('id');

    if (error) {
      console.error('[supabase] deleteSearchById error:', error);
      return { ok: false, error: error.message };
    }
    const rows = (data ?? []) as Array<{ id: string }>;
    if (rows.length === 0) {
      // Either it does not exist or it is not theirs — same answer, no leak.
      return { ok: false, error: 'Search not found.' };
    }
    return { ok: true, deleted: id };
  } catch (err: any) {
    console.error('[supabase] deleteSearchById exception:', err);
    return { ok: false, error: err?.message || 'Unknown error' };
  }
}

/** Delete every saved search belonging to the customer ("Clear History"). */
export async function clearAllHistory(
  userId: string,
  client: SupabaseClient = getSupabaseAdmin()
): Promise<{ ok: boolean; deleted?: number; error?: string }> {
  if (!userId) return { ok: false, error: 'Not authenticated.' };
  try {
    // Count only this customer's rows for the response.
    const { count } = await client
      .from('news_searches')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);

    const { error } = await client
      .from('news_searches')
      .delete()
      .eq('user_id', userId);

    if (error) {
      console.error('[supabase] clearAllHistory error:', error);
      return { ok: false, error: error.message };
    }
    return { ok: true, deleted: count ?? 0 };
  } catch (err: any) {
    console.error('[supabase] clearAllHistory exception:', err);
    return { ok: false, error: err?.message || 'Unknown error' };
  }
}
