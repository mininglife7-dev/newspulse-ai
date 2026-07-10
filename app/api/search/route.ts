import { NextRequest, NextResponse } from 'next/server';
import {
  firecrawlSearch,
  extractDomain,
  extractPublishedDate,
} from '@/lib/firecrawl';
import { summarizeBatch } from '@/lib/openai';
import { saveSearch, type NewsArticle } from '@/lib/supabase';
import { generateRequestId, getRequestId } from '@/lib/request-context';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const FIRECRAWL_LIMIT = 10;

interface SearchBody {
  keyword?: string;
}

/**
 * POST /api/search
 *
 * Body:    { keyword: string }
 * Returns: { ok: true, keyword, count, results: NewsArticle[] }
 *
 * Pipeline:
 *   1. Firecrawl /v1/search       (web search + scrape)
 *   2. OpenAI gpt-4o-mini         (2-3 sentence summary per article)
 *   3. Supabase `news_searches`   (persist for /history)
 *
 * Each result item shape:
 *   { title, url, source, date, description, ai_summary }
 */
export async function POST(req: NextRequest) {
  const requestId = generateRequestId();

  // ---------- 1) Validate input ----------
  let body: SearchBody;
  try {
    body = (await req.json()) as SearchBody;
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Invalid JSON body.', requestId },
      { status: 400 }
    );
  }

  const keyword = (body.keyword ?? '').trim();
  if (!keyword) {
    return NextResponse.json(
      { ok: false, error: 'Missing "keyword" in request body.', requestId },
      { status: 400 }
    );
  }

  const apiKey = process.env.FIRECRAWL_API_KEY;
  const demoMode = process.env.DEMO_MODE === 'true' || process.env.DEMO_MODE === '1';

  // Demo mode: return mock results for demonstration without external APIs
  if (demoMode) {
    const mockResults: NewsArticle[] = [
      {
        title: `News about "${keyword}" — Sample Result 1`,
        url: `https://example.com/article-1`,
        source: 'example.com',
        date: new Date(Date.now() - 86400000).toISOString(),
        description: `This is a demo article about ${keyword}. Real search requires FIRECRAWL_API_KEY.`,
        ai_summary: `In this demo article, we explore ${keyword} and its implications for the future. This is a sample summary generated for demonstration purposes only.`,
      },
      {
        title: `News about "${keyword}" — Sample Result 2`,
        url: `https://news.example.com/article-2`,
        source: 'news.example.com',
        date: new Date(Date.now() - 172800000).toISOString(),
        description: `Another demo article covering ${keyword} from a different perspective.`,
        ai_summary: `Continuing our exploration of ${keyword}, this article provides additional context and analysis. Running in DEMO_MODE with mock data.`,
      },
      {
        title: `News about "${keyword}" — Sample Result 3`,
        url: `https://tech-news.example.com/article-3`,
        source: 'tech-news.example.com',
        date: new Date(Date.now() - 259200000).toISOString(),
        description: `A comprehensive look at ${keyword} and recent developments.`,
        ai_summary: `This article summarizes the key developments in ${keyword}. To use real news data, configure FIRECRAWL_API_KEY, OPENAI_API_KEY, and Supabase credentials.`,
      },
    ];

    return NextResponse.json({
      ok: true,
      keyword,
      count: mockResults.length,
      results: mockResults,
      _demo: true,
      _note: 'Demo mode active. Results are mock data. To use real search, configure FIRECRAWL_API_KEY.',
      requestId,
    });
  }

  if (!apiKey) {
    return NextResponse.json(
      { ok: false, error: 'Server misconfigured: FIRECRAWL_API_KEY missing. Set DEMO_MODE=true to use sample data, or add your Firecrawl API key to .env', requestId },
      { status: 500 }
    );
  }

  // ---------- 2) Search the web with Firecrawl ----------
  // POST https://api.firecrawl.dev/v1/search  body: { query: keyword, limit: 10 }
  let rawResults;
  try {
    rawResults = await firecrawlSearch({
      query: keyword,
      limit: FIRECRAWL_LIMIT,
      apiKey,
    });
  } catch (err: any) {
    console.error('[/api/search] Firecrawl error:', err);
    return NextResponse.json(
      { ok: false, error: err?.message || 'Firecrawl search failed.', requestId },
      { status: 502 }
    );
  }

  // Normalize Firecrawl results — keep only items with a usable URL.
  const normalized = rawResults
    .filter((r) => r && r.url)
    .map((r) => {
      const title =
        r.title ||
        r.metadata?.title ||
        r.metadata?.ogTitle ||
        extractDomain(r.url);

      const description =
        r.description ||
        r.metadata?.description ||
        r.metadata?.ogDescription ||
        null;

      return {
        title,
        url: r.url,
        source: extractDomain(r.url), // (4) source domain
        date: extractPublishedDate(r),
        description,
        // Use scraped markdown when available; fall back to description.
        content: r.markdown || r.content || description || '',
      };
    });

  if (normalized.length === 0) {
    return NextResponse.json({
      ok: true,
      keyword,
      count: 0,
      results: [],
    });
  }

  // ---------- 3) Summarize each article in parallel with OpenAI ----------
  // Uses gpt-4o-mini, 2–3 sentence neutral news summary (see lib/openai.ts).
  let summaries: string[];
  try {
    summaries = await summarizeBatch(
      normalized.map((n) => ({
        title: n.title,
        content: n.content,
        url: n.url,
      })),
      4 // bounded concurrency
    );
  } catch (err: any) {
    console.error('[/api/search] OpenAI batch error:', err);
    summaries = normalized.map(
      (n) => n.description || n.title || 'Summary unavailable.'
    );
  }

  // ---------- 4) Build the final response shape ----------
  // Strict: { title, url, source, date, description, ai_summary }
  const results: NewsArticle[] = normalized.map((n, i) => ({
    title: n.title,
    url: n.url,
    source: n.source,
    date: n.date,
    description: n.description,
    ai_summary: summaries[i] || n.description || n.title || '',
  }));

  // ---------- 5) Persist to Supabase `news_searches` (best-effort) ----------
  // Don't block the response if Supabase is slow or down.
  saveSearch(keyword, results).catch((err) =>
    console.error('[/api/search] saveSearch failed:', err)
  );

  // ---------- 6) Return ----------
  return NextResponse.json({
    ok: true,
    keyword,
    count: results.length,
    results,
    requestId,
  });
}

export async function GET() {
  return NextResponse.json(
    {
      ok: false,
      error: 'Method not allowed. Use POST with JSON body { keyword: string }.',
    },
    { status: 405 }
  );
}
