import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the network-bound dependencies. Keep the REAL normalizeFirecrawlResults
// so the route's data-shaping is exercised end to end.
vi.mock('@/lib/firecrawl', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/firecrawl')>();
  return { ...actual, firecrawlSearch: vi.fn() };
});
vi.mock('@/lib/openai', () => ({ summarizeBatch: vi.fn() }));
vi.mock('@/lib/supabase', () => ({ saveSearch: vi.fn().mockResolvedValue(null) }));

import { POST } from '@/app/api/search/route';
import { firecrawlSearch } from '@/lib/firecrawl';
import { summarizeBatch } from '@/lib/openai';
import { saveSearch } from '@/lib/supabase';

const mockFirecrawl = vi.mocked(firecrawlSearch);
const mockSummarize = vi.mocked(summarizeBatch);
const mockSave = vi.mocked(saveSearch);

/** Minimal stand-in for NextRequest — the route only calls req.json(). */
function req(body: unknown, throwOnJson = false): any {
  return {
    json: async () => {
      if (throwOnJson) throw new Error('bad json');
      return body;
    },
  };
}

beforeEach(() => {
  process.env.FIRECRAWL_API_KEY = 'fc-test';
  mockSummarize.mockResolvedValue(['summary']);
  mockSave.mockResolvedValue(null);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/search', () => {
  it('returns 400 on invalid JSON', async () => {
    const res = await POST(req({}, true));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/invalid json/i);
  });

  it('returns 400 when keyword is missing', async () => {
    const res = await POST(req({}));
    expect(res.status).toBe(400);
    expect((await res.json()).ok).toBe(false);
  });

  it('returns 400 when keyword is not a string', async () => {
    const res = await POST(req({ keyword: { nope: true } }));
    expect(res.status).toBe(400);
  });

  it('returns 500 when FIRECRAWL_API_KEY is missing', async () => {
    delete process.env.FIRECRAWL_API_KEY;
    const res = await POST(req({ keyword: 'tesla' }));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toMatch(/FIRECRAWL_API_KEY/);
  });

  it('returns 502 when Firecrawl throws', async () => {
    mockFirecrawl.mockRejectedValueOnce(new Error('firecrawl down'));
    const res = await POST(req({ keyword: 'tesla' }));
    expect(res.status).toBe(502);
    expect((await res.json()).error).toMatch(/firecrawl down/);
  });

  it('returns ok with count 0 when there are no results', async () => {
    mockFirecrawl.mockResolvedValueOnce([]);
    const res = await POST(req({ keyword: 'tesla' }));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json).toMatchObject({ ok: true, count: 0, results: [] });
    expect(mockSummarize).not.toHaveBeenCalled();
  });

  it('summarizes, shapes, and persists results on success', async () => {
    mockFirecrawl.mockResolvedValueOnce([
      {
        url: 'https://www.bbc.com/news/x',
        title: 'Headline',
        markdown: 'body text',
      },
    ]);
    mockSummarize.mockResolvedValueOnce(['A crisp AI summary.']);

    const res = await POST(req({ keyword: 'tesla' }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.count).toBe(1);
    expect(json.results[0]).toMatchObject({
      title: 'Headline',
      url: 'https://www.bbc.com/news/x',
      source: 'bbc.com',
      ai_summary: 'A crisp AI summary.',
    });
    expect(mockSave).toHaveBeenCalledWith('tesla', expect.any(Array));
  });

  it('falls back to description/title when summarization fails', async () => {
    mockFirecrawl.mockResolvedValueOnce([
      { url: 'https://a.com/1', title: 'T1', description: 'D1' },
    ]);
    mockSummarize.mockRejectedValueOnce(new Error('openai down'));

    const res = await POST(req({ keyword: 'tesla' }));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.results[0].ai_summary).toBe('D1');
  });
});
