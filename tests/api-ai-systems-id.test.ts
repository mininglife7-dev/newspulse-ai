import { describe, it, expect, vi, beforeEach } from 'vitest';

const state: {
  user: { id: string; email: string } | null;
  membership: { workspace_id: string } | null;
  deleteError: { message: string } | null;
  deletedRows: { id: string }[];
  deletedFilters: Record<string, string>[];
} = {
  user: null,
  membership: null,
  deleteError: null,
  deletedRows: [],
  deletedFilters: [],
};

function memberChain() {
  const c: any = {
    select: () => c,
    eq: () => c,
    limit: () => c,
    maybeSingle: async () => ({ data: state.membership, error: null }),
  };
  return c;
}

function aiSystemsTable() {
  return {
    delete() {
      const d: any = {
        _eqs: {} as Record<string, string>,
        eq(col: string, val: string) {
          d._eqs[col] = val;
          return d;
        },
        // Terminal `.select('id')` — resolves with the rows "deleted".
        select() {
          state.deletedFilters.push({ ...d._eqs });
          return {
            then(resolve: (v: { data: unknown; error: unknown }) => void) {
              resolve({ data: state.deletedRows, error: state.deleteError });
            },
          };
        },
      };
      return d;
    },
  };
}

function stubClient() {
  return {
    auth: { getUser: async () => ({ data: { user: state.user } }) },
    from(table: string) {
      if (table === 'workspace_members') return memberChain();
      if (table === 'ai_systems') return aiSystemsTable();
      throw new Error(`unexpected table ${table}`);
    },
  };
}

vi.mock('@/lib/supabase-server', () => ({
  createRouteClient: () => stubClient(),
}));

import { DELETE } from '@/app/api/ai-systems/[id]/route';

function call(id: string) {
  return DELETE(
    new Request(`http://localhost/api/ai-systems/${id}`, { method: 'DELETE' }),
    { params: Promise.resolve({ id }) }
  );
}

beforeEach(() => {
  state.user = { id: 'user-1', email: 'ceo@acme.example' };
  state.membership = { workspace_id: 'ws-1' };
  state.deleteError = null;
  state.deletedRows = [{ id: 'sys-1' }];
  state.deletedFilters = [];
});

describe('DELETE /api/ai-systems/[id]', () => {
  it('requires authentication', async () => {
    state.user = null;
    const res = await call('sys-1');
    expect(res.status).toBe(401);
  });

  it('returns 409 when the caller has no workspace', async () => {
    state.membership = null;
    const res = await call('sys-1');
    expect(res.status).toBe(409);
  });

  it('returns 400 when the id is empty', async () => {
    const res = await call('');
    expect(res.status).toBe(400);
  });

  it('deletes the system, scoped to the caller workspace', async () => {
    const res = await call('sys-1');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true, deleted: 'sys-1' });
    // Delete must be scoped to both the row id and the caller's workspace.
    expect(state.deletedFilters).toContainEqual({
      id: 'sys-1',
      workspace_id: 'ws-1',
    });
  });

  it('returns 404 when no row matched (missing or another workspace)', async () => {
    state.deletedRows = [];
    const res = await call('sys-1');
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.ok).toBe(false);
  });

  it('surfaces a delete failure as 500', async () => {
    state.deleteError = { message: 'boom' };
    const res = await call('sys-1');
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.ok).toBe(false);
  });
});
