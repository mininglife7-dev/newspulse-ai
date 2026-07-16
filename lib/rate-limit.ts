import { NextRequest, NextResponse } from 'next/server';
import { logger } from './logger';

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  keyGenerator?: (req: NextRequest) => string; // Function to generate rate limit key
}

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

// Simple in-memory store (suitable for single instance deployment)
// For distributed deployments, use Redis instead
const store: RateLimitStore = {};

// Cleanup old entries every 5 minutes
setInterval(
  () => {
    const now = Date.now();
    Object.keys(store).forEach((key) => {
      if (store[key].resetTime < now) {
        delete store[key];
      }
    });
  },
  5 * 60 * 1000
);

export function createRateLimiter(config: RateLimitConfig) {
  const { windowMs, maxRequests, keyGenerator } = config;

  return async (req: NextRequest): Promise<NextResponse | null> => {
    const key = keyGenerator ? keyGenerator(req) : req.ip || 'unknown';
    const now = Date.now();

    // Initialize or reset if window expired
    if (!store[key] || store[key].resetTime < now) {
      store[key] = {
        count: 0,
        resetTime: now + windowMs,
      };
    }

    store[key].count++;

    if (store[key].count > maxRequests) {
      const retryAfter = Math.ceil((store[key].resetTime - now) / 1000);

      logger.warn('Rate limit exceeded', {
        key,
        limit: maxRequests,
        window: `${windowMs}ms`,
        retryAfter,
      });

      return NextResponse.json(
        {
          ok: false,
          error: 'Too many requests. Please try again later.',
        },
        {
          status: 429,
          headers: {
            'Retry-After': retryAfter.toString(),
            'X-RateLimit-Limit': maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': store[key].resetTime.toString(),
          },
        }
      );
    }

    // Return null to allow request to proceed
    return null;
  };
}

// Generate key based on user ID if authenticated, fallback to IP
export function userOrIpKeyGenerator(req: NextRequest): string {
  // Try to extract user ID from auth header or cookies
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    // Extract user ID from token (first segment before .)
    const userId = authHeader.substring(7).split('.')[0];
    if (userId) return `user:${userId}`;
  }

  // Fallback to IP address
  return `ip:${req.ip || 'unknown'}`;
}

// Predefined rate limits

// Lenient: for authenticated users on read operations
export const leniently = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100,
  keyGenerator: userOrIpKeyGenerator,
});

// Standard: for most API operations
export const standardLimit = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 30,
  keyGenerator: userOrIpKeyGenerator,
});

// Strict: for authentication attempts
export const strictLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5,
  keyGenerator: (req) => `auth:${req.ip || 'unknown'}`,
});

// Per-workspace: for resource-intensive operations
export const workspaceLimit = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10,
  keyGenerator: (req) => {
    const workspaceId = req.nextUrl.searchParams.get('workspace_id');
    return `workspace:${workspaceId || 'unknown'}`;
  },
});
