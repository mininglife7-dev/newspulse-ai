import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { middleware } from '@/middleware';

function apiRequest(path: string, ip: string, method = 'GET'): NextRequest {
  return new NextRequest(`http://localhost:3000${path}`, {
    method,
    headers: { 'x-forwarded-for': ip },
  });
}

describe('rate-limit middleware', () => {
  it('never rate-limits the health endpoint', () => {
    const res = middleware(apiRequest('/api/health', '10.0.0.9'));
    expect(res.status).toBe(200);
    expect(res.headers.get('X-RateLimit-Limit')).toBeNull();
  });

  it('passes non-API paths through untouched', () => {
    const res = middleware(new NextRequest('http://localhost:3000/history'));
    expect(res.status).toBe(200);
    expect(res.headers.get('X-RateLimit-Limit')).toBeNull();
  });

  it('limits /api/search to 30/min per IP with headers', () => {
    const res = middleware(apiRequest('/api/search', '10.0.0.1', 'POST'));
    expect(res.status).toBe(200);
    expect(res.headers.get('X-RateLimit-Limit')).toBe('30');
    expect(res.headers.get('X-RateLimit-Remaining')).toBe('29');
  });

  it('limits other API routes (incl. destructive DELETE) to 60/min', () => {
    const res = middleware(apiRequest('/api/history', '10.0.0.1', 'DELETE'));
    expect(res.status).toBe(200);
    expect(res.headers.get('X-RateLimit-Limit')).toBe('60');
    expect(res.headers.get('X-RateLimit-Remaining')).toBe('59');
  });

  it('returns 429 once the search limit is exceeded', async () => {
    const ip = '10.0.0.2';
    let last: Response = middleware(apiRequest('/api/search', ip, 'POST'));
    for (let i = 0; i < 30; i++) {
      last = middleware(apiRequest('/api/search', ip, 'POST'));
    }
    expect(last.status).toBe(429);
    const body = await last.json();
    expect(body.ok).toBe(false);
    expect(body.error).toMatch(/rate limit/i);
    expect(last.headers.get('X-RateLimit-Remaining')).toBe('0');
  });

  it('returns 429 once the general API limit is exceeded', () => {
    const ip = '10.0.0.4';
    let last: Response = middleware(apiRequest('/api/history', ip, 'DELETE'));
    for (let i = 0; i < 60; i++) {
      last = middleware(apiRequest('/api/history', ip, 'DELETE'));
    }
    expect(last.status).toBe(429);
  });

  it('search and general API budgets are independent per IP', () => {
    const ip = '10.0.0.5';
    for (let i = 0; i < 30; i++) middleware(apiRequest('/api/search', ip, 'POST'));
    expect(middleware(apiRequest('/api/search', ip, 'POST')).status).toBe(429);
    expect(middleware(apiRequest('/api/history', ip)).status).toBe(200);
  });

  it('tracks limits per IP independently', () => {
    const res = middleware(apiRequest('/api/search', '10.0.0.3', 'POST'));
    expect(res.status).toBe(200);
  });
});
