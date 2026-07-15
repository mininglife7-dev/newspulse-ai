import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { classifyRoute } from '@/lib/routes';
import { createRateLimiter } from '@/lib/rate-limit';

/**
 * Per-IP rate limiters for the API surface. Instantiated at module scope so
 * state survives across requests within an instance. Writes (/api/workspace)
 * get a tighter budget than reads; /api/health is never limited (uptime
 * probes). In-memory today; see lib/rate-limit.ts for the durable-backend seam.
 */
const WINDOW_MS = 60_000;
const apiLimiter = createRateLimiter({ windowMs: WINDOW_MS, max: 60 });
const writeLimiter = createRateLimiter({ windowMs: WINDOW_MS, max: 20 });

function clientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'anonymous'
  );
}

function rateLimitHeaders(r: {
  limit: number;
  remaining: number;
  resetMs: number;
}): Headers {
  const h = new Headers();
  h.set('X-RateLimit-Limit', String(r.limit));
  h.set('X-RateLimit-Remaining', String(r.remaining));
  h.set('X-RateLimit-Reset', String(Math.ceil(r.resetMs / 1000)));
  return h;
}

/**
 * EURO AI middleware: rate limiting + session refresh + auth routing.
 *
 * Uses @supabase/ssr cookie sessions, so the session the browser client
 * establishes at sign-in is visible here. Route protection is a UX
 * concern — data security is enforced by RLS in the database.
 */
export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const kind = classifyRoute(pathname);

  // --- Rate limit the API surface (except health) before any expensive work.
  let rlHeaders: Headers | null = null;
  if (pathname.startsWith('/api/') && !pathname.startsWith('/api/health')) {
    const scope = pathname.startsWith('/api/workspace') ? 'write' : 'api';
    const limiter = scope === 'write' ? writeLimiter : apiLimiter;
    const result = limiter.check(`${scope}:${clientIp(req)}`);
    rlHeaders = rateLimitHeaders(result);
    if (!result.allowed) {
      const retry = Math.ceil(result.resetMs / 1000);
      rlHeaders.set('Retry-After', String(retry));
      return NextResponse.json(
        { ok: false, error: `Rate limit exceeded. Try again in ${retry}s.` },
        { status: 429, headers: rlHeaders }
      );
    }
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Without Supabase config there are no sessions: public stays reachable,
  // protected traffic goes to sign-in (which will explain the situation).
  if (!url || !key) {
    if (kind === 'protected') return redirectToSignIn(req);
    return withHeaders(NextResponse.next(), rlHeaders);
  }

  let res = NextResponse.next({ request: req });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          req.cookies.set(name, value)
        );
        res = NextResponse.next({ request: req });
        cookiesToSet.forEach(({ name, value, options }) =>
          res.cookies.set(name, value, options)
        );
      },
    },
  });

  // getUser() validates the JWT against Supabase and refreshes expired
  // sessions (writing new cookies via setAll above). Never trust getSession()
  // alone in server code.
  let user = null;
  if (req.cookies.getAll().some((c) => c.name.startsWith('sb-'))) {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  }

  if (kind === 'protected' && !user) return redirectToSignIn(req);
  if (kind === 'auth' && user) {
    return NextResponse.redirect(new URL('/dashboard', req.nextUrl));
  }
  return withHeaders(res, rlHeaders);
}

/** Copy rate-limit headers (if any) onto a response without replacing it. */
function withHeaders(res: NextResponse, headers: Headers | null): NextResponse {
  if (headers) headers.forEach((value, name) => res.headers.set(name, value));
  return res;
}

function redirectToSignIn(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  if (pathname.startsWith('/api/')) {
    return NextResponse.json(
      { ok: false, error: 'Authentication required' },
      { status: 401 }
    );
  }
  const signInUrl = new URL('/auth/signin', req.nextUrl);
  signInUrl.searchParams.set('redirect', pathname);
  return NextResponse.redirect(signInUrl);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static assets:
     * - _next/static, _next/image, favicon.ico, sw.js
     * - icon/opengraph routes are static too but harmless to classify
     */
    '/((?!_next/static|_next/image|favicon.ico|sw.js).*)',
  ],
};
