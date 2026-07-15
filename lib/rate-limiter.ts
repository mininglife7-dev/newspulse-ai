/**
 * Rate Limiting Middleware
 *
 * Prevents abuse by limiting requests per IP address over a time window.
 * Uses in-memory store (suitable for single-server deployments).
 *
 * Usage:
 *   const limiter = createRateLimiter({ maxRequests: 100, windowMs: 60000 });
 *   if (!limiter.isAllowed(ipAddress)) {
 *     return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
 *   }
 */

export interface RateLimiterConfig {
  maxRequests: number; // Maximum requests per window
  windowMs: number; // Time window in milliseconds
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
}

interface RequestRecord {
  count: number;
  resetAt: number;
}

/**
 * In-memory rate limiter using sliding window
 */
export class RateLimiter {
  private store: Map<string, RequestRecord> = new Map();
  private config: RateLimiterConfig;
  private cleanupInterval: NodeJS.Timeout;

  constructor(config: RateLimiterConfig) {
    this.config = config;

    // Cleanup expired entries every 60 seconds
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60 * 1000);
  }

  /**
   * Check if request is allowed and track it
   * @param key Identifier (usually IP address) to rate limit
   * @returns Rate limit result with status and headers
   */
  isAllowed(key: string): RateLimitResult {
    const now = Date.now();
    const record = this.store.get(key);

    // Request is outside current window
    if (!record || now >= record.resetAt) {
      const resetAt = now + this.config.windowMs;
      this.store.set(key, { count: 1, resetAt });
      return {
        allowed: true,
        remaining: this.config.maxRequests - 1,
        resetAt,
      };
    }

    // Request is within current window
    record.count++;
    const remaining = Math.max(0, this.config.maxRequests - record.count);
    const isAllowed = record.count <= this.config.maxRequests;

    return {
      allowed: isAllowed,
      remaining,
      resetAt: record.resetAt,
      retryAfter: !isAllowed
        ? Math.ceil((record.resetAt - now) / 1000)
        : undefined,
    };
  }

  /**
   * Remove expired entries from store
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, record] of this.store.entries()) {
      if (now >= record.resetAt) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Reset rate limit for a key
   */
  reset(key: string): void {
    this.store.delete(key);
  }

  /**
   * Clear all rate limit data
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * Cleanup and destroy the limiter
   */
  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.store.clear();
  }

  /**
   * Get current store size (for monitoring)
   */
  size(): number {
    return this.store.size;
  }
}

/**
 * Create a rate limiter instance
 */
export function createRateLimiter(config: RateLimiterConfig): RateLimiter {
  return new RateLimiter(config);
}

/**
 * Extract IP address from request
 * Handles X-Forwarded-For header (proxy/load balancer)
 */
export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  const xRealIp = request.headers.get('x-real-ip');
  if (xRealIp) {
    return xRealIp;
  }

  // Fallback (note: URLSearchParams doesn't provide remote IP in Next.js)
  return 'unknown';
}

/**
 * Pre-configured rate limiters for common use cases
 */
export const presets = {
  // Strict: 10 requests per minute
  strict: () => createRateLimiter({ maxRequests: 10, windowMs: 60 * 1000 }),

  // Standard: 60 requests per minute (1 per second)
  standard: () => createRateLimiter({ maxRequests: 60, windowMs: 60 * 1000 }),

  // Generous: 300 requests per minute (5 per second)
  generous: () => createRateLimiter({ maxRequests: 300, windowMs: 60 * 1000 }),

  // API: 1000 requests per hour
  api: () => createRateLimiter({ maxRequests: 1000, windowMs: 60 * 60 * 1000 }),
};
