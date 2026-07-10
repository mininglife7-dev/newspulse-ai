import { describe, it, expect, beforeEach } from 'vitest';
import { rateLimit, isDurable, __resetMemoryBuckets } from '@/lib/rate-limit';

describe('rate-limit adapter (in-memory fallback)', () => {
  beforeEach(() => __resetMemoryBuckets());

  it('reports NOT durable when Upstash is not configured', () => {
    expect(isDurable()).toBe(false);
  });

  it('allows up to the limit, then blocks, and marks results non-durable', async () => {
    const key = 'test:allow-block';
    const results = [];
    for (let i = 0; i < 4; i++) {
      results.push(await rateLimit({ key, limit: 3, windowMs: 10_000 }));
    }
    expect(results.map((r) => r.allowed)).toEqual([true, true, true, false]);
    expect(results[3].remaining).toBe(0);
    expect(results[0].durable).toBe(false);
  });

  it('decrements remaining and reports the configured limit', async () => {
    const key = 'test:remaining';
    const r1 = await rateLimit({ key, limit: 5, windowMs: 10_000 });
    const r2 = await rateLimit({ key, limit: 5, windowMs: 10_000 });
    expect(r1.limit).toBe(5);
    expect(r1.remaining).toBe(4);
    expect(r2.remaining).toBe(3);
  });

  it('keeps separate keys independent', async () => {
    const a = await rateLimit({ key: 'k:a', limit: 1, windowMs: 10_000 });
    const a2 = await rateLimit({ key: 'k:a', limit: 1, windowMs: 10_000 });
    const b = await rateLimit({ key: 'k:b', limit: 1, windowMs: 10_000 });
    expect(a.allowed).toBe(true);
    expect(a2.allowed).toBe(false);
    expect(b.allowed).toBe(true);
  });

  it('resets after the window elapses', async () => {
    const key = 'test:reset';
    expect((await rateLimit({ key, limit: 1, windowMs: 30 })).allowed).toBe(true);
    expect((await rateLimit({ key, limit: 1, windowMs: 30 })).allowed).toBe(false);
    await new Promise((r) => setTimeout(r, 45));
    expect((await rateLimit({ key, limit: 1, windowMs: 30 })).allowed).toBe(true);
  });
});
