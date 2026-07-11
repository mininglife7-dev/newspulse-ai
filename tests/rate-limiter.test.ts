import { describe, it, expect, beforeEach, vi } from 'vitest';
import { checkRateLimit, getRateLimitStatus, cleanupExpiredBuckets, getBucketStats, __clearAllBuckets } from '@/lib/rate-limiter';

describe('rate-limiter', () => {
  beforeEach(() => {
    // Clear any existing state for test isolation
    __clearAllBuckets();
  });

  it('allows requests within limit', () => {
    const key = 'user:123';
    const limit = 10;
    const windowMs = 60000;

    for (let i = 0; i < limit; i++) {
      expect(checkRateLimit(key, limit, windowMs)).toBe(true);
    }
  });

  it('blocks requests exceeding limit', () => {
    const key = 'user:456';
    const limit = 3;
    const windowMs = 60000;

    // Use up the limit
    for (let i = 0; i < limit; i++) {
      checkRateLimit(key, limit, windowMs);
    }

    // Next request should be blocked
    expect(checkRateLimit(key, limit, windowMs)).toBe(false);
  });

  it('resets after time window expires', () => {
    vi.useFakeTimers();
    const key = 'user:789';
    const limit = 2;
    const windowMs = 10000;

    // Use up the limit
    expect(checkRateLimit(key, limit, windowMs)).toBe(true);
    expect(checkRateLimit(key, limit, windowMs)).toBe(true);
    expect(checkRateLimit(key, limit, windowMs)).toBe(false);

    // Advance time past the window
    vi.advanceTimersByTime(windowMs + 1);

    // Should allow requests again
    expect(checkRateLimit(key, limit, windowMs)).toBe(true);

    vi.useRealTimers();
  });

  it('provides rate limit status', () => {
    const key = 'user:status-test';
    const limit = 5;
    const windowMs = 60000;

    // Make 2 requests
    checkRateLimit(key, limit, windowMs);
    checkRateLimit(key, limit, windowMs);

    const status = getRateLimitStatus(key, limit, windowMs);

    expect(status.remaining).toBe(3);
    expect(status.limited).toBe(false);
    expect(status.resetAt).toBeLessThanOrEqual(Date.now() + windowMs);
  });

  it('returns true for rate limited status when exceeded', () => {
    const key = 'user:limited-status';
    const limit = 1;
    const windowMs = 60000;

    checkRateLimit(key, limit, windowMs);
    checkRateLimit(key, limit, windowMs); // This will be blocked

    const status = getRateLimitStatus(key, limit, windowMs);

    expect(status.remaining).toBe(0);
    expect(status.limited).toBe(true);
  });

  it('cleans up expired buckets', () => {
    vi.useFakeTimers();
    const key = 'user:cleanup-test';
    const limit = 5;
    const windowMs = 10000;

    // Create a bucket
    checkRateLimit(key, limit, windowMs);

    let stats = getBucketStats();
    expect(stats.activeBuckets).toBe(1);

    // Advance time past expiration
    vi.advanceTimersByTime(windowMs + 1);

    // Clean up
    const cleaned = cleanupExpiredBuckets();

    expect(cleaned).toBe(1);
    stats = getBucketStats();
    expect(stats.activeBuckets).toBe(0);

    vi.useRealTimers();
  });

  it('tracks multiple independent keys', () => {
    const limit = 3;
    const windowMs = 60000;

    // Fill user 1's limit
    expect(checkRateLimit('user:1', limit, windowMs)).toBe(true);
    expect(checkRateLimit('user:1', limit, windowMs)).toBe(true);
    expect(checkRateLimit('user:1', limit, windowMs)).toBe(true);
    expect(checkRateLimit('user:1', limit, windowMs)).toBe(false); // Limited

    // User 2 makes 2 requests (under limit of 3)
    expect(checkRateLimit('user:2', limit, windowMs)).toBe(true);
    expect(checkRateLimit('user:2', limit, windowMs)).toBe(true);

    // Verify isolation
    const status1 = getRateLimitStatus('user:1', limit, windowMs);
    const status2 = getRateLimitStatus('user:2', limit, windowMs);

    expect(status1.limited).toBe(true); // 3/3 used
    expect(status1.remaining).toBe(0);
    expect(status2.limited).toBe(false); // 2/3 used
    expect(status2.remaining).toBe(1);
  });
});
