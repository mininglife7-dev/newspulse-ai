import { NextResponse, type NextRequest } from 'next/server';

/**
 * Lightweight in-memory rate limiter for API routes.
 * Resets on cold start — fine for hackathon scale. For production, swap
 * for Upstash or Vercel KV.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS = 30;  // per IP per window

function rateLimit(ip: string) {
  const now = Date.now();
  const bucket = buckets.get(ip);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, remaining: MAX_REQUESTS - 1, resetIn: WINDOW_MS };
  }
  bucket.count += 1;
  if (bucket.count > MAX_REQUESTS) {
    return {
      allowed: false,
      remaining: 0,
      resetIn: bucket.resetAt - now,
    };
  }
  return {
    allowed: true,
    remaining: MAX_REQUESTS - bucket.count,
    resetIn: bucket.resetAt - now,
  };
}

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
  headers.set('X-RateLimit-Limit', String(MAX_REQUESTS));
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
