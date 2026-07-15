/**
 * Fixed-window rate limiter.
 *
 * Pure, dependency-free, and unit-tested. The clock is injectable so tests are
 * deterministic. State is an in-memory Map, which is per-instance: it protects
 * a single serverless/edge instance against bursts and is a strict improvement
 * over no limiting. For cross-instance durability, swap the Store for a shared
 * backend (Upstash / Vercel KV) — the `Store` interface below is the seam.
 */

export interface RateLimitResult {
  allowed: boolean;
  /** Requests remaining in the current window. */
  remaining: number;
  /** Milliseconds until the window resets. */
  resetMs: number;
  /** The configured ceiling for this window. */
  limit: number;
}

interface Bucket {
  count: number;
  resetAt: number;
}

export interface Store {
  get(key: string): Bucket | undefined;
  set(key: string, bucket: Bucket): void;
}

/** Default in-memory store. Prunes lazily on read to bound memory. */
export class MemoryStore implements Store {
  private buckets = new Map<string, Bucket>();

  get(key: string): Bucket | undefined {
    return this.buckets.get(key);
  }

  set(key: string, bucket: Bucket): void {
    this.buckets.set(key, bucket);
  }

  /** Drop expired buckets. Call periodically if the key space is unbounded. */
  prune(now: number): void {
    for (const [key, bucket] of this.buckets) {
      if (bucket.resetAt <= now) this.buckets.delete(key);
    }
  }
}

export interface RateLimiterOptions {
  /** Window length in milliseconds. */
  windowMs: number;
  /** Max requests allowed per key per window. */
  max: number;
  /** Injectable clock (defaults to Date.now) for deterministic tests. */
  now?: () => number;
  /** Injectable store (defaults to a fresh MemoryStore). */
  store?: Store;
}

export interface RateLimiter {
  check(key: string): RateLimitResult;
}

export function createRateLimiter(options: RateLimiterOptions): RateLimiter {
  const { windowMs, max } = options;
  const clock = options.now ?? Date.now;
  const store = options.store ?? new MemoryStore();

  return {
    check(key: string): RateLimitResult {
      const now = clock();
      const bucket = store.get(key);

      // No bucket, or the previous window has elapsed → start a fresh window.
      if (!bucket || bucket.resetAt <= now) {
        const fresh: Bucket = { count: 1, resetAt: now + windowMs };
        store.set(key, fresh);
        return { allowed: true, remaining: max - 1, resetMs: windowMs, limit: max };
      }

      const resetMs = bucket.resetAt - now;

      if (bucket.count >= max) {
        return { allowed: false, remaining: 0, resetMs, limit: max };
      }

      bucket.count += 1;
      store.set(key, bucket);
      return {
        allowed: true,
        remaining: max - bucket.count,
        resetMs,
        limit: max,
      };
    },
  };
}
