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
  '/assessments',
  '/inventory',
  '/api/workspace',
  '/api/ai-systems',
  '/api/assessments',
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
