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
}

// =============================================================================
// Helpers — server-side data access
// =============================================================================

/**
 * Persist a search + its results into the `news_searches` table.
 * Returns the inserted row, or null on failure (errors logged).
 */
export async function saveSearch(
  keyword: string,
  results: NewsArticle[]
): Promise<SearchHistoryRow | null> {
  try {
    const { data, error } = await getSupabaseAdmin()
      .from('news_searches')
      .insert({
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

/** Fetch the most recent searches, newest first. */
export async function getSearchHistory(
  limit = 50
): Promise<SearchHistoryRow[]> {
  try {
    const { data, error } = await getSupabaseAdmin()
      .from('news_searches')
      .select('*')
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

/** Delete every row in `news_searches`. Used by the "Clear History" button. */
export async function clearAllHistory(): Promise<{
  ok: boolean;
  deleted?: number;
  error?: string;
}> {
  try {
    // First count what's there for the response.
    const { count } = await getSupabaseAdmin()
      .from('news_searches')
      .select('id', { count: 'exact', head: true });

    const { error } = await getSupabaseAdmin()
      .from('news_searches')
      .delete()
      .gte('created_at', '1970-01-01'); // matches every row

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
