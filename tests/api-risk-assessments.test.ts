import { describe, it, expect, vi, beforeEach } from 'vitest';

const state: {
  user: { id: string; email: string } | null;
  membership: { workspace_id: string } | null;
  company: { id: string } | null;
  systems: any[];
  assessments: any[];
  failInsert: boolean;
} = { user: null, membership: null, company: null, systems: [], assessments: [], failInsert: false };

function chain(result: any) {
  const c: any = {
    select: () => c,
    eq: () => c,
    order: async () => ({ data: state.assessments, error: null }),
    limit: () => c,
    maybeSingle: async () => ({ data: result, error: null }),
    single: async () =>
      state.failInsert
        ? { data: null, error: { message: 'boom' } }
        : {
            data: {
              id: 'assess-1',
              ai_system_id: c._inserted?.ai_system_id,
              risk_level: c._inserted?.risk_level,
              risk_score: c._inserted?.risk_score,
              status: c._inserted?.status,
              created_at: new Date().toISOString(),
            },
            error: null,
          },
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
        c.eq = (field: string, value: any) => {
          if (field === 'id') {
            const system = state.systems.find((s) => s.id === value);
            c.single = async () => ({ data: system || null, error: null });
          }
          return c;
        };
        return c;
      }
      if (table === 'risk_assessments') {
        const c: any = chain(null);
        c.insert = (row: any) => {
          state.assessments.push(row);
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

import { GET, POST } from '@/app/api/risk-assessments/route';

function post(body: unknown) {
  return POST(
    new Request('http://localhost/api/risk-assessments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  );
}

beforeEach(() => {
  state.user = { id: 'user-1', email: 'ceo@acme.example' };
  state.membership = { workspace_id: 'ws-1' };
  state.company = { id: 'co-1' };
  state.systems = [{ id: 'sys-1', workspace_id: 'ws-1' }];
  state.assessments = [];
  state.failInsert = false;
});

describe('GET /api/risk-assessments', () => {
  it('requires authentication', async () => {
    state.user = null;
    const res = await GET(new Request('http://localhost/api/risk-assessments'));
    expect(res.status).toBe(401);
  });

  it('returns 409 before company setup', async () => {
    state.membership = null;
    const res = await GET(new Request('http://localhost/api/risk-assessments'));
    expect(res.status).toBe(409);
  });

  it('lists workspace assessments', async () => {
    state.assessments = [{ id: 'a1', risk_level: 'high', risk_score: 75 }];
    const res = await GET(new Request('http://localhost/api/risk-assessments'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.assessments).toHaveLength(1);
  });
});

describe('POST /api/risk-assessments', () => {
  it('requires aiSystemId', async () => {
    const res = await post({ answers: {} });
    expect(res.status).toBe(400);
  });

  it('requires answers object', async () => {
    const res = await post({ aiSystemId: 'sys-1' });
    expect(res.status).toBe(400);
  });

  it('rejects unknown status', async () => {
    const res = await post({
      aiSystemId: 'sys-1',
      answers: { 'fr-1': true },
      status: 'abandoned',
    });
    expect(res.status).toBe(400);
  });

  it('returns 409 when no company profile exists', async () => {
    state.company = null;
    const res = await post({
      aiSystemId: 'sys-1',
      answers: { 'fr-1': true },
    });
    expect(res.status).toBe(409);
  });

  it('creates an assessment with calculated risk level', async () => {
    const res = await post({
      aiSystemId: 'sys-1',
      answers: {
        'fr-1': true,
        'fr-2': false,
        'safety-1': false,
        'bias-1': false,
      },
      status: 'draft',
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(state.assessments[0]).toMatchObject({
      workspace_id: 'ws-1',
      company_id: 'co-1',
      ai_system_id: 'sys-1',
      status: 'draft',
    });
    expect(state.assessments[0].risk_level).toBeDefined();
    expect(state.assessments[0].risk_score).toBeDefined();
  });

  it('calculates unacceptable risk when critical factor present', async () => {
    const res = await post({
      aiSystemId: 'sys-1',
      answers: {
        'safety-1': true, // critical
      },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(state.assessments[0].risk_level).toBe('unacceptable');
    expect(state.assessments[0].risk_score).toBe(100);
  });

  it('surfaces insert failure as 500', async () => {
    state.failInsert = true;
    const res = await post({
      aiSystemId: 'sys-1',
      answers: { 'fr-1': true },
    });
    expect(res.status).toBe(500);
  });

  it('stores assessment data with answers and reasoning', async () => {
    const res = await post({
      aiSystemId: 'sys-1',
      answers: {
        'fr-2': true,
        'bias-1': true,
      },
    });
    expect(res.status).toBe(200);
    const assessment = state.assessments[0];
    expect(assessment.assessment_data).toBeDefined();
    expect(assessment.assessment_data.answers).toBeDefined();
    expect(assessment.assessment_data.reasoning).toBeDefined();
    expect(assessment.assessment_data.reasoning).toBeInstanceOf(Array);
  });

  it('defaults status to draft', async () => {
    const res = await post({
      aiSystemId: 'sys-1',
      answers: { 'fr-1': true },
    });
    expect(res.status).toBe(200);
    expect(state.assessments[0].status).toBe('draft');
  });
});
