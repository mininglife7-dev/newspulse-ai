import { NextRequest, NextResponse } from 'next/server';
import { firecrawlSearch, normalizeFirecrawlResults } from '@/lib/firecrawl';
import { summarizeBatch } from '@/lib/openai';
import { saveSearch, type NewsArticle } from '@/lib/supabase';
import { parseSearchKeyword, readBodyField } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const FIRECRAWL_LIMIT = 10;

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
  // ---------- 1) Validate input ----------
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Invalid JSON body.' },
      { status: 400 }
    );
  }

  // Guard against non-string / missing / abusively long keywords before
  // spending any Firecrawl or OpenAI budget on the request.
  const parsed = parseSearchKeyword(readBodyField(body, 'keyword'));
  if (!parsed.ok || !parsed.keyword) {
    return NextResponse.json(
      { ok: false, error: parsed.error ?? 'Invalid keyword.' },
      { status: 400 }
    );
  }
  const keyword = parsed.keyword;

  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { ok: false, error: 'Server misconfigured: FIRECRAWL_API_KEY missing.' },
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
      { ok: false, error: err?.message || 'Firecrawl search failed.' },
      { status: 502 }
    );
  }

  // Normalize Firecrawl results — keep only items with a usable URL, resolve
  // titles/descriptions/content. (Pure logic lives in lib/firecrawl.)
  const normalized = normalizeFirecrawlResults(rawResults);

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
