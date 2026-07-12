import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Supabase module at top level
vi.mock('@/lib/supabase', () => ({
  getSupabaseAdmin: () => ({
    from: () => ({
      select: () => ({
        limit: async () => ({ data: [], error: null }),
      }),
    }),
  }),
}));

async function getHealth() {
  vi.resetModules();
  const { GET } = await import('@/app/api/health/route');
  const res = await GET();
  return { status: res.status, body: await res.json() };
}

describe('GET /api/health', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it('reports healthy when all Supabase env vars are present', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'sb_publishable_x');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'sb_secret_x');

    const { status, body } = await getHealth();
    expect(status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.status).toBe('healthy');
    expect(body.checks).toEqual({
      supabase_url: true,
      supabase_anon: true,
      supabase_service: true,
    });
    expect(body.db).toBe('ok');
  });

  it('reports degraded with 503 when configuration is missing', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '');

    const { status, body } = await getHealth();
    expect(status).toBe(503);
    expect(body.ok).toBe(false);
    expect(body.status).toBe('degraded');
    expect(body.checks.supabase_url).toBe(false);
  });
});
