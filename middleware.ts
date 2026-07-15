import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { classifyRoute } from '@/lib/routes';
import { corsHeaders, handleCorsPrelight, isCorsAllowed } from '@/lib/cors-config';
import { checkRateLimit, getRateLimitStatus } from '@/lib/global-rate-limiter';

/**
 * EURO AI middleware: session refresh + auth routing + rate limiting + CORS.
 *
 * Uses @supabase/ssr cookie sessions, so the session the browser client
 * establishes at sign-in is visible here. Route protection is a UX
 * concern — data security is enforced by RLS in the database.
 */
export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const kind = classifyRoute(pathname);

  // Handle CORS preflight (OPTIONS) requests for API routes
  if (req.method === 'OPTIONS' && pathname.startsWith('/api/')) {
    return new NextResponse(null, {
      status: 200,
      headers: corsHeaders(req),
    });
  }

  // Check CORS policy for all API routes
  if (pathname.startsWith('/api/')) {
    if (!isCorsAllowed(req)) {
      const corsResponse = new NextResponse(
        JSON.stringify({
          ok: false,
          error: 'CORS policy violation',
        }),
        {
          status: 403,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      corsResponse.headers.set('Access-Control-Allow-Origin', '');
      return corsResponse;
    }
  }

  // Check rate limit for public API routes (protected and auth routes checked separately in their handlers)
  if (pathname.startsWith('/api/') && kind === 'public') {
    if (!checkRateLimit(req)) {
      const status = getRateLimitStatus(req);
      const rateLimitResponse = new NextResponse(
        JSON.stringify({
          ok: false,
          error: 'Rate limit exceeded',
          retryAfter: status.retryAfter,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(status.retryAfter || 60),
          },
        }
      );
      // Add CORS headers even to rate limit responses
      const corsHeadersMap = corsHeaders(req);
      Object.entries(corsHeadersMap).forEach(([key, value]) => {
        if (value) {
          rateLimitResponse.headers.set(key, value);
        }
      });
      return rateLimitResponse;
    }
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Without Supabase config there are no sessions: public stays reachable,
  // protected traffic goes to sign-in (which will explain the situation).
  if (!url || !key) {
    if (kind === 'protected') return redirectToSignIn(req);
    return NextResponse.next();
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

  // Add CORS headers to all API responses
  if (pathname.startsWith('/api/')) {
    Object.entries(corsHeaders(req)).forEach(([key, value]) => {
      if (value) {
        res.headers.set(key, value);
      }
    });
  }

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
