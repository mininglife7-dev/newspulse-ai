import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

function jsonRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/search', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/search input validation', () => {
  beforeEach(() => {
    vi.stubEnv('FIRECRAWL_API_KEY', '');
    vi.resetModules();
  });

  it('rejects invalid JSON with 400', async () => {
    const { POST } = await import('@/app/api/search/route');
    const req = new NextRequest('http://localhost:3000/api/search', {
      method: 'POST',
      body: 'not-json{',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/invalid json/i);
  });

  it('rejects a missing keyword with 400', async () => {
    const { POST } = await import('@/app/api/search/route');
    const res = await POST(jsonRequest({}));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/keyword/i);
  });

  it('rejects a whitespace-only keyword with 400', async () => {
    const { POST } = await import('@/app/api/search/route');
    const res = await POST(jsonRequest({ keyword: '   ' }));
    expect(res.status).toBe(400);
  });

  it('returns 500 when FIRECRAWL_API_KEY is not configured', async () => {
    const { POST } = await import('@/app/api/search/route');
    const res = await POST(jsonRequest({ keyword: 'ai' }));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toMatch(/misconfigured/i);
  });

  it('returns 405 for GET', async () => {
    const { GET } = await import('@/app/api/search/route');
    const res = await GET();
    expect(res.status).toBe(405);
  });
});

describe('POST /api/search with DEMO_MODE', () => {
  beforeEach(() => {
    vi.stubEnv('FIRECRAWL_API_KEY', '');
    vi.stubEnv('DEMO_MODE', 'true');
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns mock results when DEMO_MODE is enabled', async () => {
    const { POST } = await import('@/app/api/search/route');
    const res = await POST(jsonRequest({ keyword: 'artificial intelligence' }));
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json._demo).toBe(true);
    expect(json.results).toBeDefined();
    expect(Array.isArray(json.results)).toBe(true);
    expect(json.results.length).toBeGreaterThan(0);
  });

  it('includes keyword in mock results', async () => {
    const { POST } = await import('@/app/api/search/route');
    const res = await POST(jsonRequest({ keyword: 'bitcoin' }));

    const json = await res.json();
    expect(json.keyword).toBe('bitcoin');
    expect(json.count).toBe(json.results.length);
    expect(json.results[0].title).toContain('bitcoin');
  });

  it('returns valid article schema in demo mode', async () => {
    const { POST } = await import('@/app/api/search/route');
    const res = await POST(jsonRequest({ keyword: 'nasa' }));

    const json = await res.json();
    const article = json.results[0];

    expect(article).toHaveProperty('title');
    expect(article).toHaveProperty('url');
    expect(article).toHaveProperty('source');
    expect(article).toHaveProperty('date');
    expect(article).toHaveProperty('description');
    expect(article).toHaveProperty('ai_summary');

    expect(typeof article.title).toBe('string');
    expect(typeof article.url).toBe('string');
    expect(typeof article.ai_summary).toBe('string');
  });
});
