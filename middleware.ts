import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { rateLimit, type RateLimitResult } from '@/lib/rate-limit';

/**
 * Edge middleware responsibilities:
 *   1. Refresh the Supabase auth session on every request (keeps logins alive).
 *   2. Protect per-customer pages (redirect to /login when signed out).
 *   3. Rate-limit expensive/abusable routes, keyed by customer when known and
 *      by IP otherwise — protecting our paid AI/search spend.
 *
 * Route-handler code performs its own authorization too (defense in depth);
 * middleware is the first, cheapest gate.
 */

// Pages that require a signed-in customer.
const PROTECTED_PAGES = ['/history'];

// Per-window limits (window = 60s).
const WINDOW_MS = 60_000;
const LIMIT_SEARCH_AUTHED = 30; // signed-in customers
const LIMIT_SEARCH_ANON = 10; // anonymous demo users — tighter, protects spend
const LIMIT_API_DEFAULT = 60; // other API routes

function clientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'anonymous'
  );
}

function withRateLimitHeaders(res: NextResponse, r: RateLimitResult) {
  res.headers.set('X-RateLimit-Limit', String(r.limit));
  res.headers.set('X-RateLimit-Remaining', String(r.remaining));
  res.headers.set('X-RateLimit-Reset', String(Math.ceil(r.resetInMs / 1000)));
  res.headers.set('X-RateLimit-Durable', String(r.durable));
  return res;
}

// Copy Supabase's refreshed auth cookies onto a response we build ourselves
// (redirect / 429), so the session is never dropped.
function copyCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((c) => to.cookies.set(c));
  return to;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const { response, user } = await updateSession(req);

  // --- Page protection ------------------------------------------------------
  if (
    PROTECTED_PAGES.some((p) => pathname === p || pathname.startsWith(p + '/'))
  ) {
    if (!user) {
      const loginUrl = req.nextUrl.clone();
      loginUrl.pathname = '/login';
      loginUrl.search = `?redirect=${encodeURIComponent(pathname)}`;
      return copyCookies(response, NextResponse.redirect(loginUrl));
    }
  }

  // --- Rate limiting for expensive / mutating API routes --------------------
  const isSearch = pathname.startsWith('/api/search');
  const isHistoryApi = pathname.startsWith('/api/history');

  if (isSearch || isHistoryApi) {
    const identity = user ? `user:${user.id}` : `ip:${clientIp(req)}`;
    const limit = isSearch
      ? user
        ? LIMIT_SEARCH_AUTHED
        : LIMIT_SEARCH_ANON
      : LIMIT_API_DEFAULT;

    const result = await rateLimit({
      key: `${identity}:${isSearch ? 'search' : 'history'}`,
      limit,
      windowMs: WINDOW_MS,
    });

    if (!result.allowed) {
      const retryAfter = Math.ceil(result.resetInMs / 1000);
      const res = NextResponse.json(
        {
          ok: false,
          error: `Rate limit exceeded. Try again in ${retryAfter}s.`,
        },
        { status: 429 }
      );
      res.headers.set('Retry-After', String(retryAfter));
      withRateLimitHeaders(res, result);
      return copyCookies(response, res);
    }

    withRateLimitHeaders(response, result);
  }

  return response;
}

export const config = {
  // Run on everything except static assets and image files (so sessions refresh
  // on real navigations, and the API routes above are covered).
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|opengraph-image|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
