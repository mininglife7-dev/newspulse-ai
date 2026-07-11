/**
 * Simple in-memory rate limiter for API endpoints.
 *
 * Use cases:
 * - Protect /api/auth/signup from brute-force attempts
 * - Protect /api/workspace from DOS
 * - Protect /api/ai-systems from rapid-fire creation
 *
 * Note: This is in-memory only. For multi-instance deployments,
 * migrate to Redis-backed rate limiting.
 */

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, RateLimitBucket>();

/**
 * Check if request exceeds rate limit.
 *
 * @param key - Unique identifier (IP, user ID, API key)
 * @param limit - Max requests allowed
 * @param windowMs - Time window in milliseconds
 * @returns true if request is allowed, false if rate limited
 */
export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now > bucket.resetAt) {
    // Create new bucket
    buckets.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });
    return true;
  }

  if (bucket.count < limit) {
    bucket.count++;
    return true;
  }

  return false;
}

/**
 * Get current rate limit status.
 */
export function getRateLimitStatus(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now > bucket.resetAt) {
    return {
      remaining: limit - 1,
      resetAt: now + windowMs,
      limited: false,
    };
  }

  return {
    remaining: Math.max(0, limit - bucket.count),
    resetAt: bucket.resetAt,
    limited: bucket.count >= limit,
  };
}

/**
 * Cleanup old buckets (run periodically to prevent memory leak).
 */
export function cleanupExpiredBuckets() {
  const now = Date.now();
  const expired: string[] = [];

  for (const [key, bucket] of buckets) {
    if (now > bucket.resetAt) {
      expired.push(key);
    }
  }

  expired.forEach((key) => buckets.delete(key));
  return expired.length;
}

/**
 * Export bucket status for monitoring.
 */
export function getBucketStats() {
  return {
    activeBuckets: buckets.size,
    memoryUsage: buckets.size * 32, // Rough estimate: ~32 bytes per entry
  };
}

/**
 * Clear all buckets (for testing only).
 * @internal
 */
export function __clearAllBuckets() {
  buckets.clear();
}
