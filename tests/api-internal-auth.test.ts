import { describe, it, expect, beforeAll } from 'vitest';
import { NextRequest } from 'next/server';

/**
 * Regression guard: internal ops/telemetry endpoints must reject anonymous
 * requests. /api/knowledge, /api/error-tracking, /api/schema-migrations and
 * /api/incident-response shipped publicly readable once — these tests pin the
 * ADMIN_TOKEN guard (lib/api-auth) on every handler so that can't recur.
 */

const TEST_TOKEN = 'test-admin-token';
beforeAll(() => {
  process.env.ADMIN_TOKEN = TEST_TOKEN;
});

function anon(url: string, method = 'GET', body?: unknown): NextRequest {
  const options: Record<string, unknown> = { method };
  if (body) options.body = JSON.stringify(body);
  return new NextRequest(url, options);
}

function authed(url: string, method = 'GET', body?: unknown): NextRequest {
  const options: Record<string, unknown> = {
    method,
    headers: { authorization: `Bearer ${TEST_TOKEN}` },
  };
  if (body) options.body = JSON.stringify(body);
  return new NextRequest(url, options);
}

describe('internal endpoints reject anonymous requests', () => {
  it('GET /api/knowledge -> 401', async () => {
    const { GET } = await import('@/app/api/knowledge/route');
    const res = await GET(anon('http://localhost:3000/api/knowledge'));
    expect(res.status).toBe(401);
  });

  it('POST /api/knowledge -> 401', async () => {
    const { POST } = await import('@/app/api/knowledge/route');
    const res = await POST(
      anon('http://localhost:3000/api/knowledge', 'POST', { type: 'learning' })
    );
    expect(res.status).toBe(401);
  });

  it('GET /api/error-tracking -> 401', async () => {
    const { GET } = await import('@/app/api/error-tracking/route');
    const res = await GET(anon('http://localhost:3000/api/error-tracking'));
    expect(res.status).toBe(401);
  });

  it('GET /api/incident-response -> 401', async () => {
    const { GET } = await import('@/app/api/incident-response/route');
    const res = await GET(anon('http://localhost:3000/api/incident-response'));
    expect(res.status).toBe(401);
  });

  it('POST /api/incident-response -> 401', async () => {
    const { POST } = await import('@/app/api/incident-response/route');
    const res = await POST(
      anon('http://localhost:3000/api/incident-response', 'POST', {
        deploymentId: 'x',
        trigger: 'manual',
      })
    );
    expect(res.status).toBe(401);
  });

  it('authenticated GET /api/error-tracking succeeds', async () => {
    const { GET } = await import('@/app/api/error-tracking/route');
    const res = await GET(authed('http://localhost:3000/api/error-tracking'));
    expect(res.status).toBe(200);
  });

  it('authenticated GET /api/knowledge succeeds', async () => {
    const { GET } = await import('@/app/api/knowledge/route');
    const res = await GET(authed('http://localhost:3000/api/knowledge'));
    expect(res.status).toBe(200);
  });

  it('GET /api/deployment-canary -> 401', async () => {
    const { GET } = await import('@/app/api/deployment-canary/route');
    const res = await GET(anon('http://localhost:3000/api/deployment-canary'));
    expect(res.status).toBe(401);
  });

  it('GET /api/feature-flags -> 401', async () => {
    const { GET } = await import('@/app/api/feature-flags/route');
    const res = await GET(anon('http://localhost:3000/api/feature-flags'));
    expect(res.status).toBe(401);
  });

  it('GET /api/autonomous-remediation -> 401', async () => {
    const { GET } = await import('@/app/api/autonomous-remediation/route');
    const res = await GET(
      anon('http://localhost:3000/api/autonomous-remediation')
    );
    expect(res.status).toBe(401);
  });

  it('POST /api/autonomous-remediation -> 401', async () => {
    const { POST } = await import('@/app/api/autonomous-remediation/route');
    const res = await POST(
      anon('http://localhost:3000/api/autonomous-remediation', 'POST', {})
    );
    expect(res.status).toBe(401);
  });

  it('GET /api/deployment-verification -> 401', async () => {
    const { GET } = await import('@/app/api/deployment-verification/route');
    const res = await GET(
      anon('http://localhost:3000/api/deployment-verification')
    );
    expect(res.status).toBe(401);
  });
});
