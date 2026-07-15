/**
 * GitHub API Retry Logic
 *
 * Implements exponential backoff and retry logic for GitHub API calls.
 * Handles rate limiting (429), transient errors (5xx), and timeouts.
 *
 * Usage:
 *   import { retryGitHubCall } from '@/lib/github-retry';
 *
 *   const result = await retryGitHubCall(async () => {
 *     return await github.getLatestCommit(owner, repo);
 *   });
 */

export interface RetryConfig {
  maxRetries?: number; // Default: 3
  initialDelayMs?: number; // Default: 100ms
  maxDelayMs?: number; // Default: 5000ms
  backoffMultiplier?: number; // Default: 2
  timeoutMs?: number; // Default: 30000ms
}

export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  attempts: number;
  lastStatusCode?: number;
}

/**
 * Determine if error is retryable
 */
function isRetryableError(error: any, statusCode?: number): boolean {
  // Rate limit errors
  if (statusCode === 429) return true;

  // Server errors (5xx)
  if (statusCode && statusCode >= 500) return true;

  // Timeout errors
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (message.includes('timeout') || message.includes('econnreset') || message.includes('enotfound')) {
      return true;
    }
  }

  return false;
}

/**
 * Extract status code from GitHub API error
 */
function getStatusCode(error: any): number | undefined {
  // Octokit error structure
  if (error?.response?.status) {
    return error.response.status;
  }

  // Fetch API error structure
  if (error?.status) {
    return error.status;
  }

  return undefined;
}

/**
 * Extract retry-after header value
 */
function getRetryAfter(error: any): number | undefined {
  const retryAfter =
    error?.response?.headers?.['retry-after'] || error?.headers?.['retry-after'];

  if (retryAfter) {
    const seconds = parseInt(retryAfter, 10);
    return isNaN(seconds) ? undefined : seconds * 1000;
  }

  return undefined;
}

/**
 * Calculate delay with exponential backoff
 */
function calculateDelay(
  attempt: number,
  config: Required<RetryConfig>,
  retryAfter?: number
): number {
  // Respect Retry-After header if present
  if (retryAfter) {
    return Math.min(retryAfter, config.maxDelayMs);
  }

  // Exponential backoff: initialDelay * (multiplier ^ attempt)
  const exponentialDelay = config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt);
  const delay = Math.min(exponentialDelay, config.maxDelayMs);

  // Add jitter (±10%) to prevent thundering herd
  const jitter = delay * 0.1 * (Math.random() * 2 - 1);
  return Math.max(0, delay + jitter);
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute function with exponential backoff retry logic
 */
export async function retryGitHubCall<T>(
  fn: () => Promise<T>,
  config: RetryConfig = {}
): Promise<RetryResult<T>> {
  const finalConfig: Required<RetryConfig> = {
    maxRetries: config.maxRetries ?? 3,
    initialDelayMs: config.initialDelayMs ?? 100,
    maxDelayMs: config.maxDelayMs ?? 5000,
    backoffMultiplier: config.backoffMultiplier ?? 2,
    timeoutMs: config.timeoutMs ?? 30000,
  };

  let lastError: Error | undefined;
  let lastStatusCode: number | undefined;

  for (let attempt = 0; attempt <= finalConfig.maxRetries; attempt++) {
    try {
      // Wrap in timeout promise
      const timeoutPromise = new Promise<T>((_, reject) => {
        setTimeout(() => reject(new Error('GitHub API call timeout')), finalConfig.timeoutMs);
      });

      const result = await Promise.race([fn(), timeoutPromise]);
      return { success: true, data: result, attempts: attempt + 1 };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      lastStatusCode = getStatusCode(error);

      // Not retryable, return error immediately
      if (!isRetryableError(error, lastStatusCode)) {
        return {
          success: false,
          error: lastError,
          attempts: attempt + 1,
          lastStatusCode,
        };
      }

      // Max retries exhausted
      if (attempt >= finalConfig.maxRetries) {
        return {
          success: false,
          error: lastError,
          attempts: attempt + 1,
          lastStatusCode,
        };
      }

      // Wait before retrying
      const retryAfter = getRetryAfter(error);
      const delay = calculateDelay(attempt, finalConfig, retryAfter);
      await sleep(delay);
    }
  }

  // Should not reach here
  return {
    success: false,
    error: lastError || new Error('Unknown error'),
    attempts: finalConfig.maxRetries + 1,
    lastStatusCode,
  };
}

/**
 * Batch GitHub API calls with rate limit respect
 */
export async function batchGitHubCalls<T>(
  fns: Array<() => Promise<T>>,
  config: RetryConfig = {}
): Promise<RetryResult<T>[]> {
  const results: RetryResult<T>[] = [];

  for (const fn of fns) {
    const result = await retryGitHubCall(fn, config);
    results.push(result);

    // If rate limited, back off significantly before next call
    if (result.lastStatusCode === 429) {
      await sleep(5000); // Wait 5 seconds before next call
    }
  }

  return results;
}

/**
 * Example usage patterns
 *
 * Basic retry:
 *   const result = await retryGitHubCall(() => octokit.repos.getLatestRelease({ owner, repo }));
 *   if (!result.success) throw result.error;
 *
 * Custom config:
 *   const result = await retryGitHubCall(
 *     () => octokit.repos.listReleases({ owner, repo }),
 *     { maxRetries: 5, initialDelayMs: 500 }
 *   );
 *
 * Batch calls:
 *   const results = await batchGitHubCalls([
 *     () => octokit.repos.getLatestRelease({ owner, repo }),
 *     () => octokit.repos.listBranches({ owner, repo }),
 *   ]);
 */
