import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GET } from '@/app/api/blocking-conditions/route';

describe('GET /api/blocking-conditions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Setup environment
    process.env.GITHUB_TOKEN = 'test-token';
    process.env.GITHUB_OWNER = 'test-owner';
    process.env.GITHUB_REPO = 'test-repo';
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('succeeds when GITHUB_TOKEN is configured (health check)', async () => {
    // When configured with a token and Actions is healthy
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        workflow_runs: [
          {
            created_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
            conclusion: 'success',
          },
        ],
      }),
    });

    const req = new Request('http://localhost:3000/api/blocking-conditions');
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean };
    expect(body.ok).toBe(true);
  });

  it('returns 200 with empty blockers when all healthy', async () => {
    const mockRuns = {
      workflow_runs: [
        {
          created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          conclusion: 'success',
        },
      ],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockRuns,
    });

    const req = new Request('http://localhost:3000/api/blocking-conditions');
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; blockers: unknown[] };
    expect(body.ok).toBe(true);
    expect(body.blockers).toHaveLength(0);
  });

  it('returns 200 with blockers when Actions is down', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ workflow_runs: [] }),
    });

    const req = new Request('http://localhost:3000/api/blocking-conditions');
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; blockers: unknown[] };
    expect(body.ok).toBe(true);
    expect(body.blockers.length).toBeGreaterThan(0);
  });

  it('includes alert messages when blockers found', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ workflow_runs: [] }),
    });

    const req = new Request('http://localhost:3000/api/blocking-conditions');
    const res = await GET(req);

    const body = (await res.json()) as { alerts?: unknown[] };
    expect(body.alerts).toBeDefined();
    expect(Array.isArray(body.alerts)).toBe(true);
  });

  it('handles fetch errors gracefully', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    const req = new Request('http://localhost:3000/api/blocking-conditions');
    const res = await GET(req);

    // Either 200 with error info or 503
    const body = (await res.json()) as { ok?: boolean; error?: string };
    expect(body).toBeDefined();
  });

  it('stays public when CRON_SECRET is unset (opt-in guard)', async () => {
    delete process.env.CRON_SECRET;
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ workflow_runs: [] }),
    });
    const req = new Request('http://localhost:3000/api/blocking-conditions');
    const res = await GET(req);
    expect(res.status).toBe(200);
  });

  it('rejects callers without the secret once CRON_SECRET is set', async () => {
    process.env.CRON_SECRET = 'super-secret';
    global.fetch = vi.fn();
    const req = new Request('http://localhost:3000/api/blocking-conditions');
    const res = await GET(req);
    expect(res.status).toBe(401);
    // Guard runs before any GitHub call.
    expect(global.fetch).not.toHaveBeenCalled();
    delete process.env.CRON_SECRET;
  });

  it('allows the Vercel cron caller carrying the correct Bearer secret', async () => {
    process.env.CRON_SECRET = 'super-secret';
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ workflow_runs: [] }),
    });
    const req = new Request('http://localhost:3000/api/blocking-conditions', {
      headers: { authorization: 'Bearer super-secret' },
    });
    const res = await GET(req);
    expect(res.status).toBe(200);
    delete process.env.CRON_SECRET;
  });

  it('includes severity headers in response when blockers found', async () => {
    // No recent runs → critical blocker
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ workflow_runs: [] }),
    });

    const req = new Request('http://localhost:3000/api/blocking-conditions');
    const res = await GET(req);

    // When blockers are found, the endpoint returns 200 with headers
    expect(res.status).toBe(200);
    expect(res.headers.get('X-Blocking-Conditions')).not.toBeNull();
    expect(
      parseInt(res.headers.get('X-Blocking-Conditions') || '0')
    ).toBeGreaterThan(0);
  });
});
