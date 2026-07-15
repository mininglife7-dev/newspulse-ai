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
  '/api/workspace',
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
 * Open-redirect guard for post-auth `?redirect=` / `?next=` targets.
 *
 * Returns the value only if it is a same-origin *path* — it must start with a
 * single "/" and not "/\" or "//" (protocol-relative URLs that browsers treat
 * as absolute, e.g. "//evil.com"). Anything else (absolute URLs, backslash
 * tricks, empty) falls back to `fallback`. Centralizing this means every
 * redirect entry point (sign-in, email confirm) shares one audited rule.
 */
export function safeInternalPath(
  value: string | null | undefined,
  fallback = '/dashboard'
): string {
  if (typeof value !== 'string') return fallback;
  if (!value.startsWith('/')) return fallback;
  // Reject protocol-relative ("//host") and backslash-smuggled ("/\host").
  if (value.startsWith('//') || value.startsWith('/\\')) return fallback;
  return value;
}
