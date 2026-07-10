/**
 * Rate limiting with an honest durability contract.
 *
 * - When Upstash Redis REST credentials are configured, limits are enforced in
 *   a shared store — they hold ACROSS serverless instances and cold starts.
 *   `durable: true`.
 * - Otherwise we fall back to a per-instance in-memory counter. This still
 *   throttles a single hot instance but resets on scale/restart and does not
 *   coordinate across instances. `durable: false` — we never pretend otherwise.
 *
 * The adapter is edge-compatible (uses `fetch`, no Node-only APIs) so it can run
 * in middleware. Config is via env only:
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

function upstashConfigured(): boolean {
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
    return {
      allowed: true,
      limit,
      remaining: limit - 1,
      resetInMs: windowMs,
      durable: false,
    };
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
  const now = Date.now();
  if (buckets.size < 5000) return;
  for (const [k, v] of buckets) {
    if (v.resetAt <= now) buckets.delete(k);
  }
}

// ---------------------------------------------------------------------------
// Upstash Redis REST (durable, distributed) — fixed window via INCR + PEXPIRE
// ---------------------------------------------------------------------------
async function upstashLimit(opts: RateLimitOptions): Promise<RateLimitResult> {
  const { key, limit, windowMs } = opts;
  const base = process.env.UPSTASH_REDIS_REST_URL!.replace(/\/$/, '');
  const token = process.env.UPSTASH_REDIS_REST_TOKEN!;
  const redisKey = `rl:${key}`;

  // Pipeline: INCR then (only meaningful on first hit) PEXPIRE, then PTTL.
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

  if (!res.ok) {
    throw new Error(`Upstash REST error ${res.status}`);
  }

  const data = (await res.json()) as Array<{ result: number }>;
  const count = Number(data[0]?.result ?? 0);
  let ttl = Number(data[2]?.result ?? windowMs);
  if (!Number.isFinite(ttl) || ttl < 0) ttl = windowMs;

  const remaining = Math.max(0, limit - count);
  return {
    allowed: count <= limit,
    limit,
    remaining,
    resetInMs: ttl,
    durable: true,
  };
}

/**
 * Consume one unit against `key`. Fails OPEN on an unexpected limiter error
 * (a broken limiter must never take down the product), but such errors are
 * logged so they are visible.
 */
export async function rateLimit(
  opts: RateLimitOptions
): Promise<RateLimitResult> {
  if (upstashConfigured()) {
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

/** Exposed for tests to assert the durability contract without hitting network. */
export function isDurable(): boolean {
  return upstashConfigured();
}

/** Test-only: clear the in-memory bucket store between cases. */
export function __resetMemoryBuckets(): void {
  buckets.clear();
}
