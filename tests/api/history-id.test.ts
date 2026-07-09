import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DELETE, GET } from '@/app/api/history/[id]/route';

const SUPABASE_KEYS = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];

function req(): Request {
  return new Request('http://localhost/api/history/x');
}

let snapshot: Record<string, string | undefined>;

beforeEach(() => {
  // Ensure the admin client cannot be constructed, so the route exercises
  // its error-handling path deterministically without a live Supabase.
  snapshot = {};
  for (const k of SUPABASE_KEYS) {
    snapshot[k] = process.env[k];
    delete process.env[k];
  }
});

afterEach(() => {
  for (const k of SUPABASE_KEYS) {
    if (snapshot[k] === undefined) delete process.env[k];
    else process.env[k] = snapshot[k];
  }
});

describe('GET /api/history/[id]', () => {
  it('returns 400 when id is empty', async () => {
    const res = await GET(req() as never, { params: { id: '' } });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toMatch(/id/i);
  });

  it('returns 500 when Supabase is not configured', async () => {
    const res = await GET(req() as never, { params: { id: 'abc-123' } });
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.ok).toBe(false);
  });
});

describe('DELETE /api/history/[id]', () => {
  it('returns 400 when id is empty', async () => {
    const res = await DELETE(req() as never, { params: { id: '' } });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toMatch(/id/i);
  });

  it('returns 500 when Supabase is not configured', async () => {
    const res = await DELETE(req() as never, { params: { id: 'abc-123' } });
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.ok).toBe(false);
  });
});
