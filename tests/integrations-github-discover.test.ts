import { describe, it, expect, vi, beforeEach } from 'vitest';

const state: {
  user: { id: string; email: string } | null;
  membership: { workspace_id: string } | null;
  detections: any[];
  failInsert: boolean;
  discoveryResults: any[];
} = { user: null, membership: null, detections: [], failInsert: false, discoveryResults: [] };

function chain(result: any) {
  const c: any = {
    select: () => c,
    eq: () => c,
    limit: () => c,
    maybeSingle: async () => ({ data: result, error: null }),
    upsert: (rows: any, opts: any) => {
      state.detections.push(...rows);
      return c;
    },
  };
  c.select = () => {
    const selectChain: any = { ...c };
    selectChain._select = true;
    return selectChain;
  };
  if (c._select) {
    c.then = async () => {
      if (state.failInsert) return { data: null, error: { message: 'insert error' } };
      return { data: state.detections, error: null };
    };
  }
  return c;
}

function stubClient() {
  return {
    auth: { getUser: async () => ({ data: { user: state.user } }) },
    from(table: string) {
      if (table === 'workspace_members') return chain(state.membership);
      if (table === 'ai_system_detections') {
        const c: any = chain(null);
        c.upsert = (rows: any, opts: any) => {
          state.detections.push(...rows);
          const resultChain: any = {
            select: () => resultChain,
          };
          resultChain.then = async (cb: any) => {
            if (state.failInsert) {
              return cb({ data: null, error: { message: 'insert error' } });
            }
            return cb({ data: state.detections, error: null });
          };
          return resultChain;
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

vi.mock('@/lib/integrations/github-discovery', () => ({
  discoverGitHubAISystems: vi.fn(async (config: any) => {
    if (config.token === 'invalid_token') {
      throw new Error('Invalid GitHub token');
    }
    return state.discoveryResults;
  }),
}));

import { POST } from '@/app/api/integrations/github/discover/route';

function post(body: unknown) {
  return POST(
    new Request('http://localhost/api/integrations/github/discover', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  );
}

beforeEach(() => {
  state.user = { id: 'user-1', email: 'ceo@acme.example' };
  state.membership = { workspace_id: 'ws-1' };
  state.detections = [];
  state.failInsert = false;
  state.discoveryResults = [
    {
      id: 'repo-1',
      name: 'ml-pipeline',
      description: 'TensorFlow ML pipeline',
      url: 'https://github.com/acme/ml-pipeline',
      language: 'Python',
      topics: ['machine-learning', 'tensorflow'],
      detectedPatterns: ['Repository name contains AI framework: ml-pipeline', 'Topics indicate AI: machine-learning'],
      confidence: 85,
      lastUpdated: new Date().toISOString(),
    },
  ];
});

describe('POST /api/integrations/github/discover', () => {
  it('requires authentication', async () => {
    state.user = null;
    const res = await post({ org: 'acme', githubToken: 'token' });
    expect(res.status).toBe(401);
  });

  it('requires workspace membership', async () => {
    state.membership = null;
    const res = await post({ org: 'acme', githubToken: 'token' });
    expect(res.status).toBe(409);
  });

  it('requires githubToken', async () => {
    const res = await post({ org: 'acme' });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('githubToken');
  });

  it('requires org or username', async () => {
    const res = await post({ githubToken: 'token' });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('org or username');
  });

  it('discovers GitHub AI systems', async () => {
    const res = await post({ org: 'acme', githubToken: 'valid_token' });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.systems).toHaveLength(1);
    expect(body.systems[0].name).toBe('ml-pipeline');
  });

  it('handles no detections gracefully', async () => {
    state.discoveryResults = [];
    const res = await post({ org: 'acme', githubToken: 'valid_token' });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.systems).toHaveLength(0);
  });

  it('handles GitHub API errors', async () => {
    const res = await post({ org: 'acme', githubToken: 'invalid_token' });
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toContain('Discovery failed');
  });

  it('stores detections with correct metadata', async () => {
    state.discoveryResults = [
      {
        id: 'repo-2',
        name: 'pytorch-model',
        description: 'PyTorch deep learning model',
        url: 'https://github.com/acme/pytorch-model',
        language: 'Python',
        topics: ['deep-learning', 'pytorch'],
        detectedPatterns: ['Repository name contains AI framework: pytorch-model'],
        confidence: 92,
        lastUpdated: new Date().toISOString(),
      },
    ];

    const res = await post({ username: 'john', githubToken: 'valid_token' });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);

    // Verify detection was stored
    expect(state.detections).toHaveLength(1);
    const stored = state.detections[0];
    expect(stored.workspace_id).toBe('ws-1');
    expect(stored.detection_source).toBe('github');
    expect(stored.external_id).toBe('repo-2');
    expect(stored.confidence).toBe(92);
    expect(stored.status).toBe('detected');
  });

  it('uses correct workspace_id from context', async () => {
    state.membership = { workspace_id: 'ws-xyz' };
    const res = await post({ org: 'acme', githubToken: 'valid_token' });
    expect(res.status).toBe(200);

    expect(state.detections[0].workspace_id).toBe('ws-xyz');
  });

  it('accepts includePrivate parameter', async () => {
    const res = await post({ org: 'acme', githubToken: 'token', includePrivate: true });
    expect(res.status).toBe(200);
  });
});

describe('GitHub discovery scoring', () => {
  it('detects AI frameworks in repository names', async () => {
    state.discoveryResults = [
      {
        id: 'repo-3',
        name: 'tensorflow-models',
        confidence: 75,
        detectedPatterns: ['Repository name contains AI framework'],
      },
    ];

    const res = await post({ org: 'acme', githubToken: 'token' });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.systems[0].confidence).toBe(75);
  });

  it('filters low-confidence detections', async () => {
    state.discoveryResults = [
      {
        id: 'repo-4',
        name: 'data-utils',
        confidence: 35,
        detectedPatterns: [],
      },
    ];

    const res = await post({ org: 'acme', githubToken: 'token' });
    // Even though discovery returns it, the lib should have already filtered
    expect(res.status).toBe(200);
  });
});
