import { NextResponse, type NextRequest } from 'next/server';

/**
 * Lightweight in-memory rate limiter for API routes.
 * Resets on cold start — fine for hackathon scale. For production, swap
 * for Upstash or Vercel KV.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60_000; // 1 minute

// Per-IP request budgets per window, by route class.
// /api/search is expensive (Firecrawl + OpenAI); the rest of the API
// (including the destructive history DELETE endpoints) gets its own
// budget so browsing history never competes with searching.
const LIMITS = {
  search: 30,
  api: 60,
} as const;

function rateLimit(key: string, max: number) {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, remaining: max - 1, resetIn: WINDOW_MS };
  }
  bucket.count += 1;
  if (bucket.count > max) {
    return {
      allowed: false,
      remaining: 0,
      resetIn: bucket.resetAt - now,
    };
  }
  return {
    allowed: true,
    remaining: max - bucket.count,
    resetIn: bucket.resetAt - now,
  };
}

export function middleware(req: NextRequest) {
  const url = req.nextUrl;

  // Health checks are for uptime probes — never rate-limit them.
  if (
    !url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/api/health')
  ) {
    return NextResponse.next();
  }

  const scope = url.pathname.startsWith('/api/search') ? 'search' : 'api';
  const max = LIMITS[scope];

  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'anonymous';

  const { allowed, remaining, resetIn } = rateLimit(`${scope}:${ip}`, max);

  const headers = new Headers();
  headers.set('X-RateLimit-Limit', String(max));
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
  matcher: ['/api/:path*'],
};
