/**
 * Rate limiting with an honest durability contract.
 *
 * - When Upstash Redis REST credentials are configured, limits are enforced in
 *   a shared store — they hold ACROSS serverless instances and cold starts.
 *   `durable: true`. This is what actually protects paid Firecrawl/OpenAI spend
 *   from a distributed abuser, which a per-instance in-memory counter cannot.
 * - Otherwise we fall back to a per-instance in-memory counter (the previous
 *   behavior). It still throttles a single hot instance but resets on
 *   scale/restart and does not coordinate across instances. `durable: false` —
 *   we never pretend otherwise (surfaced at /api/health).
 *
 * Edge-compatible (uses `fetch`, no Node-only APIs). Config is via env only:
 *   UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN
 */

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetInMs: number;
  /** True only when a shared/distributed store actually backs the counter. */
  durable: boolean;
}

export interface RateLimitOptions {
  key: string;
  limit: number;
  windowMs: number;
}

export function isDurable(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  );
}

// ---------------------------------------------------------------------------
// In-memory fallback (per-instance, not durable)
// ---------------------------------------------------------------------------
const buckets = new Map<string, { count: number; resetAt: number }>();

function memoryLimit(opts: RateLimitOptions): RateLimitResult {
  const { key, limit, windowMs } = opts;
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, limit, remaining: limit - 1, resetInMs: windowMs, durable: false };
  }

  bucket.count += 1;
  const remaining = Math.max(0, limit - bucket.count);
  return {
    allowed: bucket.count <= limit,
    limit,
    remaining,
    resetInMs: bucket.resetAt - now,
    durable: false,
  };
}

// Opportunistic cleanup so the Map can't grow unbounded on a long-lived instance.
function sweepMemory() {
  if (buckets.size < 5000) return;
  const now = Date.now();
  for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k);
}

// ---------------------------------------------------------------------------
// Upstash Redis REST (durable) — fixed window via INCR + PEXPIRE(NX) + PTTL
// ---------------------------------------------------------------------------
async function upstashLimit(opts: RateLimitOptions): Promise<RateLimitResult> {
  const { key, limit, windowMs } = opts;
  const base = process.env.UPSTASH_REDIS_REST_URL!.replace(/\/$/, '');
  const token = process.env.UPSTASH_REDIS_REST_TOKEN!;
  const redisKey = `rl:${key}`;

  const res = await fetch(`${base}/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([
      ['INCR', redisKey],
      ['PEXPIRE', redisKey, String(windowMs), 'NX'],
      ['PTTL', redisKey],
    ]),
    cache: 'no-store',
  });

  if (!res.ok) throw new Error(`Upstash REST error ${res.status}`);

  const data = (await res.json()) as Array<{ result: number }>;
  const count = Number(data[0]?.result ?? 0);
  let ttl = Number(data[2]?.result ?? windowMs);
  if (!Number.isFinite(ttl) || ttl < 0) ttl = windowMs;

  return {
    allowed: count <= limit,
    limit,
    remaining: Math.max(0, limit - count),
    resetInMs: ttl,
    durable: true,
  };
}

/**
 * Consume one unit against `key`. Fails OPEN on an unexpected limiter error
 * (a broken limiter must never take down the product), but logs it.
 */
export async function rateLimit(opts: RateLimitOptions): Promise<RateLimitResult> {
  if (isDurable()) {
    try {
      return await upstashLimit(opts);
    } catch (err) {
      console.error('[rate-limit] Upstash error, failing open:', err);
      return {
        allowed: true,
        limit: opts.limit,
        remaining: opts.limit,
        resetInMs: opts.windowMs,
        durable: false,
      };
    }
  }
  sweepMemory();
  return memoryLimit(opts);
}

/** Test-only: clear the in-memory bucket store between cases. */
export function __resetMemoryBuckets(): void {
  buckets.clear();
}
