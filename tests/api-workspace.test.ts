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
        select(columns?: string) {
          return {
            eq: (col: string, val: any) => ({
              eq: (col2: string, val2: any) => ({
                single: async () => ({ data: null, error: null }),
              }),
            }),
          };
        },
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
    rpc(name: string, params: any) {
      if (state.failTable === 'rpc') {
        return Promise.resolve({ data: null, error: { message: 'boom:rpc' } });
      }
      // Simulate create_workspace_atomic
      return Promise.resolve({
        data: {
          success: true,
          workspace_id: 'workspaces-id',
          company_id: 'companies-id',
        },
        error: null,
      });
    },
  };
}

vi.mock('@/lib/supabase-server', () => ({
  createRouteClient: () => stubClient(),
}));
// The route imports 'server-only' transitively via lib/supabase-server —
// mocking createRouteClient avoids that, but the route file itself is safe.

import { POST } from '@/app/api/workspace/route';

function request(body: unknown): Request {
  return new Request('http://localhost/api/workspace', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
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
    const res = await POST(
      new Request('http://localhost/api/workspace', {
        method: 'POST',
        body: 'not-json',
      })
    );
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

  it('creates workspace via atomic RPC transaction', async () => {
    const res = await POST(request(validBody));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.workspace).toMatchObject({
      id: 'workspaces-id',
      name: 'Acme GmbH',
    });
    expect(body.workspace.slug).toMatch(/^acme-gmbh-/);
    expect(body.companyId).toBe('companies-id');
  });

  it('slugifies German umlauts safely', async () => {
    const res = await POST(request({ ...validBody, companyName: 'Müller & Söhne AG' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.workspace.slug).toMatch(/^muller-sohne-ag-/);
  });

  it('returns 500 on RPC failure', async () => {
    state.failTable = 'rpc';
    const res = await POST(request(validBody));
    expect(res.status).toBe(500);
  });
});
