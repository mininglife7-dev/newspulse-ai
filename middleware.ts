import { NextResponse, type NextRequest } from 'next/server';

/**
 * EURO AI Middleware
 * Handles auth routing and API rate limiting
 */

// Protected routes that require authentication
const PROTECTED_ROUTES = ['/dashboard', '/workspace', '/assessment', '/api/workspace'];
const AUTH_ROUTES = ['/auth/signup', '/auth/signin', '/auth/reset'];
const PUBLIC_ROUTES = ['/', '/auth', '/auth/verify-email', '/api/health'];

export function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const pathname = url.pathname;
  const sessionToken = req.cookies.get('supabase-auth-token');

  // Public routes - always allow
  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Auth routes - redirect to dashboard if already authenticated
  if (AUTH_ROUTES.some((route) => pathname.startsWith(route))) {
    if (sessionToken) {
      return NextResponse.redirect(new URL('/dashboard', url));
    }
    return NextResponse.next();
  }

  // Protected routes - redirect to signin if not authenticated
  if (PROTECTED_ROUTES.some((route) => pathname.startsWith(route))) {
    if (!sessionToken) {
      const signInUrl = new URL('/auth/signin', url);
      signInUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(signInUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
