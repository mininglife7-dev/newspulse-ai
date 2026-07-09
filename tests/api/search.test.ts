import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { GET, POST } from '@/app/api/search/route';

function post(body: string): Request {
  return new Request('http://localhost/api/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
}

let firecrawlKey: string | undefined;

beforeEach(() => {
  firecrawlKey = process.env.FIRECRAWL_API_KEY;
});

afterEach(() => {
  if (firecrawlKey === undefined) delete process.env.FIRECRAWL_API_KEY;
  else process.env.FIRECRAWL_API_KEY = firecrawlKey;
});

describe('POST /api/search — input validation', () => {
  it('returns 400 for a malformed JSON body', async () => {
    const res = await POST(post('{ not json') as never);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toMatch(/JSON/i);
  });

  it('returns 400 when keyword is missing', async () => {
    const res = await POST(post('{}') as never);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toMatch(/keyword/i);
  });

  it('returns 400 when keyword is only whitespace', async () => {
    const res = await POST(post('{"keyword":"   "}') as never);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.ok).toBe(false);
  });
});

describe('POST /api/search — configuration', () => {
  it('returns 500 when FIRECRAWL_API_KEY is not configured', async () => {
    delete process.env.FIRECRAWL_API_KEY;
    const res = await POST(post('{"keyword":"Tesla"}') as never);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toMatch(/FIRECRAWL_API_KEY/);
  });
});

describe('GET /api/search', () => {
  it('returns 405 (method not allowed)', async () => {
    const res = await GET();
    expect(res.status).toBe(405);
    const body = await res.json();
    expect(body.ok).toBe(false);
  });
});
