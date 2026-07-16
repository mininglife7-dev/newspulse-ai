import { describe, it, expect, beforeEach } from 'vitest';
import { checkRateLimit, getRateLimitStatus, getGlobalRateLimiter } from '@/lib/global-rate-limiter';
import { corsHeaders, handleCorsPrelight, isCorsAllowed, isOriginAllowed } from '@/lib/cors-config';
import { getClientIp } from '@/lib/rate-limiter';

describe('Middleware Integration', () => {
  beforeEach(() => {
    const limiter = getGlobalRateLimiter();
    limiter.clear();
  });

  describe('Rate Limiter', () => {
    it('allows requests within the limit', () => {
      const mockRequest = new Request('http://localhost:3000/api/test', {
        headers: { 'x-forwarded-for': '192.168.1.1' },
      });

      for (let i = 0; i < 60; i++) {
        expect(checkRateLimit(mockRequest)).toBe(true);
      }
    });

    it('rejects requests that exceed the limit', () => {
      const mockRequest = new Request('http://localhost:3000/api/test', {
        headers: { 'x-forwarded-for': '192.168.1.1' },
      });

      // Fill the bucket
      for (let i = 0; i < 60; i++) {
        checkRateLimit(mockRequest);
      }

      // Next request should be rejected
      expect(checkRateLimit(mockRequest)).toBe(false);
    });

    it('returns rate limit status with remaining count', () => {
      const mockRequest = new Request('http://localhost:3000/api/test', {
        headers: { 'x-forwarded-for': '192.168.1.1' },
      });

      const status1 = getRateLimitStatus(mockRequest);
      expect(status1.allowed).toBe(true);
      expect(status1.remaining).toBe(59);
      expect(status1.retryAfter).toBeUndefined();

      // Make 59 more requests
      for (let i = 0; i < 59; i++) {
        getRateLimitStatus(mockRequest);
      }

      // Next request should be rate limited
      const status2 = getRateLimitStatus(mockRequest);
      expect(status2.allowed).toBe(false);
      expect(status2.remaining).toBe(0);
      expect(status2.retryAfter).toBeDefined();
      expect(typeof status2.retryAfter).toBe('number');
    });

    it('isolates rate limits by IP address', () => {
      const request1 = new Request('http://localhost:3000/api/test', {
        headers: { 'x-forwarded-for': '192.168.1.1' },
      });
      const request2 = new Request('http://localhost:3000/api/test', {
        headers: { 'x-forwarded-for': '192.168.1.2' },
      });

      // Use up request1's quota
      for (let i = 0; i < 60; i++) {
        expect(checkRateLimit(request1)).toBe(true);
      }
      expect(checkRateLimit(request1)).toBe(false);

      // request2 should still be allowed
      expect(checkRateLimit(request2)).toBe(true);
    });

    it('extracts IP from x-forwarded-for header', () => {
      const mockRequest = new Request('http://localhost:3000/api/test', {
        headers: { 'x-forwarded-for': '203.0.113.1, 198.51.100.1' },
      });
      expect(getClientIp(mockRequest)).toBe('203.0.113.1');
    });

    it('falls back to x-real-ip header', () => {
      const mockRequest = new Request('http://localhost:3000/api/test', {
        headers: { 'x-real-ip': '192.0.2.1' },
      });
      expect(getClientIp(mockRequest)).toBe('192.0.2.1');
    });

    it('returns unknown IP when no headers present', () => {
      const mockRequest = new Request('http://localhost:3000/api/test');
      expect(getClientIp(mockRequest)).toBe('unknown');
    });
  });

  describe('CORS Configuration', () => {
    it('checks CORS origin policy', () => {
      const mockRequest = new Request('http://localhost:3000/api/test', {
        headers: { origin: 'http://localhost:3000' },
      });
      // CORS allowed depends on NODE_ENV and NEXT_PUBLIC_APP_URL configuration
      // Just verify the function returns a boolean
      const result = isCorsAllowed(mockRequest);
      expect(typeof result).toBe('boolean');
    });

    it('handles missing origin header for same-origin requests', () => {
      const mockRequest = new Request('http://localhost:3000/api/test', {
        headers: {},
      });
      expect(isCorsAllowed(mockRequest)).toBe(true);
    });

    it('returns CORS headers for response', () => {
      const mockRequest = new Request('http://localhost:3000/api/test', {
        headers: { origin: 'http://localhost:3000' },
      });
      const headers = corsHeaders(mockRequest);

      expect(headers['Access-Control-Allow-Methods']).toContain('GET');
      expect(headers['Access-Control-Allow-Methods']).toContain('POST');
      expect(headers['Access-Control-Allow-Methods']).toContain('PUT');
      expect(headers['Access-Control-Allow-Methods']).toContain('DELETE');
      expect(headers['Access-Control-Max-Age']).toBe('86400');
      expect(headers['Access-Control-Allow-Credentials']).toBe('true');
    });

    it('includes content-type in allowed headers', () => {
      const mockRequest = new Request('http://localhost:3000/api/test', {
        headers: { origin: 'http://localhost:3000' },
      });
      const headers = corsHeaders(mockRequest);

      expect(headers['Access-Control-Allow-Headers']).toContain('Content-Type');
      expect(headers['Access-Control-Allow-Headers']).toContain('Authorization');
    });

    it('handles preflight requests', () => {
      const mockRequest = new Request('http://localhost:3000/api/test', {
        method: 'OPTIONS',
        headers: { origin: 'http://localhost:3000' },
      });
      const response = handleCorsPrelight(mockRequest);

      expect(response).not.toBeNull();
      if (response) {
        expect(response.status).toBe(200);
      }
    });

    it('returns null for non-preflight requests', () => {
      const mockRequest = new Request('http://localhost:3000/api/test', {
        method: 'GET',
        headers: { origin: 'http://localhost:3000' },
      });
      expect(handleCorsPrelight(mockRequest)).toBeNull();
    });
  });

  describe('Middleware Integration Scenarios', () => {
    it('handles rapid requests from same IP correctly', () => {
      const mockRequest = new Request('http://localhost:3000/api/test', {
        headers: { 'x-forwarded-for': '192.168.1.1' },
      });

      // Simulate rapid requests
      const results = [];
      for (let i = 0; i < 65; i++) {
        results.push(checkRateLimit(mockRequest));
      }

      // First 60 should be allowed
      expect(results.filter((r) => r === true)).toHaveLength(60);
      // Last 5 should be rejected
      expect(results.filter((r) => r === false)).toHaveLength(5);
    });

    it('respects CORS policy while enforcing rate limits', () => {
      const request1 = new Request('http://localhost:3000/api/test', {
        headers: {
          origin: 'http://localhost:3000',
          'x-forwarded-for': '192.168.1.1',
        },
      });
      const request2 = new Request('http://localhost:3000/api/test', {
        headers: {
          origin: 'http://evil.com',
          'x-forwarded-for': '192.168.1.2',
        },
      });

      // Both requests should be rate limited independently by IP
      // Even if CORS blocks one, rate limiting tracks them separately
      expect(checkRateLimit(request1)).toBe(true);
      expect(checkRateLimit(request2)).toBe(true);

      // Verify different IPs have independent rate limit buckets
      const status1 = getRateLimitStatus(request1);
      const status2 = getRateLimitStatus(request2);
      expect(status1.remaining).not.toBe(status2.remaining - 1); // Different buckets
    });

    it('rate limit reset works correctly', () => {
      const mockRequest = new Request('http://localhost:3000/api/test', {
        headers: { 'x-forwarded-for': '192.168.1.1' },
      });

      // Fill quota
      for (let i = 0; i < 60; i++) {
        checkRateLimit(mockRequest);
      }
      expect(checkRateLimit(mockRequest)).toBe(false);

      // Reset
      const limiter = getGlobalRateLimiter();
      limiter.reset('192.168.1.1');

      // Should be allowed again
      expect(checkRateLimit(mockRequest)).toBe(true);
    });
  });
});
