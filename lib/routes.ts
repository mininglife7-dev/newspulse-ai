/**
 * Route classification for auth middleware.
 * Pure logic, unit-tested in tests/routes.test.ts.
 */

export type RouteKind = 'public' | 'auth' | 'protected';

/** Routes that require an authenticated session. */
const PROTECTED_PREFIXES = [
  '/dashboard',
  '/workspace',
  '/assessment',
  '/inventory',
  // Internal governance/telemetry dashboards — not for anonymous visitors.
  '/governance',
  '/evolution',
  '/api/workspace',
  '/api/ai-systems',
  '/api/assessments',
  '/api/obligations',
  '/api/reports',
  // Browser-consumed governance/telemetry data (launch readiness, CEIS).
  // NOTE: exact sub-paths only — /api/ceis/run is cron-authenticated and must
  // stay reachable by the scheduler, so we do NOT protect the /api/ceis root.
  '/api/dashboard',
  '/api/ceis/dashboard',
];

/** Auth screens: send already-authenticated users to the dashboard. */
const AUTH_PREFIXES = ['/auth/signin', '/auth/signup', '/auth/reset'];

function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function classifyRoute(pathname: string): RouteKind {
  if (AUTH_PREFIXES.some((p) => matchesPrefix(pathname, p))) return 'auth';
  if (PROTECTED_PREFIXES.some((p) => matchesPrefix(pathname, p)))
    return 'protected';
  return 'public';
}

/**
 * Sanitize a post-auth `redirect`/`next` value into a safe **same-origin
 * path**, or fall back to `/dashboard`.
 *
 * A naive `startsWith('/') && !startsWith('//')` guard is NOT enough: the
 * WHATWG URL parser normalizes backslashes to slashes for http(s), so
 * `"/\evil.com"` passes that guard yet `new URL()` resolves it to
 * `https://evil.com`. This resolves the candidate against a throwaway origin
 * and rejects anything that escapes it (different origin, protocol-relative,
 * scheme, backslash, or control characters), returning only the in-origin
 * path+query+hash.
 */
export function safeRedirectPath(
  value: string | null | undefined,
  fallback = '/dashboard'
): string {
  if (!value || typeof value !== 'string') return fallback;
  // Must be a root-relative path and contain no backslashes or control chars.
  if (value[0] !== '/') return fallback;
  if (/[\\\x00-\x1f\x7f]/.test(value)) return fallback;
  if (value.startsWith('//')) return fallback;

  const SENTINEL = 'https://newspulse.internal.invalid';
  try {
    const resolved = new URL(value, SENTINEL);
    if (resolved.origin !== SENTINEL) return fallback;
    return `${resolved.pathname}${resolved.search}${resolved.hash}`;
  } catch {
    return fallback;
  }
}
