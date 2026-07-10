import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { GET } from '@/app/api/health/route';

const KEYS = [
  'FIRECRAWL_API_KEY',
  'OPENAI_API_KEY',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'DEMO_MODE',
];

let snapshot: Record<string, string | undefined>;

beforeEach(() => {
  snapshot = {};
  for (const k of KEYS) {
    snapshot[k] = process.env[k];
    delete process.env[k];
  }
});

afterEach(() => {
  for (const k of KEYS) {
    if (snapshot[k] === undefined) delete process.env[k];
    else process.env[k] = snapshot[k];
  }
});

describe('GET /api/health', () => {
  it('reports degraded (503) when no integrations are configured', async () => {
    const res = await GET();
    expect(res.status).toBe(503);

    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.status).toBe('degraded');
    expect(body.checks).toEqual({
      firecrawl: false,
      openai: false,
      supabase_url: false,
      supabase_anon: false,
      supabase_service: false,
    });
    expect(typeof body.timestamp).toBe('string');
  });

  it('reports healthy (200) when every integration has credentials', async () => {
    for (const k of KEYS) process.env[k] = 'test-value';

    const res = await GET();
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.status).toBe('healthy');
    expect(Object.values(body.checks).every(Boolean)).toBe(true);
  });

  it('reports demo_mode=false by default and true when DEMO_MODE is set', async () => {
    const off = await (await GET()).json();
    expect(off.demo_mode).toBe(false);

    process.env.DEMO_MODE = 'true';
    const on = await (await GET()).json();
    expect(on.demo_mode).toBe(true);

    process.env.DEMO_MODE = '1';
    const onNumeric = await (await GET()).json();
    expect(onNumeric.demo_mode).toBe(true);
  });
});
