import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { getAssessmentQuestions } from '@/lib/risk-assessment';

// The library stopped exporting QUESTION_IDS; the ids live on the questions.
const QUESTION_IDS = getAssessmentQuestions().map((q) => q.id);

const state: {
  user: { id: string } | null;
  membership: { workspace_id: string } | null;
  system: { id: string; company_id: string; name: string } | null;
  inserted: any[];
  failInsert: boolean;
} = {
  user: null,
  membership: null,
  system: null,
  inserted: [],
  failInsert: false,
};

function chain(result: any) {
  const c: any = {
    select: () => c,
    eq: () => c,
    order: async () => ({ data: [], error: null }),
    limit: () => c,
    maybeSingle: async () => ({ data: result, error: null }),
    single: async () =>
      state.failInsert
        ? { data: null, error: { message: 'boom' } }
        : { data: { id: 'asm-1', ...c._row }, error: null },
  };
  return c;
}

vi.mock('@/lib/supabase-server', () => ({
  createRouteClient: async () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }) },
    from(table: string) {
      if (table === 'workspace_members') return chain(state.membership);
      if (table === 'ai_systems') return chain(state.system);
      if (table === 'risk_assessments') {
        const c: any = chain(null);
        c.insert = (row: any) => {
          state.inserted.push(row);
          c._row = row;
          return c;
        };
        return c;
      }
      throw new Error(`unexpected table ${table}`);
    },
  }),
}));

// The handler lives at app/api/assessments (the old app/api/risk-assessments
// path no longer exists); this suite covers the same POST handler.
import { POST } from '@/app/api/assessments/route';

const allNo = Object.fromEntries(QUESTION_IDS.map((id) => [id, false]));

function post(body: unknown) {
  return POST(
    new NextRequest('http://localhost/api/assessments', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  );
}

beforeEach(() => {
  state.user = { id: 'user-1' };
  state.membership = { workspace_id: 'ws-1' };
  state.system = { id: 'sys-1', company_id: 'co-1', name: 'Chatbot' };
  state.inserted = [];
  state.failInsert = false;
});

describe('POST /api/risk-assessments', () => {
  it('requires authentication', async () => {
    state.user = null;
    const res = await post({ aiSystemId: 'sys-1', answers: allNo });
    expect(res.status).toBe(401);
  });

  it('requires aiSystemId and answers', async () => {
    expect((await post({ answers: allNo })).status).toBe(400);
    expect((await post({ aiSystemId: 'sys-1' })).status).toBe(400);
  });

  it('404s for a system outside the workspace', async () => {
    state.system = null;
    const res = await post({ aiSystemId: 'other', answers: allNo });
    expect(res.status).toBe(404);
  });

  it('classifies server-side and persists answers with the result', async () => {
    // q5-recruitment (employment screening) is a high-risk trigger in the
    // current eu-ai-act question set (lib/risk-assessment.ts).
    const res = await post({
      aiSystemId: 'sys-1',
      answers: { ...allNo, 'q5-recruitment': true },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.classification.riskLevel).toBe('high');

    const row = state.inserted[0];
    expect(row).toMatchObject({
      ai_system_id: 'sys-1',
      company_id: 'co-1',
      workspace_id: 'ws-1',
      risk_level: 'high',
      status: 'draft',
    });
    expect(row.risk_score).toBe(body.classification.riskScore);
    expect(row.assessment_data.answers['q5-recruitment']).toBe(true);
    expect(row.assessment_data.classification.riskLevel).toBe('high');
    expect(row.assessment_data.completedAt).toBeTruthy();
  });

  it('surfaces insert failure as 500', async () => {
    state.failInsert = true;
    const res = await post({ aiSystemId: 'sys-1', answers: allNo });
    expect(res.status).toBe(500);
  });
});
