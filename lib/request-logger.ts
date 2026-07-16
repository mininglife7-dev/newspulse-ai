/**
 * Request/Response Logging Middleware
 *
 * Captures all API traffic for production observability:
 * - Performance metrics (latency, status)
 * - Error tracking (5xx, 4xx patterns)
 * - Abuse detection (rate limit violations, repeated errors)
 * - User journey tracking (request flow analysis)
 *
 * Enables Mean Time To Detect (MTTD) reduction and debugging.
 */

export type RequestLogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface RequestLog {
  id: string;
  timestamp: string;
  method: string;
  path: string;
  status: number;
  latencyMs: number;
  ip: string;
  userAgent?: string;
  userId?: string;
  workspaceId?: string;
  requestSize: number;
  responseSize: number;
  error?: string;
  level: RequestLogLevel;
}

export interface RequestLogStats {
  timestamp: string;
  totalRequests: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  errorRate: number;
  statusDistribution: Record<number, number>;
  pathStats: Record<
    string,
    {
      count: number;
      avgLatencyMs: number;
      errorRate: number;
    }
  >;
  topErrors: Array<{ error: string; count: number }>;
}

interface LogEntry extends RequestLog {
  // For in-memory ring buffer
}

// Ring buffer: keep last 10,000 requests in memory
const MAX_LOGS = 10000;
const logs: LogEntry[] = [];
let logIndex = 0;

/**
 * Extract IP from request headers
 */
export function getRequestIp(headers: Headers | Record<string, string>): string {
  if (headers instanceof Headers) {
    return (
      headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      headers.get('x-real-ip') ||
      headers.get('cf-connecting-ip') ||
      'unknown'
    );
  }
  return (
    (headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    (headers['x-real-ip'] as string) ||
    (headers['cf-connecting-ip'] as string) ||
    'unknown'
  );
}

/**
 * Log API request with performance metrics
 */
export function logRequest(params: {
  method: string;
  path: string;
  status: number;
  latencyMs: number;
  ip: string;
  userAgent?: string;
  userId?: string;
  workspaceId?: string;
  requestSize?: number;
  responseSize?: number;
  error?: string;
}): RequestLog {
  const level = params.status >= 500 ? 'error' : params.status >= 400 ? 'warn' : 'info';

  const log: LogEntry = {
    id: `req-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    timestamp: new Date().toISOString(),
    method: params.method,
    path: params.path,
    status: params.status,
    latencyMs: params.latencyMs,
    ip: params.ip,
    userAgent: params.userAgent,
    userId: params.userId,
    workspaceId: params.workspaceId,
    requestSize: params.requestSize || 0,
    responseSize: params.responseSize || 0,
    error: params.error,
    level,
  };

  // Add to ring buffer
  if (logs.length < MAX_LOGS) {
    logs.push(log);
  } else {
    logs[logIndex] = log;
    logIndex = (logIndex + 1) % MAX_LOGS;
  }

  return log;
}

/**
 * Get all logs from ring buffer
 */
export function getLogs(): RequestLog[] {
  if (logs.length === 0) return [];
  // Return logs in order (handling ring buffer wrap)
  if (logs.length < MAX_LOGS) {
    return [...logs];
  }
  return [...logs.slice(logIndex), ...logs.slice(0, logIndex)];
}

/**
 * Get aggregated statistics from logs
 */
export function getLogStats(): RequestLogStats {
  const allLogs = getLogs();
  if (allLogs.length === 0) {
    return {
      timestamp: new Date().toISOString(),
      totalRequests: 0,
      avgLatencyMs: 0,
      p95LatencyMs: 0,
      p99LatencyMs: 0,
      errorRate: 0,
      statusDistribution: {},
      pathStats: {},
      topErrors: [],
    };
  }

  // Calculate latency percentiles
  const latencies = allLogs.map((l) => l.latencyMs).sort((a, b) => a - b);
  const len = latencies.length;
  const p95LatencyMs = latencies[Math.floor(len * 0.95)] || 0;
  const p99LatencyMs = latencies[Math.floor(len * 0.99)] || 0;
  const avgLatencyMs = Math.round(latencies.reduce((a, b) => a + b, 0) / len);

  // Status distribution
  const statusDistribution: Record<number, number> = {};
  const errorRate = allLogs.filter((l) => l.status >= 400).length / len;

  // Path-level stats
  const pathStats: Record<
    string,
    { count: number; latencies: number[]; errorCount: number }
  > = {};

  // Error tracking
  const errorMap: Record<string, number> = {};

  for (const log of allLogs) {
    // Status distribution
    statusDistribution[log.status] = (statusDistribution[log.status] || 0) + 1;

    // Path stats
    if (!pathStats[log.path]) {
      pathStats[log.path] = { count: 0, latencies: [], errorCount: 0 };
    }
    pathStats[log.path].count++;
    pathStats[log.path].latencies.push(log.latencyMs);
    if (log.status >= 400) {
      pathStats[log.path].errorCount++;
    }

    // Error tracking
    if (log.error) {
      errorMap[log.error] = (errorMap[log.error] || 0) + 1;
    }
  }

  const finalPathStats: Record<
    string,
    { count: number; avgLatencyMs: number; errorRate: number }
  > = {};
  for (const [path, stats] of Object.entries(pathStats)) {
    const lats = stats.latencies;
    finalPathStats[path] = {
      count: stats.count,
      avgLatencyMs: Math.round(lats.reduce((a, b) => a + b, 0) / lats.length),
      errorRate: stats.errorCount / stats.count,
    };
  }

  const topErrors = Object.entries(errorMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([error, count]) => ({ error, count }));

  return {
    timestamp: new Date().toISOString(),
    totalRequests: len,
    avgLatencyMs,
    p95LatencyMs,
    p99LatencyMs,
    errorRate,
    statusDistribution,
    pathStats: finalPathStats,
    topErrors,
  };
}

/**
 * Clear all logs (for testing)
 */
export function clearLogs(): void {
  logs.length = 0;
  logIndex = 0;
}
