import { NextRequest, NextResponse } from 'next/server';
import {
  firecrawlSearch,
  extractDomain,
  extractPublishedDate,
} from '@/lib/firecrawl';
import { summarizeBatch } from '@/lib/openai';
import { saveSearch, type NewsArticle } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';
import { log, newRequestId } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const FIRECRAWL_LIMIT = 10;
const MAX_KEYWORD_LEN = 200;

interface SearchBody {
  keyword?: string;
}

/**
 * POST /api/search
 *
 * Body:    { keyword: string }
 * Returns: { ok: true, keyword, count, results: NewsArticle[], saved: boolean }
 *
 * Pipeline: Firecrawl search+scrape → OpenAI gpt-4o-mini summaries → (if the
 * customer is signed in) persist to their own history in Supabase.
 *
 * Auth model (deliberately hybrid): anonymous visitors may run a search — this
 * is the public demo — but their searches are NEVER persisted, so no history is
 * shared between people. Only a signed-in customer's searches are saved, scoped
 * to their account. Middleware applies tighter rate limits to anonymous callers
 * to protect our paid AI/search spend.
 */
export async function POST(req: NextRequest) {
  const requestId = newRequestId();
  const route = 'POST /api/search';
  const user = await getCurrentUser();

  // ---------- 1) Validate input ----------
  let body: SearchBody;
  try {
    body = (await req.json()) as SearchBody;
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Invalid JSON body.' },
      { status: 400 }
    );
  }

  const keyword = (body.keyword ?? '').trim();
  if (!keyword) {
    return NextResponse.json(
      { ok: false, error: 'Missing "keyword" in request body.' },
      { status: 400 }
    );
  }
  if (keyword.length > MAX_KEYWORD_LEN) {
    return NextResponse.json(
      { ok: false, error: `Keyword too long (max ${MAX_KEYWORD_LEN}).` },
      { status: 400 }
    );
  }

  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) {
    log.error('Firecrawl key missing', { requestId, route, status: 500 });
    return NextResponse.json(
      { ok: false, error: 'Server misconfigured: FIRECRAWL_API_KEY missing.' },
      { status: 500 }
    );
  }

  const startedAt = Date.now();

  // ---------- 2) Search the web with Firecrawl ----------
  let rawResults;
  try {
    rawResults = await firecrawlSearch({
      query: keyword,
      limit: FIRECRAWL_LIMIT,
      apiKey,
    });
  } catch (err: any) {
    log.error('Firecrawl search failed', {
      requestId,
      route,
      dependency: 'firecrawl',
      status: 502,
    });
    return NextResponse.json(
      { ok: false, error: err?.message || 'Firecrawl search failed.' },
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
        source: extractDomain(r.url),
        date: extractPublishedDate(r),
        description,
        content: r.markdown || r.content || description || '',
      };
    });

  if (normalized.length === 0) {
    log.info('search empty', {
      requestId,
      route,
      userId: user?.id,
      durationMs: Date.now() - startedAt,
    });
    return NextResponse.json({
      ok: true,
      keyword,
      count: 0,
      results: [],
      saved: false,
    });
  }

  // ---------- 3) Summarize each article in parallel with OpenAI ----------
  let summaries: string[];
  try {
    summaries = await summarizeBatch(
      normalized.map((n) => ({
        title: n.title,
        content: n.content,
        url: n.url,
      })),
      4
    );
  } catch (err: any) {
    log.warn('OpenAI batch failed; using fallbacks', {
      requestId,
      route,
      dependency: 'openai',
    });
    summaries = normalized.map(
      (n) => n.description || n.title || 'Summary unavailable.'
    );
  }

  // ---------- 4) Build the final response shape ----------
  const results: NewsArticle[] = normalized.map((n, i) => ({
    title: n.title,
    url: n.url,
    source: n.source,
    date: n.date,
    description: n.description,
    ai_summary: summaries[i] || n.description || n.title || '',
  }));

  // ---------- 5) Persist — ONLY for signed-in customers, scoped to them ----
  let saved = false;
  if (user) {
    const row = await saveSearch(user.id, keyword, results).catch((err) => {
      log.error('saveSearch failed', {
        requestId,
        route,
        userId: user.id,
        dependency: 'supabase',
      });
      return null;
    });
    saved = Boolean(row);
  }

  log.info('search ok', {
    requestId,
    route,
    userId: user?.id,
    status: 200,
    durationMs: Date.now() - startedAt,
    count: results.length,
    saved,
  });

  return NextResponse.json({
    ok: true,
    keyword,
    count: results.length,
    results,
    saved,
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
