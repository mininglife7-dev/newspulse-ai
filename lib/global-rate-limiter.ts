/**
 * Global rate limiter singleton
 * Used by middleware.ts to enforce per-IP rate limits across all requests
 */

import {
  createRateLimiter,
  type RateLimiterConfig,
  getClientIp,
} from '@/lib/rate-limiter';

let globalLimiter: ReturnType<typeof createRateLimiter> | null = null;

/**
 * Get or create the global rate limiter
 */
export function getGlobalRateLimiter() {
  if (!globalLimiter) {
    // Standard: 60 requests per minute (1 per second) for general API usage
    globalLimiter = createRateLimiter({
      maxRequests: 60,
      windowMs: 60 * 1000,
    });
  }
  return globalLimiter;
}

/**
 * Check if a request is allowed under rate limit
 * @param request Request object
 * @returns true if allowed, false if rate limited
 */
export function checkRateLimit(request: Request): boolean {
  const limiter = getGlobalRateLimiter();
  const ip = getClientIp(request);
  const result = limiter.isAllowed(ip);
  return result.allowed;
}

/**
 * Get rate limit status for a request
 * @param request Request object
 * @returns RateLimitResult with status and retry information
 */
export function getRateLimitStatus(request: Request) {
  const limiter = getGlobalRateLimiter();
  const ip = getClientIp(request);
  return limiter.isAllowed(ip);
}
