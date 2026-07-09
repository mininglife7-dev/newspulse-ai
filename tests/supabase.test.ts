import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('lib/supabase without environment variables', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '');
    vi.resetModules();
  });

  it('can be imported without env vars (build-time safety)', async () => {
    await expect(import('@/lib/supabase')).resolves.toBeDefined();
  });

  it('browser client throws only on first use, not on import', async () => {
    const { supabase } = await import('@/lib/supabase');
    expect(() => supabase.from('news_searches')).toThrow(
      /NEXT_PUBLIC_SUPABASE_URL/
    );
  });

  it('getSupabaseAdmin throws a clear error when env is missing', async () => {
    const { getSupabaseAdmin } = await import('@/lib/supabase');
    expect(() => getSupabaseAdmin()).toThrow(/SUPABASE_SERVICE_ROLE_KEY/);
  });
});

describe('lib/supabase with environment variables', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-key');
    vi.resetModules();
  });

  it('browser client proxies to a real client', async () => {
    const { supabase } = await import('@/lib/supabase');
    expect(supabase.from('news_searches')).toBeDefined();
  });

  it('getSupabaseAdmin returns a memoized client', async () => {
    const { getSupabaseAdmin } = await import('@/lib/supabase');
    expect(getSupabaseAdmin()).toBe(getSupabaseAdmin());
  });
});
