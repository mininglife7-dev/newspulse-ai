import { NextResponse, type NextRequest } from 'next/server';
import { rateLimit, RATE_LIMIT_MAX } from '@/lib/rateLimit';

export function middleware(req: NextRequest) {
  const url = req.nextUrl;

  // Only apply to API routes that perform expensive work
  const isExpensive = url.pathname.startsWith('/api/search');
  if (!isExpensive) return NextResponse.next();

  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'anonymous';

  const { allowed, remaining, resetIn } = rateLimit(ip);

  const headers = new Headers();
  headers.set('X-RateLimit-Limit', String(RATE_LIMIT_MAX));
  headers.set('X-RateLimit-Remaining', String(remaining));
  headers.set('X-RateLimit-Reset', String(Math.ceil(resetIn / 1000)));

  if (!allowed) {
    return NextResponse.json(
      {
        ok: false,
        error: `Rate limit exceeded. Try again in ${Math.ceil(
          resetIn / 1000
        )}s.`,
      },
      { status: 429, headers }
    );
  }

  const res = NextResponse.next();
  headers.forEach((value, key) => res.headers.set(key, value));
  return res;
}

export const config = {
  matcher: ['/api/search/:path*'],
};
