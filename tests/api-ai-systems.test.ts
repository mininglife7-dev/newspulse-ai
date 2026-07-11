import { describe, it, expect, vi, beforeEach } from 'vitest';

// Stub of the user-scoped client with a tiny chainable query recorder.
const state: {
  user: { id: string; email: string } | null;
  membership: { workspace_id: string } | null;
  company: { id: string } | null;
  systems: any[];
  failInsert: boolean;
} = { user: null, membership: null, company: null, systems: [], failInsert: false };

function chain(result: any) {
  const c: any = {
    select: () => c,
    eq: () => c,
    order: async () => ({ data: state.systems, error: null }),
    limit: () => c,
    maybeSingle: async () => ({ data: result, error: null }),
    single: async () =>
      state.failInsert
        ? { data: null, error: { message: 'boom' } }
        : { data: { id: 'sys-1', ...c._inserted }, error: null },
  };
  return c;
}

function stubClient() {
  return {
    auth: { getUser: async () => ({ data: { user: state.user } }) },
    from(table: string) {
      if (table === 'workspace_members') return chain(state.membership);
      if (table === 'companies') return chain(state.company);
      if (table === 'ai_systems') {
        const c: any = chain(null);
        c.insert = (row: any) => {
          state.systems.push(row);
          c._inserted = row;
          return c;
        };
        return c;
      }
      throw new Error(`unexpected table ${table}`);
    },
  };
}

vi.mock('@/lib/supabase-server', () => ({
  createRouteClient: () => stubClient(),
}));

import { GET, POST } from '@/app/api/ai-systems/route';

function get(params?: Record<string, string>) {
  const url = new URL('http://localhost/api/ai-systems');
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }
  const req = new Request(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  // Mock NextRequest properties
  (req as any).nextUrl = url;
  return GET(req as any);
}

function post(body: unknown) {
  const url = new URL('http://localhost/api/ai-systems');
  const req = new Request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  // Mock NextRequest properties
  (req as any).nextUrl = url;
  return POST(req as any);
}

beforeEach(() => {
  state.user = { id: 'user-1', email: 'ceo@acme.example' };
  state.membership = { workspace_id: 'ws-1' };
  state.company = { id: 'co-1' };
  state.systems = [];
  state.failInsert = false;
});

describe('GET /api/ai-systems', () => {
  it('requires authentication', async () => {
    state.user = null;
    const res = await get();
    expect(res.status).toBe(401);
  });

  it('returns 409 before company setup', async () => {
    state.membership = null;
    const res = await get();
    expect(res.status).toBe(409);
  });

  it('lists workspace systems', async () => {
    state.systems = [{ id: 's1', name: 'Chatbot' }];
    const res = await get();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.systems).toHaveLength(1);
  });
});

describe('POST /api/ai-systems', () => {
  it('requires a name', async () => {
    const res = await post({ vendor: 'OpenAI' });
    expect(res.status).toBe(400);
  });

  it('rejects unknown systemType', async () => {
    const res = await post({ name: 'X', systemType: 'quantum_oracle' });
    expect(res.status).toBe(400);
  });

  it('rejects unknown status', async () => {
    const res = await post({ name: 'X', status: 'retired' });
    expect(res.status).toBe(400);
  });

  it('creates a system scoped to the workspace and company', async () => {
    const res = await post({
      name: 'Support chatbot',
      systemType: 'large_language_model',
      vendor: 'OpenAI',
      purpose: 'Customer support',
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(state.systems[0]).toMatchObject({
      workspace_id: 'ws-1',
      company_id: 'co-1',
      name: 'Support chatbot',
      system_type: 'large_language_model',
      status: 'active',
    });
  });

  it('returns 409 when no company profile exists', async () => {
    state.company = null;
    const res = await post({ name: 'X' });
    expect(res.status).toBe(409);
  });

  it('surfaces insert failure as 500', async () => {
    state.failInsert = true;
    const res = await post({ name: 'X' });
    expect(res.status).toBe(500);
  });
});
