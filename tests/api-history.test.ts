import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/supabase', () => ({
  getSearchHistory: vi.fn(async () => []),
  clearAllHistory: vi.fn(async () => ({ ok: true, deleted: 3 })),
  getSupabaseAdmin: vi.fn(() => ({
    from: () => ({
      delete: () => ({ eq: async () => ({ error: null }) }),
    }),
  })),
}));

function del(url: string, token?: string): NextRequest {
  return new NextRequest(url, {
    method: 'DELETE',
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
}

describe('DELETE /api/history without ADMIN_TOKEN configured', () => {
  beforeEach(() => {
    vi.stubEnv('ADMIN_TOKEN', '');
    vi.resetModules();
  });

  it('behaves as before — deletion is allowed', async () => {
    const { DELETE } = await import('@/app/api/history/route');
    const res = await DELETE(del('http://localhost:3000/api/history'));
    expect(res.status).toBe(200);
    expect((await res.json()).deleted).toBe(3);
  });
});

describe('DELETE endpoints with ADMIN_TOKEN configured', () => {
  beforeEach(() => {
    vi.stubEnv('ADMIN_TOKEN', 'secret-token');
    vi.resetModules();
  });

  it('rejects clear-all without a token', async () => {
    const { DELETE } = await import('@/app/api/history/route');
    const res = await DELETE(del('http://localhost:3000/api/history'));
    expect(res.status).toBe(401);
    expect((await res.json()).ok).toBe(false);
  });

  it('rejects clear-all with a wrong token', async () => {
    const { DELETE } = await import('@/app/api/history/route');
    const res = await DELETE(del('http://localhost:3000/api/history', 'nope'));
    expect(res.status).toBe(401);
  });

  it('allows clear-all with the correct token', async () => {
    const { DELETE } = await import('@/app/api/history/route');
    const res = await DELETE(
      del('http://localhost:3000/api/history', 'secret-token')
    );
    expect(res.status).toBe(200);
  });

  it('rejects single-row delete without a token', async () => {
    const { DELETE } = await import('@/app/api/history/[id]/route');
    const res = await DELETE(del('http://localhost:3000/api/history/abc'), {
      params: { id: 'abc' },
    });
    expect(res.status).toBe(401);
  });

  it('allows single-row delete with the correct token', async () => {
    const { DELETE } = await import('@/app/api/history/[id]/route');
    const res = await DELETE(
      del('http://localhost:3000/api/history/abc', 'secret-token'),
      { params: { id: 'abc' } }
    );
    expect(res.status).toBe(200);
  });

  it('GET stays public — reading history needs no token', async () => {
    const { GET } = await import('@/app/api/history/route');
    const res = await GET(
      new NextRequest('http://localhost:3000/api/history')
    );
    expect(res.status).toBe(200);
  });
});
