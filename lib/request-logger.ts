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
 * Get statistics on request patterns
 */
export function getRequestStats(): RequestLogStats {
  if (logs.length === 0) {
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

  const statusDistribution: Record<number, number> = {};
  const pathStats: Record<string, { count: number; latencies: number[] }> = {};
  const errors: Record<string, number> = {};
  const latencies: number[] = [];

  for (const log of logs) {
    statusDistribution[log.status] = (statusDistribution[log.status] || 0) + 1;
    latencies.push(log.latencyMs);

    if (!pathStats[log.path]) {
      pathStats[log.path] = { count: 0, latencies: [] };
    }
    pathStats[log.path].count++;
    pathStats[log.path].latencies.push(log.latencyMs);

    if (log.error) {
      errors[log.error] = (errors[log.error] || 0) + 1;
    }
  }

  // Calculate percentiles
  const sortedLatencies = [...latencies].sort((a, b) => a - b);
  const p95Index = Math.floor(sortedLatencies.length * 0.95);
  const p99Index = Math.floor(sortedLatencies.length * 0.99);

  const errorCount = logs.filter((l) => l.status >= 400).length;

  return {
    timestamp: new Date().toISOString(),
    totalRequests: logs.length,
    avgLatencyMs: Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length),
    p95LatencyMs: sortedLatencies[p95Index] || 0,
    p99LatencyMs: sortedLatencies[p99Index] || 0,
    errorRate: Math.round((errorCount / logs.length) * 10000) / 10000,
    statusDistribution,
    pathStats: Object.entries(pathStats).reduce(
      (acc, [path, data]) => {
        const pathLatencies = data.latencies.sort((a, b) => a - b);
        const errorCount = logs.filter((l) => l.path === path && l.status >= 400).length;
        acc[path] = {
          count: data.count,
          avgLatencyMs: Math.round(data.latencies.reduce((a, b) => a + b, 0) / data.latencies.length),
          errorRate: Math.round((errorCount / data.count) * 10000) / 10000,
        };
        return acc;
      },
      {} as Record<string, { count: number; avgLatencyMs: number; errorRate: number }>
    ),
    topErrors: Object.entries(errors)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([error, count]) => ({ error, count })),
  };
}

/**
 * Query recent logs with filtering
 */
export function queryLogs(options?: {
  limit?: number;
  status?: number;
  path?: string;
  level?: RequestLogLevel;
  userId?: string;
}): RequestLog[] {
  let filtered = [...logs];

  if (options?.status) {
    filtered = filtered.filter((l) => l.status === options.status);
  }
  if (options?.path) {
    filtered = filtered.filter((l) => l.path.includes(options.path!));
  }
  if (options?.level) {
    filtered = filtered.filter((l) => l.level === options.level);
  }
  if (options?.userId) {
    filtered = filtered.filter((l) => l.userId === options.userId);
  }

  const limit = options?.limit || 100;
  return filtered.slice(-limit);
}

/**
 * Clear logs (testing only)
 */
export function __clearLogs() {
  logs.length = 0;
  logIndex = 0;
}
