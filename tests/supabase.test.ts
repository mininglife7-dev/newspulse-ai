import { describe, it, expect, beforeEach, vi } from 'vitest';

// @supabase/realtime-js requires a WebSocket implementation at client
// construction time. Node < 22 has no native WebSocket, so give it a stub —
// these tests never open a realtime connection.
if (typeof globalThis.WebSocket === 'undefined') {
  vi.stubGlobal(
    'WebSocket',
    class {
      close() {}
    }
  );
}

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

describe('boundResultsForStorage (R-13 storage-exhaustion guard)', () => {
  const article = (over: Partial<Record<string, unknown>> = {}) => ({
    title: 'Title',
    url: 'https://example.com/a',
    source: 'example.com',
    date: null,
    description: 'A short description.',
    ai_summary: 'A short summary.',
    ...over,
  });

  it('passes normal result sets through unchanged in shape', async () => {
    const { boundResultsForStorage } = await import('@/lib/supabase');
    const input = [article(), article({ url: 'https://example.com/b' })];
    const out = boundResultsForStorage(input as never);
    expect(out).toHaveLength(2);
    expect(out[0]).toEqual(article());
  });

  it('caps the number of stored articles at maxArticles', async () => {
    const { boundResultsForStorage, STORAGE_LIMITS } = await import(
      '@/lib/supabase'
    );
    const many = Array.from({ length: 100 }, () => article());
    const out = boundResultsForStorage(many as never);
    expect(out).toHaveLength(STORAGE_LIMITS.maxArticles);
  });

  it('truncates oversized string fields to their limits', async () => {
    const { boundResultsForStorage, STORAGE_LIMITS } = await import(
      '@/lib/supabase'
    );
    const huge = boundResultsForStorage([
      article({
        ai_summary: 'x'.repeat(50_000),
        description: 'y'.repeat(50_000),
        title: 'z'.repeat(50_000),
      }),
    ] as never);
    expect(huge[0].ai_summary).toHaveLength(STORAGE_LIMITS.maxSummary);
    expect(huge[0].description).toHaveLength(STORAGE_LIMITS.maxDescription);
    expect(huge[0].title).toHaveLength(STORAGE_LIMITS.maxTitle);
  });

  it('preserves null description without throwing', async () => {
    const { boundResultsForStorage } = await import('@/lib/supabase');
    const out = boundResultsForStorage([
      article({ description: null }),
    ] as never);
    expect(out[0].description).toBeNull();
  });

  it('returns an empty array for non-array input', async () => {
    const { boundResultsForStorage } = await import('@/lib/supabase');
    expect(boundResultsForStorage(undefined as never)).toEqual([]);
    expect(boundResultsForStorage(null as never)).toEqual([]);
  });
});
