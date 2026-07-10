/**
 * Cache-Control header utilities to prevent data leakage and improve performance.
 */

/**
 * No-store: Prevents sensitive data from being cached anywhere.
 * Use for: User data, auth endpoints, forms.
 */
export const NO_CACHE = 'no-store, must-revalidate, private';

/**
 * Short cache: Cache for 1 minute, revalidate after.
 * Use for: Health checks, status endpoints.
 */
export const CACHE_1_MIN = 'public, max-age=60, must-revalidate';

/**
 * Medium cache: Cache for 5 minutes.
 * Use for: Dashboard, aggregated data.
 */
export const CACHE_5_MIN = 'public, max-age=300, must-revalidate';

/**
 * Long cache: Cache for 1 hour.
 * Use for: Configuration, static data.
 */
export const CACHE_1_HOUR = 'public, max-age=3600, must-revalidate';

export const cacheHeaders = {
  noCache: { 'Cache-Control': NO_CACHE },
  short: { 'Cache-Control': CACHE_1_MIN },
  medium: { 'Cache-Control': CACHE_5_MIN },
  long: { 'Cache-Control': CACHE_1_HOUR },
};
