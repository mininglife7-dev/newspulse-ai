/**
 * Shared types for NewsPulse AI.
 * Re-exports the canonical types defined alongside their data layer.
 */

export type { NewsArticle, SearchHistoryRow } from '@/lib/supabase';
export type {
  FirecrawlSearchResult,
  FirecrawlSearchResponse,
} from '@/lib/firecrawl';

// ----- API contract types -----

export interface SearchRequestBody {
  keyword: string;
  limit?: number;
}

export interface SearchResponseBody {
  ok: boolean;
  keyword?: string;
  count?: number;
  /** Whether the search was persisted to history (false = shown but not saved). */
  saved?: boolean;
  /** Row id of the saved search, when persisted. */
  search_id?: string | null;
  results?: import('@/lib/supabase').NewsArticle[];
  error?: string;
}

export interface HistoryListResponse {
  ok: boolean;
  count?: number;
  history?: import('@/lib/supabase').SearchHistoryRow[];
  error?: string;
}

export interface HistoryEntryResponse {
  ok: boolean;
  entry?: import('@/lib/supabase').SearchHistoryRow;
  error?: string;
}

export interface HealthResponse {
  ok: boolean;
  status: 'healthy' | 'degraded';
  timestamp: string;
  uptime_s: number | null;
  checks: {
    firecrawl: boolean;
    openai: boolean;
    supabase_url: boolean;
    supabase_anon: boolean;
    supabase_service: boolean;
  };
}
