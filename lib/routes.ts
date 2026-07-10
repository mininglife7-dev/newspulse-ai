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
  '/api/workspace',
  '/api/ai-systems',
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

// Sentinel origin used only to resolve candidate paths for the open-redirect
// check. Its exact value is irrelevant — it just has to be an origin the app
// never lives on, so any candidate that resolves *away* from it is external.
const REDIRECT_SENTINEL_ORIGIN = 'https://euro-ai.invalid';

/**
 * Sanitize a post-auth `redirect` / `next` target so it can only ever point
 * back into this app. Returns the cleaned same-origin path, or `fallback`.
 *
 * A naive guard like `v.startsWith('/') && !v.startsWith('//')` is NOT enough:
 * the WHATWG URL parser normalizes backslashes to slashes for http(s) URLs, so
 * `"/\\evil.com"` slips past the string check yet `new URL()` resolves it to
 * `https://evil.com` — an open redirect. Resolving against a sentinel origin
 * and comparing origins closes that class of bypass entirely (`//host`,
 * `/\host`, `/\\host`, tab/newline-obfuscated authorities, …).
 */
export function safeRedirectPath(
  value: string | null | undefined,
  fallback = '/dashboard'
): string {
  if (!value || value[0] !== '/') return fallback;
  try {
    const resolved = new URL(value, REDIRECT_SENTINEL_ORIGIN);
    if (resolved.origin !== REDIRECT_SENTINEL_ORIGIN) return fallback;
    return resolved.pathname + resolved.search + resolved.hash;
  } catch {
    return fallback;
  }
}
