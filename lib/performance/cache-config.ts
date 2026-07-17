/**
 * Cache Configuration Strategy
 *
 * Defines caching policies for different route types to improve performance.
 * Implements appropriate TTLs based on content volatility and user impact.
 */

export interface CacheConfig {
  maxAge: number; // Cache-Control max-age in seconds
  sMaxAge?: number; // Surrogate Cache-Control (CDN) in seconds
  revalidate?: number | false; // Next.js ISR revalidate in seconds (false = no ISR)
  staleWhileRevalidate?: number; // Cache-Control stale-while-revalidate
}

/**
 * Static Content Routes (Public, Infrequently Updated)
 * - Long cache TTL
 * - Safe to aggressively cache
 */
export const STATIC_ROUTES: Record<string, CacheConfig> = {
  '/': {
    maxAge: 3600, // 1 hour
    sMaxAge: 86400, // 24 hours on CDN
    revalidate: 3600, // ISR: revalidate every hour
    staleWhileRevalidate: 86400, // Serve stale for 24 hours while revalidating
  },
  '/terms': {
    maxAge: 86400, // 24 hours
    sMaxAge: 604800, // 7 days on CDN
    revalidate: 86400,
    staleWhileRevalidate: 604800,
  },
  '/privacy': {
    maxAge: 86400,
    sMaxAge: 604800,
    revalidate: 86400,
    staleWhileRevalidate: 604800,
  },
};

/**
 * Semi-Dynamic Routes (User-Specific but Relatively Stable)
 * - Medium cache TTL
 * - Can use ISR with shorter revalidation
 */
export const SEMI_DYNAMIC_ROUTES: Record<string, CacheConfig> = {
  '/workspace': {
    maxAge: 600, // 10 minutes
    sMaxAge: 1800, // 30 minutes on CDN
    revalidate: 300, // ISR: revalidate every 5 minutes
    staleWhileRevalidate: 3600, // Serve stale for 1 hour
  },
  '/inventory': {
    maxAge: 600,
    sMaxAge: 1800,
    revalidate: 300,
    staleWhileRevalidate: 3600,
  },
  '/assessment': {
    maxAge: 900, // 15 minutes (assessments change less frequently)
    sMaxAge: 3600,
    revalidate: 600, // ISR: revalidate every 10 minutes
    staleWhileRevalidate: 7200,
  },
  '/compliance': {
    maxAge: 1800, // 30 minutes (compliance data is stable)
    sMaxAge: 7200,
    revalidate: 1800,
    staleWhileRevalidate: 86400,
  },
  '/team': {
    maxAge: 600,
    sMaxAge: 1800,
    revalidate: 300,
    staleWhileRevalidate: 3600,
  },
};

/**
 * Dynamic/Real-Time Routes (User-Specific, Frequently Updated)
 * - Short or no cache TTL
 * - Never serve stale
 */
export const DYNAMIC_ROUTES: Record<string, CacheConfig> = {
  '/auth/signin': {
    maxAge: 0, // No cache (security)
    revalidate: false, // No ISR
  },
  '/auth/signup': {
    maxAge: 0,
    revalidate: false,
  },
  '/auth/verify-email': {
    maxAge: 0,
    revalidate: false,
  },
  '/settings': {
    maxAge: 0,
    revalidate: false,
  },
};

/**
 * Generate Cache-Control header value
 */
export function generateCacheControl(config: CacheConfig): string {
  const parts: string[] = [];

  if (config.maxAge === 0) {
    parts.push('no-cache', 'no-store', 'must-revalidate');
  } else {
    parts.push(`max-age=${config.maxAge}`);
    if (config.sMaxAge) {
      parts.push(`s-maxage=${config.sMaxAge}`);
    }
    if (config.staleWhileRevalidate) {
      parts.push(`stale-while-revalidate=${config.staleWhileRevalidate}`);
    }
  }

  return parts.join(', ');
}

/**
 * Helper to get cache config for a route
 */
export function getCacheConfig(pathname: string): CacheConfig | null {
  // Check static routes
  if (pathname in STATIC_ROUTES) {
    return STATIC_ROUTES[pathname];
  }

  // Check semi-dynamic routes
  if (pathname in SEMI_DYNAMIC_ROUTES) {
    return SEMI_DYNAMIC_ROUTES[pathname];
  }

  // Check dynamic routes
  if (pathname in DYNAMIC_ROUTES) {
    return DYNAMIC_ROUTES[pathname];
  }

  // Default: no aggressive caching
  return null;
}
