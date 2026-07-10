import { describe, it, expect, beforeEach } from 'vitest';
import { rateLimit, isDurable, __resetMemoryBuckets } from '@/lib/rate-limit';

describe('rate limiting (in-memory fallback)', () => {
  beforeEach(() => __resetMemoryBuckets());

  it('reports NOT durable when Upstash is not configured', () => {
    expect(isDurable()).toBe(false);
  });

  it('allows up to the limit, then blocks', async () => {
    const key = 'test:allow-block';
    const results = [];
    for (let i = 0; i < 4; i++) {
      results.push(await rateLimit({ key, limit: 3, windowMs: 10_000 }));
    }
    expect(results[0].allowed).toBe(true);
    expect(results[1].allowed).toBe(true);
    expect(results[2].allowed).toBe(true);
    expect(results[3].allowed).toBe(false); // 4th over the limit of 3
    expect(results[3].remaining).toBe(0);
    expect(results[0].durable).toBe(false);
  });

  it('decrements remaining and reports the limit', async () => {
    const key = 'test:remaining';
    const r1 = await rateLimit({ key, limit: 5, windowMs: 10_000 });
    const r2 = await rateLimit({ key, limit: 5, windowMs: 10_000 });
    expect(r1.limit).toBe(5);
    expect(r1.remaining).toBe(4);
    expect(r2.remaining).toBe(3);
  });

  it('keeps separate keys independent', async () => {
    const a = await rateLimit({ key: 'user:a', limit: 1, windowMs: 10_000 });
    const a2 = await rateLimit({ key: 'user:a', limit: 1, windowMs: 10_000 });
    const b = await rateLimit({ key: 'user:b', limit: 1, windowMs: 10_000 });
    expect(a.allowed).toBe(true);
    expect(a2.allowed).toBe(false);
    expect(b.allowed).toBe(true); // b is unaffected by a's usage
  });

  it('resets after the window elapses', async () => {
    const key = 'test:reset';
    const first = await rateLimit({ key, limit: 1, windowMs: 30 });
    const blocked = await rateLimit({ key, limit: 1, windowMs: 30 });
    expect(first.allowed).toBe(true);
    expect(blocked.allowed).toBe(false);
    await new Promise((r) => setTimeout(r, 45));
    const afterReset = await rateLimit({ key, limit: 1, windowMs: 30 });
    expect(afterReset.allowed).toBe(true);
  });
});
