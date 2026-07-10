/**
 * Lightweight in-memory fixed-window rate limiter.
 *
 * Suitable for single-instance / hackathon scale. State lives in a module-level
 * Map and resets on cold start. For multi-instance production, swap the store
 * for Upstash or Vercel KV (the {@link rateLimit} signature can stay the same).
 *
 * Extracted from middleware so the windowing logic is unit-testable and so we
 * can bound memory: expired buckets are swept opportunistically instead of
 * accumulating one entry per unique IP forever.
 */

export const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
export const RATE_LIMIT_MAX = 30; // requests per IP per window

/** Sweep expired buckets once the map grows past this many entries. */
const SWEEP_THRESHOLD = 5_000;

interface Bucket {
  count: number;
  resetAt: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetIn: number;
}

const buckets = new Map<string, Bucket>();

/** Remove entries whose window has elapsed. Keeps memory bounded. */
function sweepExpired(now: number): void {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

/**
 * Record a hit for `ip` and report whether it is allowed.
 * `now` is injectable for deterministic testing.
 */
export function rateLimit(
  ip: string,
  now: number = Date.now()
): RateLimitResult {
  if (buckets.size > SWEEP_THRESHOLD) sweepExpired(now);

  const bucket = buckets.get(ip);

  // New window (no bucket, or the previous one has expired).
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return {
      allowed: true,
      remaining: RATE_LIMIT_MAX - 1,
      resetIn: RATE_LIMIT_WINDOW_MS,
    };
  }

  bucket.count += 1;
  if (bucket.count > RATE_LIMIT_MAX) {
    return { allowed: false, remaining: 0, resetIn: bucket.resetAt - now };
  }
  return {
    allowed: true,
    remaining: RATE_LIMIT_MAX - bucket.count,
    resetIn: bucket.resetAt - now,
  };
}

/** Test helper: clear all rate-limit state. */
export function __resetRateLimitStore(): void {
  buckets.clear();
}
