/**
 * Thin wrapper around the Firecrawl /v1/search endpoint.
 * Docs: https://docs.firecrawl.dev/features/search
 */

// Overridable so tests can point at a local mock server.
const FIRECRAWL_BASE =
  process.env.FIRECRAWL_BASE_URL || 'https://api.firecrawl.dev';

export interface FirecrawlSearchResult {
  url: string;
  title?: string;
  description?: string;
  markdown?: string;
  content?: string;
  metadata?: {
    title?: string;
    description?: string;
    sourceURL?: string;
    ogTitle?: string;
    ogDescription?: string;
    publishedTime?: string;
    'article:published_time'?: string;
  };
}

export interface FirecrawlSearchResponse {
  success: boolean;
  data: FirecrawlSearchResult[];
  warning?: string;
  error?: string;
}

/**
 * Search the web with Firecrawl. Each result optionally includes scraped
 * markdown content (when `scrapeOptions.formats: ['markdown']` is set).
 */
export async function firecrawlSearch(args: {
  query: string;
  limit?: number;
  apiKey: string;
}): Promise<FirecrawlSearchResult[]> {
  const { query, limit = 8, apiKey } = args;

  const res = await fetch(`${FIRECRAWL_BASE}/v1/search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      query,
      limit,
      scrapeOptions: {
        formats: ['markdown'],
        onlyMainContent: true,
      },
    }),
    // News results change frequently — never cache.
    cache: 'no-store',
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(
      `Firecrawl search failed (${res.status}): ${text || res.statusText}`
    );
  }

  const json = (await res.json()) as FirecrawlSearchResponse;
  if (!json.success) {
    throw new Error(json.error || 'Firecrawl returned success=false');
  }
  return json.data ?? [];
}

/** Extract a clean source domain from a URL (e.g. "www.bbc.com" -> "bbc.com"). */
export function extractDomain(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./i, '');
  } catch {
    return url;
  }
}

/** Best-effort published-date extraction from a Firecrawl result. */
export function extractPublishedDate(
  result: FirecrawlSearchResult
): string | null {
  const meta = result.metadata ?? {};
  const raw =
    meta.publishedTime ||
    meta['article:published_time'] ||
    null;
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}
