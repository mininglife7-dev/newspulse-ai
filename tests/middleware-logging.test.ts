import { describe, it, expect, beforeEach } from 'vitest';
import { withLogging, extractUserIdFromAuth } from '@/lib/middleware-logging';
import { __clearLogs, queryLogs } from '@/lib/request-logger';
import { NextResponse } from 'next/server';

// Mock NextRequest - headers should work as Map-like object
function createMockRequest(options: {
  method: string;
  headers?: Record<string, string>;
  contentLength?: number;
} = { method: 'GET' }): any {
  const headersObj = options.headers || {};
  const headerMap = new Map(Object.entries(headersObj));

  // Create a mock that works for both getRequestIp (object access) and extractUserIdFromAuth (Headers.get())
  const mockHeaders = {
    ...headersObj,
    get: (key: string) => {
      for (const [k, v] of headerMap) {
        if (k.toLowerCase() === key.toLowerCase()) {
          return v;
        }
      }
      return null;
    },
  };

  return {
    method: options.method,
    headers: mockHeaders,
    nextUrl: { pathname: '/api/test' },
    contentLength: options.contentLength || 0,
  };
}

describe('middleware-logging', () => {
  beforeEach(() => {
    __clearLogs();
  });

  it('logs successful requests', async () => {
    const req = createMockRequest({ method: 'GET' });

    await withLogging(
      req,
      () =>
        Promise.resolve(
          NextResponse.json({ ok: true }, { status: 200 })
        ),
      { endpoint: '/api/test', method: 'GET' }
    );

    const logs = queryLogs({ limit: 100 });
    expect(logs.length).toBe(1);
    expect(logs[0].path).toBe('/api/test');
    expect(logs[0].status).toBe(200);
    expect(logs[0].level).toBe('info');
  });

  it('logs request errors with 500 status', async () => {
    const req = createMockRequest({ method: 'POST' });

    try {
      await withLogging(
        req,
        () => Promise.reject(new Error('Database connection failed')),
        { endpoint: '/api/workspace', method: 'POST' }
      );
    } catch {
      // Expected to throw
    }

    const logs = queryLogs({ limit: 100 });
    expect(logs.length).toBe(1);
    expect(logs[0].status).toBe(500);
    expect(logs[0].error).toBe('Database connection failed');
    expect(logs[0].level).toBe('error');
  });

  it('includes userId when provided', async () => {
    const req = createMockRequest({ method: 'POST' });

    await withLogging(
      req,
      () => Promise.resolve(NextResponse.json({ ok: true })),
      {
        endpoint: '/api/workspace',
        method: 'POST',
        userId: 'user-123',
      }
    );

    const logs = queryLogs({ limit: 100 });
    expect(logs[0].userId).toBe('user-123');
  });

  it('includes workspaceId when provided', async () => {
    const req = createMockRequest({ method: 'POST' });

    await withLogging(
      req,
      () => Promise.resolve(NextResponse.json({ ok: true })),
      {
        endpoint: '/api/ai-systems',
        method: 'POST',
        workspaceId: 'ws-789',
      }
    );

    const logs = queryLogs({ limit: 100 });
    expect(logs[0].workspaceId).toBe('ws-789');
  });

  it('captures request latency', async () => {
    const req = createMockRequest({ method: 'GET' });

    await withLogging(
      req,
      async () => {
        // Simulate some work
        await new Promise((resolve) => setTimeout(resolve, 50));
        return NextResponse.json({ ok: true });
      },
      { endpoint: '/api/test', method: 'GET' }
    );

    const logs = queryLogs({ limit: 100 });
    expect(logs[0].latencyMs).toBeGreaterThanOrEqual(50);
  });

  it('extracts IP from x-forwarded-for header', async () => {
    const req = createMockRequest({
      method: 'POST',
      headers: { 'x-forwarded-for': '192.168.1.100, 10.0.0.1' },
    });

    await withLogging(
      req,
      () => Promise.resolve(NextResponse.json({ ok: true })),
      { endpoint: '/api/test', method: 'POST' }
    );

    const logs = queryLogs({ limit: 100 });
    expect(logs[0].ip).toBe('192.168.1.100');
  });

  it('extracts IP from x-real-ip header', async () => {
    const req = createMockRequest({
      method: 'POST',
      headers: { 'x-real-ip': '10.0.0.50' },
    });

    await withLogging(
      req,
      () => Promise.resolve(NextResponse.json({ ok: true })),
      { endpoint: '/api/test', method: 'POST' }
    );

    const logs = queryLogs({ limit: 100 });
    expect(logs[0].ip).toBe('10.0.0.50');
  });

  it('defaults to unknown IP when no header present', async () => {
    const req = createMockRequest({ method: 'POST', headers: {} });

    await withLogging(
      req,
      () => Promise.resolve(NextResponse.json({ ok: true })),
      { endpoint: '/api/test', method: 'POST' }
    );

    const logs = queryLogs({ limit: 100 });
    expect(logs[0].ip).toBe('unknown');
  });

  it('extracts user ID from Bearer token header', async () => {
    const req = createMockRequest({
      method: 'GET',
      headers: { authorization: 'Bearer some-jwt-token' },
    });

    const userId = await extractUserIdFromAuth(req);
    expect(userId).toBe('authenticated-user');
  });

  it('returns undefined for missing auth header', async () => {
    const req = createMockRequest({ method: 'GET' });

    const userId = await extractUserIdFromAuth(req);
    expect(userId).toBeUndefined();
  });

  it('returns undefined for non-Bearer auth', async () => {
    const req = createMockRequest({
      method: 'GET',
      headers: { authorization: 'Basic user:pass' },
    });

    const userId = await extractUserIdFromAuth(req);
    expect(userId).toBeUndefined();
  });

  it('logs different HTTP methods correctly', async () => {
    const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

    for (const method of methods) {
      const req = createMockRequest({ method });

      await withLogging(
        req,
        () =>
          Promise.resolve(
            NextResponse.json({ ok: true }, { status: 200 })
          ),
        { endpoint: '/api/test', method }
      );
    }

    const logs = queryLogs({ limit: 100 });
    expect(logs.length).toBe(5);
    logs.forEach((log, idx) => {
      expect(log.method).toBe(methods[idx]);
    });
  });

  it('logs different status codes with appropriate levels', async () => {
    const testCases = [
      { status: 200, expectedLevel: 'info' },
      { status: 201, expectedLevel: 'info' },
      { status: 400, expectedLevel: 'warn' },
      { status: 401, expectedLevel: 'warn' },
      { status: 404, expectedLevel: 'warn' },
      { status: 500, expectedLevel: 'error' },
      { status: 502, expectedLevel: 'error' },
    ];

    for (const { status, expectedLevel } of testCases) {
      __clearLogs(); // Clear between tests for clarity

      const req = createMockRequest({ method: 'GET' });

      if (status >= 500) {
        try {
          await withLogging(
            req,
            () => Promise.reject(new Error('Server error')),
            { endpoint: '/api/test', method: 'GET' }
          );
        } catch {
          // Expected
        }
      } else {
        await withLogging(
          req,
          () =>
            Promise.resolve(
              NextResponse.json({ ok: status < 400 }, { status })
            ),
          { endpoint: '/api/test', method: 'GET' }
        );
      }

      const logs = queryLogs({ limit: 100 });
      expect(logs[0].level).toBe(expectedLevel);
    }
  });
});
