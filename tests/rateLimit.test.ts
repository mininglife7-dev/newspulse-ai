import { beforeEach, describe, expect, it } from 'vitest';
import {
  RATE_LIMIT_MAX,
  RATE_LIMIT_WINDOW_MS,
  __resetRateLimitStore,
  rateLimit,
} from '@/lib/rateLimit';

beforeEach(() => {
  __resetRateLimitStore();
});

describe('rateLimit', () => {
  it('allows the first request and reports remaining', () => {
    const res = rateLimit('1.1.1.1', 1000);
    expect(res.allowed).toBe(true);
    expect(res.remaining).toBe(RATE_LIMIT_MAX - 1);
    expect(res.resetIn).toBe(RATE_LIMIT_WINDOW_MS);
  });

  it('allows exactly RATE_LIMIT_MAX requests, then blocks', () => {
    const now = 1000;
    for (let i = 0; i < RATE_LIMIT_MAX; i++) {
      expect(rateLimit('2.2.2.2', now).allowed).toBe(true);
    }
    const blocked = rateLimit('2.2.2.2', now);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it('starts a fresh window after the previous one elapses', () => {
    const start = 1000;
    for (let i = 0; i < RATE_LIMIT_MAX; i++) rateLimit('3.3.3.3', start);
    expect(rateLimit('3.3.3.3', start).allowed).toBe(false);

    // Advance beyond the window — should be allowed again.
    const later = start + RATE_LIMIT_WINDOW_MS + 1;
    const res = rateLimit('3.3.3.3', later);
    expect(res.allowed).toBe(true);
    expect(res.remaining).toBe(RATE_LIMIT_MAX - 1);
  });

  it('tracks distinct IPs independently', () => {
    const now = 1000;
    for (let i = 0; i < RATE_LIMIT_MAX; i++) rateLimit('4.4.4.4', now);
    expect(rateLimit('4.4.4.4', now).allowed).toBe(false);
    // A different IP is unaffected.
    expect(rateLimit('5.5.5.5', now).allowed).toBe(true);
  });
});
