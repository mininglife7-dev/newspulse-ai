import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// =============================================================================
// Public (browser-safe) client — uses the anon / publishable key.
// This is the canonical export per the project spec.
// Lazily instantiated on first property access: creating it at module
// top-level crashes `next build` when env vars are absent, because this
// module is imported for its types by pages collected at build time.
// =============================================================================
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
  _browser = createClient(url, key, {
    auth: { persistSession: false },
  });
  return _browser;
}

export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getBrowserClient();
    const value = Reflect.get(client, prop, client);
    return typeof value === 'function' ? value.bind(client) : value;
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

// Storage guard (risk R-13): a saved row must not grow unbounded. The
// search route already caps upstream fetches, but this is the last line
// of defense before JSONB hits the database.
const MAX_SAVED_RESULTS = 25;
const MAX_FIELD_CHARS = 4000;

function truncate(value: string | null, max = MAX_FIELD_CHARS): string | null {
  if (value === null) return null;
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

/** Cap result count and text-field sizes before persisting. Exported for tests. */
export function capResultsForStorage(results: NewsArticle[]): NewsArticle[] {
  return results.slice(0, MAX_SAVED_RESULTS).map((r) => ({
    ...r,
    title: truncate(r.title, 500) ?? '',
    source: truncate(r.source, 200) ?? '',
    description: truncate(r.description),
    ai_summary: truncate(r.ai_summary) ?? '',
  }));
}

/**
 * Persist a search + its results into the `news_searches` table.
 * Returns the inserted row, or null on failure (errors logged).
 */
export async function saveSearch(
  keyword: string,
  results: NewsArticle[]
): Promise<SearchHistoryRow | null> {
  try {
    const capped = capResultsForStorage(results);
    const { data, error } = await getSupabaseAdmin()
      .from('news_searches')
      .insert({
        keyword,
        results: capped,
        result_count: capped.length,
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

/**
 * Fetch the most recent searches, newest first.
 *
 * Throws on failure instead of returning [] — an empty list means
 * "you have no history", which is the wrong thing to show the user
 * when the real state is "the database is unreachable".
 */
export async function getSearchHistory(
  limit = 50
): Promise<SearchHistoryRow[]> {
  const { data, error } = await getSupabaseAdmin()
    .from('news_searches')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[supabase] getSearchHistory error:', error);
    throw new Error(`Failed to load search history: ${error.message}`);
  }
  return (data ?? []) as SearchHistoryRow[];
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
