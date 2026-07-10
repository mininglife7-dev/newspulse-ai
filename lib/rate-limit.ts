/**
 * Simple in-memory rate limiting for API endpoints.
 *
 * For production at scale, integrate with Vercel KV or similar persistent store.
 * Current implementation prevents abuse within a single deployed instance.
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// Store rate limit data in memory (per-process)
// In production: move to Vercel KV, Redis, or similar
const store = new Map<string, RateLimitEntry>();

const RATE_LIMITS = {
  // Aggressive limits on auth/workspace (high-value targets)
  workspace: { requests: 10, windowMs: 60000 }, // 10 req/min
  'ai-systems': { requests: 30, windowMs: 60000 }, // 30 req/min
  auth: { requests: 5, windowMs: 300000 }, // 5 req/5min
  // Lenient limits on safe endpoints
  health: { requests: 60, windowMs: 60000 }, // 60 req/min
};

export interface RateLimitOptions {
  key: string; // Unique identifier (IP, user ID, etc.)
  endpoint: keyof typeof RATE_LIMITS;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
}

export function rateLimit(options: RateLimitOptions): RateLimitResult {
  const { key, endpoint } = options;
  const config = RATE_LIMITS[endpoint];
  const now = Date.now();
  const cacheKey = `${endpoint}:${key}`;

  // Retrieve or initialize entry
  let entry = store.get(cacheKey);
  if (!entry || now > entry.resetTime) {
    entry = {
      count: 0,
      resetTime: now + config.windowMs,
    };
    store.set(cacheKey, entry);
  }

  // Check if under limit
  const allowed = entry.count < config.requests;
  if (allowed) {
    entry.count += 1;
  }

  return {
    allowed,
    limit: config.requests,
    remaining: Math.max(0, config.requests - entry.count),
    resetTime: entry.resetTime,
  };
}

export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(result.resetTime),
    'Retry-After': String(Math.ceil((result.resetTime - Date.now()) / 1000)),
  };
}

// Cleanup: remove old entries every 5 minutes to prevent unbounded memory growth
setInterval(() => {
  const now = Date.now();
  let cleaned = 0;
  for (const [key, entry] of store.entries()) {
    if (now > entry.resetTime) {
      store.delete(key);
      cleaned++;
    }
  }
  if (cleaned > 0) {
    console.log(`[rate-limit] Cleaned ${cleaned} expired entries`);
  }
}, 300000); // 5 minutes
