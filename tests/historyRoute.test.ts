import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase', () => ({
  getSearchHistory: vi.fn(),
  clearAllHistory: vi.fn(),
  getSupabaseAdmin: vi.fn(),
}));

import { GET, DELETE } from '@/app/api/history/route';
import { DELETE as DELETE_BY_ID } from '@/app/api/history/[id]/route';
import { getSearchHistory, clearAllHistory } from '@/lib/supabase';

const mockGetHistory = vi.mocked(getSearchHistory);
const mockClearAll = vi.mocked(clearAllHistory);

const ORIGINAL_ADMIN = process.env.ADMIN_TOKEN;

function getReq(url: string): any {
  return { url };
}
function delReq(headers: Record<string, string> = {}): any {
  return { headers: new Headers(headers) };
}

beforeEach(() => {
  delete process.env.ADMIN_TOKEN;
});
afterEach(() => {
  if (ORIGINAL_ADMIN === undefined) delete process.env.ADMIN_TOKEN;
  else process.env.ADMIN_TOKEN = ORIGINAL_ADMIN;
  vi.clearAllMocks();
});

describe('GET /api/history', () => {
  it('returns history with a count', async () => {
    mockGetHistory.mockResolvedValueOnce([
      { id: '1', keyword: 'a', results: [], result_count: 0, created_at: 'x' },
    ]);
    const res = await GET(getReq('http://localhost/api/history?limit=100'));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json).toMatchObject({ ok: true, count: 1 });
    expect(mockGetHistory).toHaveBeenCalledWith(100);
  });

  it('clamps an out-of-range limit', async () => {
    mockGetHistory.mockResolvedValueOnce([]);
    await GET(getReq('http://localhost/api/history?limit=99999'));
    expect(mockGetHistory).toHaveBeenCalledWith(200); // max clamp
  });

  it('returns 500 when the store throws', async () => {
    mockGetHistory.mockRejectedValueOnce(new Error('db down'));
    const res = await GET(getReq('http://localhost/api/history'));
    expect(res.status).toBe(500);
  });
});

describe('DELETE /api/history (admin-gated)', () => {
  it('fails closed with 503 when ADMIN_TOKEN is unset', async () => {
    const res = await DELETE(delReq());
    expect(res.status).toBe(503);
    expect(mockClearAll).not.toHaveBeenCalled();
  });

  it('returns 401 for a wrong token', async () => {
    process.env.ADMIN_TOKEN = 'real';
    const res = await DELETE(delReq({ 'x-admin-token': 'wrong' }));
    expect(res.status).toBe(401);
    expect(mockClearAll).not.toHaveBeenCalled();
  });

  it('clears history with the correct token', async () => {
    process.env.ADMIN_TOKEN = 'real';
    mockClearAll.mockResolvedValueOnce({ ok: true, deleted: 3 });
    const res = await DELETE(delReq({ 'x-admin-token': 'real' }));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json).toMatchObject({ ok: true, deleted: 3 });
    expect(mockClearAll).toHaveBeenCalledOnce();
  });
});

describe('DELETE /api/history/:id (admin-gated)', () => {
  it('fails closed with 503 before touching the database', async () => {
    const res = await DELETE_BY_ID(delReq(), { params: { id: 'abc' } });
    expect(res.status).toBe(503);
  });

  it('returns 401 for a wrong token', async () => {
    process.env.ADMIN_TOKEN = 'real';
    const res = await DELETE_BY_ID(delReq({ 'x-admin-token': 'nope' }), {
      params: { id: 'abc' },
    });
    expect(res.status).toBe(401);
  });
});
