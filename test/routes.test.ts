import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the auth layer so we can drive "signed in" vs "anonymous" deterministically
// without a live Supabase. Everything downstream is the real route code.
vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(),
}));

import { getCurrentUser } from '@/lib/auth';
import { POST as searchPOST, GET as searchGET } from '@/app/api/search/route';
import {
  GET as historyGET,
  DELETE as historyDELETE,
} from '@/app/api/history/route';
import {
  GET as historyItemGET,
  DELETE as historyItemDELETE,
} from '@/app/api/history/[id]/route';

const mockedGetUser = vi.mocked(getCurrentUser);

function req(body?: unknown): any {
  return {
    json: async () => {
      if (body === undefined) throw new Error('no body');
      return body;
    },
    url: 'http://localhost/api/history',
  };
}

beforeEach(() => {
  mockedGetUser.mockReset();
});

describe('POST /api/search — validation', () => {
  it('rejects invalid JSON with 400', async () => {
    mockedGetUser.mockResolvedValue(null);
    const res = await searchPOST(req(undefined));
    expect(res.status).toBe(400);
  });

  it('rejects a missing keyword with 400', async () => {
    mockedGetUser.mockResolvedValue(null);
    const res = await searchPOST(req({}));
    expect(res.status).toBe(400);
  });

  it('rejects a whitespace-only keyword with 400', async () => {
    mockedGetUser.mockResolvedValue(null);
    const res = await searchPOST(req({ keyword: '   ' }));
    expect(res.status).toBe(400);
  });

  it('returns 500 when the Firecrawl key is missing (server misconfig)', async () => {
    mockedGetUser.mockResolvedValue(null);
    const prev = process.env.FIRECRAWL_API_KEY;
    delete process.env.FIRECRAWL_API_KEY;
    const res = await searchPOST(req({ keyword: 'ai' }));
    expect(res.status).toBe(500);
    if (prev) process.env.FIRECRAWL_API_KEY = prev;
  });

  it('GET is 405 (method not allowed)', async () => {
    const res = await searchGET();
    expect(res.status).toBe(405);
  });
});

describe('/api/history — requires authentication', () => {
  it('GET returns 401 when anonymous', async () => {
    mockedGetUser.mockResolvedValue(null);
    const res = await historyGET(req());
    expect(res.status).toBe(401);
  });

  it('DELETE returns 401 when anonymous', async () => {
    mockedGetUser.mockResolvedValue(null);
    const res = await historyDELETE();
    expect(res.status).toBe(401);
  });
});

describe('/api/history/:id — requires authentication + validates', () => {
  it('GET returns 401 when anonymous', async () => {
    mockedGetUser.mockResolvedValue(null);
    const res = await historyItemGET(req(), { params: { id: 'abc' } });
    expect(res.status).toBe(401);
  });

  it('DELETE returns 401 when anonymous', async () => {
    mockedGetUser.mockResolvedValue(null);
    const res = await historyItemDELETE(req(), { params: { id: 'abc' } });
    expect(res.status).toBe(401);
  });

  it('GET returns 400 for a missing id even when signed in', async () => {
    mockedGetUser.mockResolvedValue({ id: 'user-a', email: 'a@x.com' });
    const res = await historyItemGET(req(), { params: { id: '' } });
    expect(res.status).toBe(400);
  });
});
