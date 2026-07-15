import { NextRequest, NextResponse } from 'next/server';

/**
 * Simple in-memory rate limiting using a sliding window approach.
 * For production, consider using Redis or Upstash.
 *
 * Configuration:
 * - windowMs: Time window in milliseconds
 * - maxRequests: Max requests allowed per window
 * - keyGenerator: Function to extract the rate limit key (e.g., IP, user ID)
 */

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator: (req: NextRequest) => string;
  message?: string;
}

interface RequestRecord {
  count: number;
  resetTime: number;
}

const store = new Map<string, RequestRecord>();

/**
 * Clean up expired entries periodically (runs every 5 minutes)
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of store.entries()) {
    if (record.resetTime < now) {
      store.delete(key);
    }
  }
}, 5 * 60 * 1000);

export function createRateLimiter(config: RateLimitConfig) {
  return async (req: NextRequest) => {
    const key = config.keyGenerator(req);
    const now = Date.now();

    let record = store.get(key);

    // Initialize or reset if window expired
    if (!record || record.resetTime < now) {
      record = {
        count: 0,
        resetTime: now + config.windowMs,
      };
      store.set(key, record);
    }

    record.count++;

    // Check if limit exceeded
    if (record.count > config.maxRequests) {
      return NextResponse.json(
        {
          ok: false,
          error: config.message || 'Too many requests. Please try again later.',
        },
        {
          status: 429,
          headers: {
            'Retry-After': Math.ceil(
              (record.resetTime - now) / 1000
            ).toString(),
          },
        }
      );
    }

    // Continue to next handler
    return null;
  };
}

/**
 * Pre-configured rate limiters for common scenarios
 */

/**
 * Auth endpoints: 5 requests per 15 minutes per IP
 * (Prevents brute force login/signup attempts)
 */
export const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 5,
  keyGenerator: (req) => getClientIp(req),
  message: 'Too many authentication attempts. Please try again in 15 minutes.',
});

/**
 * API endpoints: 60 requests per minute per user
 * (Prevents API abuse while allowing normal usage)
 */
export const apiLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 60,
  keyGenerator: (req) => getClientIp(req),
  message: 'API rate limit exceeded. Maximum 60 requests per minute.',
});

/**
 * File upload: 10 requests per hour per user
 * (Prevents storage abuse)
 */
export const uploadLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  maxRequests: 10,
  keyGenerator: (req) => getClientIp(req),
  message: 'Upload limit exceeded. Maximum 10 uploads per hour.',
});

/**
 * Extract client IP from request
 * Handles X-Forwarded-For header (common behind reverse proxies)
 */
function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.headers.get('host') || 'unknown';
}
