import { describe, it, expect } from 'vitest';
import { createRateLimiter, MemoryStore } from '@/lib/rate-limit';

describe('createRateLimiter', () => {
  it('allows up to max requests, then blocks within the window', () => {
    let t = 1000;
    const limiter = createRateLimiter({ windowMs: 60_000, max: 3, now: () => t });

    expect(limiter.check('ip').allowed).toBe(true); // 1
    expect(limiter.check('ip').allowed).toBe(true); // 2
    const third = limiter.check('ip'); // 3
    expect(third.allowed).toBe(true);
    expect(third.remaining).toBe(0);

    const fourth = limiter.check('ip'); // 4 — over
    expect(fourth.allowed).toBe(false);
    expect(fourth.remaining).toBe(0);
    expect(fourth.limit).toBe(3);
  });

  it('reports remaining accurately as the window fills', () => {
    let t = 0;
    const limiter = createRateLimiter({ windowMs: 1000, max: 5, now: () => t });
    expect(limiter.check('k').remaining).toBe(4);
    expect(limiter.check('k').remaining).toBe(3);
    expect(limiter.check('k').remaining).toBe(2);
  });

  it('resets after the window elapses', () => {
    let t = 0;
    const limiter = createRateLimiter({ windowMs: 1000, max: 1, now: () => t });
    expect(limiter.check('k').allowed).toBe(true);
    expect(limiter.check('k').allowed).toBe(false);

    t += 1001; // window elapsed
    const afterReset = limiter.check('k');
    expect(afterReset.allowed).toBe(true);
    expect(afterReset.remaining).toBe(0);
  });

  it('tracks keys independently (one IP cannot exhaust another)', () => {
    let t = 0;
    const limiter = createRateLimiter({ windowMs: 1000, max: 1, now: () => t });
    expect(limiter.check('a').allowed).toBe(true);
    expect(limiter.check('a').allowed).toBe(false);
    // Different key still has its full budget.
    expect(limiter.check('b').allowed).toBe(true);
  });

  it('reports resetMs counting down toward the window boundary', () => {
    let t = 0;
    const limiter = createRateLimiter({ windowMs: 1000, max: 5, now: () => t });
    limiter.check('k'); // opens window at t=0, resetAt=1000
    t = 400;
    expect(limiter.check('k').resetMs).toBe(600);
  });
});

describe('MemoryStore.prune', () => {
  it('drops only expired buckets', () => {
    const store = new MemoryStore();
    store.set('old', { count: 1, resetAt: 500 });
    store.set('fresh', { count: 1, resetAt: 5000 });
    store.prune(1000);
    expect(store.get('old')).toBeUndefined();
    expect(store.get('fresh')).toBeDefined();
  });
});
