import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { GET } from '@/app/api/health/route';

const KEYS = [
  'FIRECRAWL_API_KEY',
  'OPENAI_API_KEY',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
];
const saved: Record<string, string | undefined> = {};

beforeEach(() => {
  KEYS.forEach((k) => (saved[k] = process.env[k]));
  KEYS.forEach((k) => (process.env[k] = 'set'));
});
afterEach(() => {
  KEYS.forEach((k) => {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  });
});

describe('GET /api/health', () => {
  it('reports healthy 200 when all integrations are configured', async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.status).toBe('healthy');
    expect(Object.values(json.checks).every(Boolean)).toBe(true);
  });

  it('never caches the response', async () => {
    const res = await GET();
    expect(res.headers.get('cache-control')).toMatch(/no-store/);
  });

  it('reports degraded 503 when an integration is missing', async () => {
    delete process.env.OPENAI_API_KEY;
    const res = await GET();
    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.status).toBe('degraded');
    expect(json.checks.openai).toBe(false);
  });
});
