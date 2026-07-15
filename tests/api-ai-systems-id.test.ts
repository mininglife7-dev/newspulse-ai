import { describe, it, expect, vi, beforeEach } from 'vitest';

const state: {
  user: { id: string; email: string } | null;
  membership: { workspace_id: string } | null;
  deleteError: { message: string } | null;
  deletedRows: { id: string }[];
  deletedFilters: Record<string, string>[];
  updateError: { message: string } | null;
  updatedRows: Record<string, unknown>[];
  updatedWith: {
    filters: Record<string, string>;
    row: Record<string, unknown>;
  } | null;
} = {
  user: null,
  membership: null,
  deleteError: null,
  deletedRows: [],
  deletedFilters: [],
  updateError: null,
  updatedRows: [],
  updatedWith: null,
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

function companyChain() {
  const c: any = {
    select: () => c,
    eq: () => c,
    limit: () => c,
    maybeSingle: async () => ({ data: { id: 'co-1' }, error: null }),
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
    update(row: Record<string, unknown>) {
      const u: any = {
        _eqs: {} as Record<string, string>,
        eq(col: string, val: string) {
          u._eqs[col] = val;
          return u;
        },
        // Terminal `.select(...)` — resolves with the updated rows.
        select() {
          state.updatedWith = { filters: { ...u._eqs }, row };
          return {
            then(resolve: (v: { data: unknown; error: unknown }) => void) {
              resolve({ data: state.updatedRows, error: state.updateError });
            },
          };
        },
      };
      return u;
    },
  };
}

function stubClient() {
  return {
    auth: { getUser: async () => ({ data: { user: state.user } }) },
    from(table: string) {
      if (table === 'workspace_members') return memberChain();
      if (table === 'companies') return companyChain();
      if (table === 'ai_systems') return aiSystemsTable();
      throw new Error(`unexpected table ${table}`);
    },
  };
}

vi.mock('@/lib/supabase-server', () => ({
  createRouteClient: () => stubClient(),
}));

import { DELETE, PATCH } from '@/app/api/ai-systems/[id]/route';

function call(id: string) {
  return DELETE(
    new Request(`http://localhost/api/ai-systems/${id}`, { method: 'DELETE' }),
    { params: Promise.resolve({ id }) }
  );
}

function patch(id: string, body: unknown) {
  return PATCH(
    new Request(`http://localhost/api/ai-systems/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    }),
    { params: Promise.resolve({ id }) }
  );
}

beforeEach(() => {
  state.user = { id: 'user-1', email: 'ceo@acme.example' };
  state.membership = { workspace_id: 'ws-1' };
  state.deleteError = null;
  state.deletedRows = [{ id: 'sys-1' }];
  state.deletedFilters = [];
  state.updateError = null;
  state.updatedRows = [{ id: 'sys-1', name: 'Renamed', status: 'pilot' }];
  state.updatedWith = null;
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

describe('PATCH /api/ai-systems/[id]', () => {
  it('requires authentication', async () => {
    state.user = null;
    const res = await patch('sys-1', { name: 'New name' });
    expect(res.status).toBe(401);
  });

  it('returns 409 when the caller has no workspace', async () => {
    state.membership = null;
    const res = await patch('sys-1', { name: 'New name' });
    expect(res.status).toBe(409);
  });

  it('returns 400 for an empty id, invalid JSON, or no fields', async () => {
    expect((await patch('', { name: 'x' })).status).toBe(400);
    expect((await patch('sys-1', 'not-json')).status).toBe(400);
    expect((await patch('sys-1', {})).status).toBe(400);
  });

  it('rejects an empty name and invalid enums', async () => {
    expect((await patch('sys-1', { name: '   ' })).status).toBe(400);
    expect((await patch('sys-1', { systemType: 'nope' })).status).toBe(400);
    expect((await patch('sys-1', { status: 'nope' })).status).toBe(400);
  });

  it('updates only provided fields, scoped to the caller workspace', async () => {
    const res = await patch('sys-1', { name: 'Renamed', status: 'pilot' });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.system).toMatchObject({ id: 'sys-1', name: 'Renamed' });

    // Only the provided fields (plus updated_at) are written, scoped to id + ws.
    expect(state.updatedWith?.filters).toEqual({
      id: 'sys-1',
      workspace_id: 'ws-1',
    });
    expect(Object.keys(state.updatedWith?.row ?? {}).sort()).toEqual([
      'name',
      'status',
      'updated_at',
    ]);
    expect(state.updatedWith?.row.vendor).toBeUndefined();
  });

  it('returns 404 when no row matched', async () => {
    state.updatedRows = [];
    const res = await patch('sys-1', { name: 'X' });
    expect(res.status).toBe(404);
  });

  it('surfaces an update failure as 500', async () => {
    state.updateError = { message: 'boom' };
    const res = await patch('sys-1', { name: 'X' });
    expect(res.status).toBe(500);
  });
});
