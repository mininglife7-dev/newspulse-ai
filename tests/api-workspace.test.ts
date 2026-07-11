import { describe, it, expect, vi, beforeEach } from 'vitest';

// In-memory stub of the user-scoped Supabase client. Each from() call
// returns a chainable insert/select/single recorder.
const state: {
  user: { id: string; email: string } | null;
  inserts: Record<string, any[]>;
  failTable: string | null;
} = { user: null, inserts: {}, failTable: null };

function stubClient() {
  return {
    auth: {
      getUser: async () => ({ data: { user: state.user } }),
    },
    from(table: string) {
      return {
        insert(row: any) {
          (state.inserts[table] ??= []).push(row);
          const failed = state.failTable === table;
          const result = failed
            ? { data: null, error: { message: `boom:${table}` } }
            : { data: { id: `${table}-id`, slug: 'acme-1234', name: row.name }, error: null };
          return {
            select: () => ({ single: async () => result }),
            // insert without .select() resolves directly (workspace_members)
            then: (resolve: any) =>
              resolve(failed ? { error: { message: `boom:${table}` } } : { error: null }),
          };
        },
        upsert: async (row: any) => {
          (state.inserts[table] ??= []).push(row);
          return { error: null };
        },
      };
    },
  };
}

vi.mock('@/lib/supabase-server', () => ({
  createRouteClient: () => stubClient(),
}));
// The route imports 'server-only' transitively via lib/supabase-server —
// mocking createRouteClient avoids that, but the route file itself is safe.

import { POST } from '@/app/api/workspace/route';

function request(body: unknown) {
  const url = new URL('http://localhost/api/workspace');
  const req = new Request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  // Mock NextRequest properties
  (req as any).nextUrl = url;
  return req as any;
}

const validBody = {
  companyName: 'Acme GmbH',
  country: 'Germany',
  industry: 'Manufacturing',
  employees: '51-200',
  website: 'https://acme.example',
  description: 'EU AI Act readiness',
};

beforeEach(() => {
  state.user = { id: 'user-1', email: 'ceo@acme.example' };
  state.inserts = {};
  state.failTable = null;
});

describe('POST /api/workspace', () => {
  it('rejects invalid JSON', async () => {
    const url = new URL('http://localhost/api/workspace');
    const req = new Request(url, {
      method: 'POST',
      body: 'not-json',
    });
    (req as any).nextUrl = url;
    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });

  it('rejects missing required fields', async () => {
    const res = await POST(request({ companyName: 'Acme GmbH' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.ok).toBe(false);
  });

  it('requires authentication', async () => {
    state.user = null;
    const res = await POST(request(validBody));
    expect(res.status).toBe(401);
  });

  it('creates workspace, owner membership, company and profile', async () => {
    const res = await POST(request(validBody));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.workspace.id).toBe('workspaces-id');

    expect(state.inserts.workspaces?.[0]).toMatchObject({
      name: 'Acme GmbH',
      owner_id: 'user-1',
    });
    expect(state.inserts.workspaces[0].slug).toMatch(/^acme-gmbh-/);
    expect(state.inserts.workspace_members?.[0]).toMatchObject({
      user_id: 'user-1',
      role: 'owner',
      status: 'active',
    });
    expect(state.inserts.companies?.[0]).toMatchObject({
      name: 'Acme GmbH',
      country: 'Germany',
      employees_range: '51-200',
    });
    expect(state.inserts.profiles?.[0]).toMatchObject({
      id: 'user-1',
      current_workspace_id: 'workspaces-id',
    });
  });

  it('slugifies German umlauts safely', async () => {
    await POST(request({ ...validBody, companyName: 'Müller & Söhne AG' }));
    expect(state.inserts.workspaces[0].slug).toMatch(/^muller-sohne-ag-/);
  });

  it('surfaces workspace insert failure as 500', async () => {
    state.failTable = 'workspaces';
    const res = await POST(request(validBody));
    expect(res.status).toBe(500);
  });
});
