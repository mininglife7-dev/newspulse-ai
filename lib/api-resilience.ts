/**
 * API Resilience Utilities
 *
 * Common patterns for error handling, retries, timeouts, and graceful degradation.
 * Used by all API routes to ensure consistent, production-grade error handling.
 *
 * Implements:
 * - Request timeout with configurable duration
 * - Exponential backoff retry logic
 * - Circuit breaker for external service failures
 * - Error sanitization (no stack traces to client)
 * - Structured logging for observability
 */

export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'AUTHENTICATION_ERROR'
  | 'AUTHORIZATION_ERROR'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMIT'
  | 'SERVICE_UNAVAILABLE'
  | 'TIMEOUT'
  | 'INTERNAL_ERROR';

export interface ApiErrorResponse {
  ok: false;
  error: string; // User-facing message, sanitized
  code: ApiErrorCode;
  timestamp: string;
  requestId?: string;
}

export interface ApiSuccessResponse<T> {
  ok: true;
  data: T;
  timestamp: string;
}

/**
 * Retry configuration for transient failures
 */
export interface RetryConfig {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableErrors: (error: any) => boolean;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelayMs: 100,
  maxDelayMs: 5000,
  backoffMultiplier: 2,
  retryableErrors: (error: any) => {
    // Retry on timeout, connection errors, 429 (rate limit), 503 (service unavailable)
    if (error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED') return true;
    if (error.status === 429 || error.status === 503) return true;
    return false;
  },
};

/**
 * Execute function with timeout
 * Rejects with TimeoutError if function doesn't complete in time
 */
export async function withTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number,
  label?: string
): Promise<T> {
  return new Promise((resolve, reject) => {
    let completed = false;

    const timer = setTimeout(() => {
      if (!completed) {
        completed = true;
        const message = label ? `${label} timed out after ${timeoutMs}ms` : `Operation timed out after ${timeoutMs}ms`;
        console.warn(`[timeout] ${message}`);
        reject(new Error(message));
      }
    }, timeoutMs);

    fn()
      .then((result) => {
        completed = true;
        clearTimeout(timer);
        resolve(result);
      })
      .catch((error) => {
        completed = true;
        clearTimeout(timer);
        reject(error);
      });
  });
}

/**
 * Retry function with exponential backoff
 * Useful for transient failures (network glitches, temporary service degradation)
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {},
  label?: string
): Promise<T> {
  const cfg = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: any;

  for (let attempt = 1; attempt <= cfg.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === cfg.maxAttempts || !cfg.retryableErrors(error)) {
        // Final attempt or non-retryable error
        throw error;
      }

      // Calculate exponential backoff delay
      const delayMs = Math.min(
        cfg.initialDelayMs * Math.pow(cfg.backoffMultiplier, attempt - 1),
        cfg.maxDelayMs
      );

      console.warn(
        `[retry] Attempt ${attempt}/${cfg.maxAttempts} failed${label ? ` (${label})` : ''}: ${(error as Error).message}. Retrying in ${delayMs}ms...`
      );

      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw lastError;
}

/**
 * Circuit breaker: Stop sending requests to a failing service
 * Useful for external APIs (Firecrawl, OpenAI) that are consistently failing
 *
 * States:
 * - CLOSED: Normal operation, requests flow through
 * - OPEN: Too many failures, requests rejected immediately (fail-fast)
 * - HALF_OPEN: Testing if service recovered, allow 1 request
 */
export class CircuitBreaker {
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime = 0;

  constructor(
    private label: string,
    private failureThreshold = 5, // Trip after 5 failures
    private resetTimeoutMs = 60000 // Try recovery after 1 minute
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.resetTimeoutMs) {
        // Timeout expired, try half-open
        this.state = 'HALF_OPEN';
        this.successCount = 0;
        console.log(`[circuit-breaker] ${this.label} entering HALF_OPEN state`);
      } else {
        // Circuit still open, fail fast
        const error = new Error(
          `[circuit-breaker] ${this.label} is OPEN, failing fast`
        );
        (error as any).code = 'CIRCUIT_OPEN';
        throw error;
      }
    }

    try {
      const result = await fn();

      // Success
      if (this.state === 'HALF_OPEN') {
        this.successCount++;
        if (this.successCount >= 1) {
          // Service recovered
          this.state = 'CLOSED';
          this.failureCount = 0;
          console.log(`[circuit-breaker] ${this.label} recovered, returning to CLOSED`);
        }
      } else if (this.state === 'CLOSED') {
        this.failureCount = Math.max(0, this.failureCount - 1);
      }

      return result;
    } catch (error) {
      // Failure
      this.failureCount++;
      this.lastFailureTime = Date.now();

      if (this.failureCount >= this.failureThreshold && this.state !== 'OPEN') {
        this.state = 'OPEN';
        console.error(
          `[circuit-breaker] ${this.label} tripped after ${this.failureCount} failures, entering OPEN state`
        );
      }

      throw error;
    }
  }

  getState() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      label: this.label,
    };
  }
}

/**
 * Sanitize error for client response
 * Removes sensitive details (stack traces, internal paths, SQL queries)
 */
export function sanitizeErrorForClient(error: any): ApiErrorResponse {
  const errorMessage = (error as Error)?.message || 'An unexpected error occurred';
  const lowerMessage = errorMessage.toLowerCase();

  // Determine error code and appropriate HTTP status
  let code: ApiErrorCode = 'INTERNAL_ERROR';
  let userMessage = 'Something went wrong. Please try again.';

  if (lowerMessage.includes('json')) {
    code = 'VALIDATION_ERROR';
    userMessage = 'Invalid request format';
  } else if (lowerMessage.includes('authentication') || lowerMessage.includes('unauthorized')) {
    code = 'AUTHENTICATION_ERROR';
    userMessage = 'Please sign in to continue';
  } else if (lowerMessage.includes('not found') || lowerMessage.includes('404')) {
    code = 'NOT_FOUND';
    userMessage = 'Resource not found';
  } else if (lowerMessage.includes('already exists') || lowerMessage.includes('409')) {
    code = 'CONFLICT';
    userMessage = 'This resource already exists';
  } else if (lowerMessage.includes('rate limit') || lowerMessage.includes('429')) {
    code = 'RATE_LIMIT';
    userMessage = 'Too many requests. Please wait a moment and try again.';
  } else if (lowerMessage.includes('unavailable') || lowerMessage.includes('503')) {
    code = 'SERVICE_UNAVAILABLE';
    userMessage = 'Service temporarily unavailable. Please try again in a moment.';
  } else if (lowerMessage.includes('timeout') || lowerMessage.includes('timed out')) {
    code = 'TIMEOUT';
    userMessage = 'Request took too long. Please try again.';
  }

  return {
    ok: false,
    error: userMessage,
    code,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Structured logging context
 * Captures request metadata for better debugging
 */
export interface LogContext {
  requestId: string;
  userId?: string;
  endpoint: string;
  method: string;
  timestamp: string;
}

export function createLogContext(req: Request, userId?: string): LogContext {
  return {
    requestId: crypto.randomUUID(),
    userId,
    endpoint: new URL(req.url).pathname,
    method: req.method,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Log error with context
 */
export function logError(
  context: LogContext,
  error: any,
  message: string
) {
  const errorDetails = {
    timestamp: context.timestamp,
    requestId: context.requestId,
    userId: context.userId,
    endpoint: context.endpoint,
    method: context.method,
    message,
    error: (error as Error)?.message || String(error),
  };

  console.error('[api-error]', JSON.stringify(errorDetails));
}

/**
 * Health check for external service
 * Returns true if service is reachable, false if not
 */
export async function healthCheck(url: string, timeoutMs = 5000): Promise<boolean> {
  try {
    const response = await withTimeout(
      () =>
        fetch(url, {
          method: 'HEAD',
          timeout: timeoutMs,
        }),
      timeoutMs
    );
    return response.ok || response.status === 404; // 404 is acceptable (service is up)
  } catch {
    return false;
  }
}

/**
 * Measure and log request duration
 */
export function measureDuration(fn: () => Promise<any>, label: string) {
  return async function() {
    const startMs = Date.now();
    try {
      return await fn();
    } finally {
      const durationMs = Date.now() - startMs;
      if (durationMs > 1000) {
        console.warn(`[performance] ${label} took ${durationMs}ms (slow)`);
      }
    }
  };
}
