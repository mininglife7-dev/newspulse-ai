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
// Storage bounds (R-13: storage-exhaustion DoS)
// The `results` column is unbounded JSONB. Without a cap, a single search —
// or a flood of them — can bloat rows and fill a small database tier. These
// limits truncate oversized fields and cap the number of stored articles so
// one row can never grow without bound. Display is unaffected: the live API
// response still returns the full, untruncated results; only what we persist
// for /history replay is bounded.
// =============================================================================
export const STORAGE_LIMITS = {
  maxArticles: 25, // Firecrawl already limits to ~10; defensive ceiling
  maxTitle: 500,
  maxDescription: 2_000,
  maxSummary: 4_000,
  maxUrl: 2_000,
  maxSource: 255,
} as const;

function truncate(value: string | null, max: number): string | null {
  if (value == null) return value;
  return value.length > max ? value.slice(0, max) : value;
}

/**
 * Bound a result set to safe storage limits. Pure and side-effect free so it
 * can be unit-tested directly. Never throws; always returns a valid array.
 */
export function boundResultsForStorage(results: NewsArticle[]): NewsArticle[] {
  if (!Array.isArray(results)) return [];
  return results.slice(0, STORAGE_LIMITS.maxArticles).map((r) => ({
    title: truncate(r.title, STORAGE_LIMITS.maxTitle) ?? '',
    url: truncate(r.url, STORAGE_LIMITS.maxUrl) ?? '',
    source: truncate(r.source, STORAGE_LIMITS.maxSource) ?? '',
    date: r.date,
    description: truncate(r.description, STORAGE_LIMITS.maxDescription),
    ai_summary: truncate(r.ai_summary, STORAGE_LIMITS.maxSummary) ?? '',
  }));
}

// =============================================================================
// Helpers — server-side data access
// =============================================================================

/**
 * Persist a search + its results into the `news_searches` table.
 * Returns the inserted row, or null on failure (errors logged).
 *
 * The stored result set is bounded (see boundResultsForStorage) to prevent
 * unbounded JSONB growth; `result_count` reflects what was actually stored.
 */
export async function saveSearch(
  keyword: string,
  results: NewsArticle[]
): Promise<SearchHistoryRow | null> {
  const bounded = boundResultsForStorage(results);
  try {
    const { data, error } = await getSupabaseAdmin()
      .from('news_searches')
      .insert({
        keyword: truncate(keyword, STORAGE_LIMITS.maxTitle) ?? keyword,
        results: bounded,
        result_count: bounded.length,
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
