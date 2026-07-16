import { describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { makeProposal } from './helpers';

/**
 * Auth gates on the CEIS mutating endpoints:
 *
 *  - PATCH /api/ceis/proposals/:id — founder review actions require the
 *    fail-closed ADMIN_TOKEN bearer (lib/api-auth.ts convention).
 *  - /api/ceis/run — accepts CEIS_CRON_SECRET / CRON_SECRET / ADMIN_TOKEN
 *    bearers; with no secret configured it stays open in dev but refuses
 *    to run in production (503) instead of silently being world-triggerable.
 *
 * Env stubs are reset between tests by vitest.config.ts (unstubEnvs: true).
 */

vi.mock('@/lib/ceis/store', () => ({
  getProposal: vi.fn(),
  updateProposal: vi.fn(),
}));
vi.mock('@/lib/ceis/genome', () => ({
  rememberGenomeEntry: vi.fn(async () => true),
}));
vi.mock('@/lib/ceis/pipeline', () => ({
  runEvolutionCycle: vi.fn(async () => ({
    id: 'cycle-1',
    stats: {
      observations: 0,
      principles: 0,
      dna_generated: 0,
      rejected: 0,
    },
    overall_evolution_score: 0,
    proposals: [],
    rejected: [],
  })),
}));

import { PATCH } from '@/app/api/ceis/proposals/[id]/route';
import { GET as runGet, POST as runPost } from '@/app/api/ceis/run/route';
import { getProposal, updateProposal } from '@/lib/ceis/store';

function patchRequest(headers: Record<string, string> = {}) {
  return new NextRequest('http://localhost/api/ceis/proposals/p1', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify({ action: 'start-review' }),
  });
}

function runRequest(headers: Record<string, string> = {}) {
  return new NextRequest('http://localhost/api/ceis/run?dry=1', {
    method: 'POST',
    headers,
  });
}

const params = { params: Promise.resolve({ id: 'p1' }) };

describe('PATCH /api/ceis/proposals/:id auth gate', () => {
  it('rejects requests without a bearer token', async () => {
    vi.stubEnv('ADMIN_TOKEN', 'correct-token');
    const res = await PATCH(patchRequest(), params);
    expect(res.status).toBe(401);
    expect(getProposal).not.toHaveBeenCalled();
  });

  it('rejects requests with a wrong bearer token', async () => {
    vi.stubEnv('ADMIN_TOKEN', 'correct-token');
    const res = await PATCH(
      patchRequest({ authorization: 'Bearer wrong-token' }),
      params
    );
    expect(res.status).toBe(401);
    expect(getProposal).not.toHaveBeenCalled();
  });

  it('fails closed when ADMIN_TOKEN is not configured at all', async () => {
    // requireAdminToken() denies everything when no token is set — a
    // misconfigured deployment must not expose founder review actions.
    const res = await PATCH(
      patchRequest({ authorization: 'Bearer anything' }),
      params
    );
    expect(res.status).toBe(401);
  });

  it('allows review actions with the correct bearer token', async () => {
    vi.stubEnv('ADMIN_TOKEN', 'correct-token');
    const proposal = makeProposal();
    vi.mocked(getProposal).mockResolvedValueOnce(proposal);
    vi.mocked(updateProposal).mockResolvedValueOnce({
      ...proposal,
      status: 'under-review',
    });

    const res = await PATCH(
      patchRequest({ authorization: 'Bearer correct-token' }),
      params
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(updateProposal).toHaveBeenCalledWith('p1', {
      status: 'under-review',
    });
  });
});

describe('/api/ceis/run auth gate', () => {
  it('accepts the CEIS_CRON_SECRET bearer', async () => {
    vi.stubEnv('CEIS_CRON_SECRET', 'cron-secret');
    const res = await runPost(
      runRequest({ authorization: 'Bearer cron-secret' })
    );
    expect(res.status).toBe(200);
  });

  it('accepts ADMIN_TOKEN as an alternative bearer', async () => {
    vi.stubEnv('ADMIN_TOKEN', 'admin-token');
    const res = await runGet(
      runRequest({ authorization: 'Bearer admin-token' })
    );
    expect(res.status).toBe(200);
  });

  it('rejects a wrong bearer when a secret is configured', async () => {
    vi.stubEnv('CEIS_CRON_SECRET', 'cron-secret');
    const res = await runPost(runRequest({ authorization: 'Bearer nope' }));
    expect(res.status).toBe(401);
  });

  it('rejects missing credentials when a secret is configured', async () => {
    vi.stubEnv('CEIS_CRON_SECRET', 'cron-secret');
    const res = await runPost(runRequest());
    expect(res.status).toBe(401);
  });

  it('refuses to run in production when no secret is configured', async () => {
    vi.stubEnv('VERCEL_ENV', 'production');
    const res = await runPost(runRequest());
    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.error).toMatch(/CEIS_CRON_SECRET/);
  });

  it('stays open outside production when no secret is configured', async () => {
    const res = await runPost(runRequest());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.dry_run).toBe(true);
  });
});
