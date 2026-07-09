import { describe, it, expect, beforeEach, vi } from 'vitest';
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
