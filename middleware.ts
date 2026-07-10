import { NextResponse, type NextRequest } from 'next/server';
import { rateLimit } from '@/lib/rate-limit';

/**
 * Rate limiter for API routes.
 *
 * Uses a durable-capable backend (lib/rate-limit): when Upstash Redis is
 * configured the limit holds ACROSS serverless instances — which is what
 * actually protects our paid Firecrawl/OpenAI spend from a distributed abuser.
 * Without Upstash it falls back to the previous per-instance in-memory counter
 * (honestly reported as non-durable at /api/health).
 */
const WINDOW_MS = 60_000; // 1 minute

// Per-IP request budgets per window, by route class.
// /api/search is expensive (Firecrawl + OpenAI); the rest of the API
// (including the destructive history DELETE endpoints) gets its own budget so
// browsing history never competes with searching.
const LIMITS = {
  search: 30,
  api: 60,
} as const;

export async function middleware(req: NextRequest) {
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

  const result = await rateLimit({
    key: `${scope}:${ip}`,
    limit: max,
    windowMs: WINDOW_MS,
  });

  const headers = new Headers();
  headers.set('X-RateLimit-Limit', String(max));
  headers.set('X-RateLimit-Remaining', String(result.remaining));
  headers.set('X-RateLimit-Reset', String(Math.ceil(result.resetInMs / 1000)));
  headers.set('X-RateLimit-Durable', String(result.durable));

  if (!result.allowed) {
    return NextResponse.json(
      {
        ok: false,
        error: `Rate limit exceeded. Try again in ${Math.ceil(
          result.resetInMs / 1000
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
