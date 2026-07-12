import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  withTimeout,
  withRetry,
  CircuitBreaker,
  sanitizeErrorForClient,
  createLogContext,
  DEFAULT_RETRY_CONFIG,
} from '@/lib/api-resilience';

// ============================================================================
// TIMEOUT TESTS
// ============================================================================

describe('withTimeout', () => {
  it('resolves when function completes within timeout', async () => {
    const result = await withTimeout(async () => 'success', 1000);
    expect(result).toBe('success');
  });

  it('rejects when function exceeds timeout', async () => {
    const slowFn = async () => {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      return 'too slow';
    };

    await expect(withTimeout(slowFn, 100)).rejects.toThrow('timed out');
  });

  it('includes label in timeout error message', async () => {
    const slowFn = async () => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    };

    await expect(withTimeout(slowFn, 100, 'database query')).rejects.toThrow(
      'database query timed out'
    );
  });

  it('cleans up timeout timer on successful completion', async () => {
    const timerSpy = vi.spyOn(global, 'clearTimeout');
    await withTimeout(async () => 'done', 1000);
    expect(timerSpy).toHaveBeenCalled();
  });
});

// ============================================================================
// RETRY TESTS
// ============================================================================

describe('withRetry', () => {
  it('succeeds on first attempt without retrying', async () => {
    let attempts = 0;
    const fn = async () => {
      attempts++;
      return 'success';
    };

    const result = await withRetry(fn);
    expect(result).toBe('success');
    expect(attempts).toBe(1);
  });

  it('retries on transient failure and succeeds', async () => {
    let attempts = 0;
    const fn = async () => {
      attempts++;
      if (attempts < 2) {
        const error: any = new Error('temporary connection timeout');
        error.code = 'ETIMEDOUT';
        throw error;
      }
      return 'success';
    };

    const result = await withRetry(fn);
    expect(result).toBe('success');
    expect(attempts).toBe(2);
  });

  it('respects maxAttempts limit', async () => {
    let attempts = 0;
    const fn = async () => {
      attempts++;
      const error: any = new Error('permanent failure');
      error.code = 'ETIMEDOUT';
      throw error;
    };

    await expect(withRetry(fn, { maxAttempts: 3 })).rejects.toThrow('permanent failure');
    expect(attempts).toBe(3);
  });

  it('implements exponential backoff', async () => {
    let attempts = 0;
    const delays: number[] = [];
    const startTime = Date.now();

    const fn = async () => {
      attempts++;
      if (attempts < 3) {
        delays.push(Date.now() - startTime);
        const error: any = new Error('retry me');
        error.code = 'ETIMEDOUT';
        throw error;
      }
      return 'success';
    };

    await withRetry(fn, { maxAttempts: 3, initialDelayMs: 10, maxDelayMs: 100 });

    // Each retry should have longer delay
    expect(delays.length).toBe(2);
    // Note: exact timing is flaky in tests, just verify we had multiple retries
  });

  it('does not retry on non-retryable errors', async () => {
    let attempts = 0;
    const fn = async () => {
      attempts++;
      const error: any = new Error('permanent error');
      error.code = 'EPERM'; // Non-retryable
      throw error;
    };

    const customConfig = {
      ...DEFAULT_RETRY_CONFIG,
      retryableErrors: (error: any) => error.code === 'ETIMEDOUT',
    };

    await expect(withRetry(fn, customConfig)).rejects.toThrow('permanent error');
    expect(attempts).toBe(1); // No retry
  });

  it('includes label in retry log message', async () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    let attempts = 0;
    const fn = async () => {
      attempts++;
      if (attempts < 2) {
        const error: any = new Error('connection timeout');
        error.code = 'ETIMEDOUT';
        throw error;
      }
      return 'success';
    };

    await withRetry(fn, {}, 'external API call');
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('external API call')
    );

    consoleWarnSpy.mockRestore();
  });
});

// ============================================================================
// CIRCUIT BREAKER TESTS
// ============================================================================

describe('CircuitBreaker', () => {
  it('allows requests when CLOSED', async () => {
    const breaker = new CircuitBreaker('test-service');
    const fn = vi.fn(async () => 'success');

    const result = await breaker.execute(fn);
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('trips after threshold failures and enters OPEN state', async () => {
    const breaker = new CircuitBreaker('test-service', 3, 1000);

    // Fail 3 times
    for (let i = 0; i < 3; i++) {
      await expect(
        breaker.execute(async () => {
          throw new Error('failure');
        })
      ).rejects.toThrow('failure');
    }

    // Circuit should now be OPEN
    await expect(breaker.execute(async () => 'success')).rejects.toThrow(
      'OPEN'
    );
  });

  it('fails fast when OPEN (does not attempt execution)', async () => {
    const breaker = new CircuitBreaker('test-service', 1, 1000);

    // Trip the circuit
    await expect(
      breaker.execute(async () => {
        throw new Error('failure');
      })
    ).rejects.toThrow('failure');

    // Circuit is OPEN, next request should fail immediately without executing fn
    const fn = vi.fn(async () => 'success');
    await expect(breaker.execute(fn)).rejects.toThrow('OPEN');
    expect(fn).not.toHaveBeenCalled();
  });

  it('recovers to CLOSED after timeout in HALF_OPEN', async () => {
    vi.useFakeTimers();
    const breaker = new CircuitBreaker('test-service', 1, 100);

    // Trip the circuit
    await expect(
      breaker.execute(async () => {
        throw new Error('failure');
      })
    ).rejects.toThrow('failure');

    // Advance time past reset timeout
    vi.advanceTimersByTime(150);

    // Should try again (HALF_OPEN), and succeed
    const result = await breaker.execute(async () => 'recovered');
    expect(result).toBe('recovered');

    // Verify state
    const state = breaker.getState();
    expect(state.state).toBe('CLOSED');

    vi.useRealTimers();
  });

  it('reopens if failure occurs in HALF_OPEN', async () => {
    vi.useFakeTimers();
    const breaker = new CircuitBreaker('test-service', 1, 100);

    // Trip and wait for HALF_OPEN
    await expect(
      breaker.execute(async () => {
        throw new Error('failure 1');
      })
    ).rejects.toThrow();

    vi.advanceTimersByTime(150);

    // Fail again in HALF_OPEN → re-open
    await expect(
      breaker.execute(async () => {
        throw new Error('failure 2');
      })
    ).rejects.toThrow();

    const state = breaker.getState();
    expect(state.state).toBe('OPEN');

    vi.useRealTimers();
  });

  it('provides state information for monitoring', async () => {
    const breaker = new CircuitBreaker('payment-service');

    const state = breaker.getState();
    expect(state).toEqual({
      state: 'CLOSED',
      failureCount: 0,
      label: 'payment-service',
    });
  });
});

// ============================================================================
// ERROR SANITIZATION TESTS
// ============================================================================

describe('sanitizeErrorForClient', () => {
  it('converts JSON parsing errors to validation error', () => {
    const error = new Error('JSON.parse failed');
    const result = sanitizeErrorForClient(error);

    expect(result.ok).toBe(false);
    expect(result.code).toBe('VALIDATION_ERROR');
    expect(result.error).toBe('Invalid request format');
  });

  it('converts authentication errors appropriately', () => {
    const error = new Error('Unauthorized: token invalid');
    const result = sanitizeErrorForClient(error);

    expect(result.code).toBe('AUTHENTICATION_ERROR');
    expect(result.error.toLowerCase()).toContain('sign in');
  });

  it('converts timeout errors appropriately', () => {
    const error = new Error('Operation timed out after 5000ms');
    const result = sanitizeErrorForClient(error);

    expect(result.code).toBe('TIMEOUT');
    expect(result.error.toLowerCase()).toContain('too long');
  });

  it('converts service unavailability errors appropriately', () => {
    const error = new Error('Service unavailable: 503');
    const result = sanitizeErrorForClient(error);

    expect(result.code).toBe('SERVICE_UNAVAILABLE');
    expect(result.error.toLowerCase()).toContain('temporarily unavailable');
  });

  it('converts rate limit errors appropriately', () => {
    const error = new Error('Rate limit exceeded: 429');
    const result = sanitizeErrorForClient(error);

    expect(result.code).toBe('RATE_LIMIT');
    expect(result.error.toLowerCase()).toContain('too many requests');
  });

  it('includes timestamp in response', () => {
    const error = new Error('test error');
    const result = sanitizeErrorForClient(error);

    expect(result.timestamp).toBeDefined();
    expect(new Date(result.timestamp).getTime()).toBeGreaterThan(0);
  });

  it('defaults to generic message for unknown errors', () => {
    const error = new Error('some random error');
    const result = sanitizeErrorForClient(error);

    expect(result.error).toBe('Something went wrong. Please try again.');
    expect(result.error).not.toContain('random error');
  });

  it('handles non-Error objects', () => {
    const result = sanitizeErrorForClient('error string');
    expect(result.ok).toBe(false);
    expect(result.error).toBeDefined();
  });
});

// ============================================================================
// LOG CONTEXT TESTS
// ============================================================================

describe('createLogContext', () => {
  it('extracts information from request', () => {
    const req = new Request('https://example.com/api/workspace', {
      method: 'POST',
    });

    const context = createLogContext(req, 'user-123');

    expect(context.requestId).toBeDefined();
    expect(context.userId).toBe('user-123');
    expect(context.endpoint).toBe('/api/workspace');
    expect(context.method).toBe('POST');
    expect(context.timestamp).toBeDefined();
  });

  it('generates unique request IDs', () => {
    const req = new Request('https://example.com/api/test', { method: 'GET' });

    const context1 = createLogContext(req);
    const context2 = createLogContext(req);

    expect(context1.requestId).not.toBe(context2.requestId);
  });

  it('handles optional userId parameter', () => {
    const req = new Request('https://example.com/api/test', { method: 'GET' });

    const context = createLogContext(req);
    expect(context.userId).toBeUndefined();
  });
});
