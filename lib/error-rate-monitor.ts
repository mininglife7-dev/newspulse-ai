/**
 * DNA-GOV-004: Error Rate Monitoring
 *
 * Autonomously detect and alert when error rates in production exceed acceptable thresholds.
 * Critical gap: Runtime errors accumulate without detection. If auth endpoint crashes,
 * customers experience failures but we don't know until they report it.
 *
 * This DNA tracks errors by endpoint and alerts when:
 * - Error rate exceeds threshold (>5% errors per endpoint)
 * - Error volume exceeds threshold (>10 errors in 5 min)
 * - Critical endpoints fail (auth, workspace, dashboard)
 */

export interface ErrorRecord {
  timestamp: string;
  endpoint: string;
  statusCode: number;
  errorMessage?: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

export interface EndpointErrorStats {
  endpoint: string;
  totalRequests: number;
  errorRequests: number;
  errorRate: number; // 0.0-1.0
  recentErrors: ErrorRecord[];
  lastErrorAt?: string;
}

export interface ErrorRateReport {
  ok: boolean;
  timestamp: string;
  summary: {
    totalEndpoints: number;
    endpointsWithErrors: number;
    totalErrors: number;
    criticalEndpoints: string[];
  };
  endpoints: EndpointErrorStats[];
  alerts: string[];
}

// In-memory store (resets on restart, but sufficient for MVP)
const errorStore = new Map<
  string,
  { totalRequests: number; errorRequests: number; errors: ErrorRecord[] }
>();

const CRITICAL_ENDPOINTS = [
  '/api/workspace',
  '/api/auth',
  '/api/dashboard',
  '/api/health',
];
const ERROR_RATE_THRESHOLD = 0.05; // 5%
const ERROR_VOLUME_THRESHOLD = 10; // 10 errors in window
const WINDOW_MINUTES = 5;

/**
 * Track an error for an endpoint
 */
export function recordEndpointError(
  endpoint: string,
  statusCode: number,
  error?: string
): void {
  if (!errorStore.has(endpoint)) {
    errorStore.set(endpoint, {
      totalRequests: 0,
      errorRequests: 0,
      errors: [],
    });
  }

  const stats = errorStore.get(endpoint)!;
  const isCritical =
    statusCode >= 500 || statusCode === 401 || statusCode === 403;

  const errorRecord: ErrorRecord = {
    timestamp: new Date().toISOString(),
    endpoint,
    statusCode,
    errorMessage: error,
    severity:
      statusCode >= 500 ? 'critical' : statusCode >= 400 ? 'high' : 'medium',
  };

  stats.totalRequests++; // Count error as a request
  stats.errorRequests++;
  stats.errors.push(errorRecord);

  // Keep only recent errors (last WINDOW_MINUTES)
  const windowStart = Date.now() - WINDOW_MINUTES * 60 * 1000;
  stats.errors = stats.errors.filter(
    (e) => new Date(e.timestamp).getTime() > windowStart
  );
}

/**
 * Track a successful request for an endpoint
 */
export function recordEndpointSuccess(endpoint: string): void {
  if (!errorStore.has(endpoint)) {
    errorStore.set(endpoint, {
      totalRequests: 0,
      errorRequests: 0,
      errors: [],
    });
  }

  const stats = errorStore.get(endpoint)!;
  stats.totalRequests++;

  // Clean up old errors
  const windowStart = Date.now() - WINDOW_MINUTES * 60 * 1000;
  stats.errors = stats.errors.filter(
    (e) => new Date(e.timestamp).getTime() > windowStart
  );
}

/**
 * Get error stats for a specific endpoint
 */
export function getEndpointStats(endpoint: string): EndpointErrorStats {
  const stats = errorStore.get(endpoint) || {
    totalRequests: 0,
    errorRequests: 0,
    errors: [],
  };
  const errorRate =
    stats.totalRequests > 0 ? stats.errorRequests / stats.totalRequests : 0;

  return {
    endpoint,
    totalRequests: stats.totalRequests,
    errorRequests: stats.errorRequests,
    errorRate,
    recentErrors: stats.errors.slice(-5), // Last 5 errors
    lastErrorAt: stats.errors[stats.errors.length - 1]?.timestamp,
  };
}

/**
 * Generate error rate report
 */
export function getErrorRateReport(): ErrorRateReport {
  const endpoints = Array.from(errorStore.keys());
  const endpointStats = endpoints.map(getEndpointStats);

  const endpointsWithErrors = endpointStats.filter((s) => s.errorRequests > 0);
  const criticalEndpointsWithErrors = endpointsWithErrors.filter((s) =>
    CRITICAL_ENDPOINTS.includes(s.endpoint)
  );

  const alerts: string[] = [];

  // Check for high error rates
  endpointStats.forEach((stats) => {
    if (stats.errorRate > ERROR_RATE_THRESHOLD) {
      alerts.push(
        `[HIGH] ${stats.endpoint}: ${(stats.errorRate * 100).toFixed(1)}% error rate (${stats.errorRequests}/${stats.totalRequests})`
      );
    }
  });

  // Check for high error volume
  const totalRecentErrors = endpointStats.reduce(
    (sum, s) => sum + s.recentErrors.length,
    0
  );
  if (totalRecentErrors > ERROR_VOLUME_THRESHOLD) {
    alerts.push(
      `[VOLUME] ${totalRecentErrors} errors in last ${WINDOW_MINUTES} minutes (threshold: ${ERROR_VOLUME_THRESHOLD})`
    );
  }

  // Check for critical endpoint failures
  if (criticalEndpointsWithErrors.length > 0) {
    alerts.push(
      `[CRITICAL] Errors on critical endpoints: ${criticalEndpointsWithErrors.map((s) => s.endpoint).join(', ')}`
    );
  }

  return {
    ok: alerts.length === 0 && criticalEndpointsWithErrors.length === 0,
    timestamp: new Date().toISOString(),
    summary: {
      totalEndpoints: endpoints.length,
      endpointsWithErrors: endpointsWithErrors.length,
      totalErrors: endpointStats.reduce((sum, s) => sum + s.errorRequests, 0),
      criticalEndpoints: criticalEndpointsWithErrors.map((s) => s.endpoint),
    },
    endpoints: endpointStats,
    alerts,
  };
}

/**
 * Reset error tracking (for testing or manual reset)
 */
export function resetErrorTracking(): void {
  errorStore.clear();
}

/**
 * Format error rate alert for Founder
 */
export function formatErrorAlert(report: ErrorRateReport): string {
  if (report.ok) {
    return `✅ Error rate normal: ${report.summary.totalErrors} errors across ${report.summary.totalEndpoints} endpoints`;
  }

  if (report.summary.criticalEndpoints.length > 0) {
    return `🔴 CRITICAL: ${report.summary.criticalEndpoints.length} critical endpoints have errors`;
  }

  return `⚠️ ${report.alerts.length} error alerts: error rate or volume exceeded`;
}
