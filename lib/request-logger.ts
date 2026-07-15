import { NextRequest, NextResponse } from 'next/server';

export interface RequestLog {
  timestamp: string;
  method: string;
  path: string;
  query?: Record<string, string>;
  requestSize: number;
  responseStatus: number;
  responseSize: number;
  latencyMs: number;
  error?: string;
  userId?: string;
  workspaceId?: string;
  ipAddress?: string;
}

const requestLogs: RequestLog[] = [];
const maxLogSize = 500;

export function logRequest(log: RequestLog): void {
  requestLogs.push(log);
  if (requestLogs.length > maxLogSize) {
    requestLogs.shift();
  }

  // Log slow requests to console for operations visibility
  if (log.latencyMs > 1000) {
    console.warn('[SLOW REQUEST]', {
      method: log.method,
      path: log.path,
      latency: `${log.latencyMs}ms`,
      status: log.responseStatus,
    });
  }

  // Log errors to console
  if (log.error) {
    console.error('[REQUEST ERROR]', {
      method: log.method,
      path: log.path,
      error: log.error,
      status: log.responseStatus,
    });
  }
}

export function getRequestLogs(filters?: {
  path?: string;
  method?: string;
  statusCode?: number;
  minLatencyMs?: number;
  limit?: number;
}): RequestLog[] {
  let results = [...requestLogs];

  if (filters?.path) {
    results = results.filter((log) => log.path.includes(filters.path!));
  }

  if (filters?.method) {
    results = results.filter((log) => log.method === filters.method);
  }

  if (filters?.statusCode) {
    results = results.filter((log) => log.responseStatus === filters.statusCode);
  }

  if (filters?.minLatencyMs) {
    results = results.filter((log) => log.latencyMs >= filters.minLatencyMs!);
  }

  results.reverse();

  if (filters?.limit) {
    results = results.slice(0, filters.limit);
  }

  return results;
}

export function getRequestStats(): {
  totalRequests: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
  errorRate: number;
  requestsByPath: Record<string, number>;
  requestsByStatus: Record<number, number>;
} {
  if (requestLogs.length === 0) {
    return {
      totalRequests: 0,
      avgLatencyMs: 0,
      p95LatencyMs: 0,
      errorRate: 0,
      requestsByPath: {},
      requestsByStatus: {},
    };
  }

  const latencies = requestLogs.map((log) => log.latencyMs).sort((a, b) => a - b);
  const p95Index = Math.floor(latencies.length * 0.95);

  const requestsByPath: Record<string, number> = {};
  const requestsByStatus: Record<number, number> = {};
  let errorCount = 0;

  requestLogs.forEach((log) => {
    requestsByPath[log.path] = (requestsByPath[log.path] || 0) + 1;
    requestsByStatus[log.responseStatus] = (requestsByStatus[log.responseStatus] || 0) + 1;

    if (log.responseStatus >= 400) {
      errorCount += 1;
    }
  });

  return {
    totalRequests: requestLogs.length,
    avgLatencyMs: Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length),
    p95LatencyMs: latencies[p95Index] || 0,
    errorRate: Math.round((errorCount / requestLogs.length) * 100) / 100,
    requestsByPath,
    requestsByStatus,
  };
}

export function wrapWithRequestLogging<T extends (...args: any[]) => Promise<NextResponse>>(
  handler: T
): T {
  return (async (req: NextRequest, ...args: any[]) => {
    const startTime = Date.now();
    const method = req.method;
    const url = new URL(req.url);
    const path = url.pathname;
    const query = Object.fromEntries(url.searchParams.entries());

    const requestSize = req.headers.get('content-length')
      ? parseInt(req.headers.get('content-length')!, 10)
      : 0;

    const ipAddress =
      (req.headers.get('x-forwarded-for') as string)?.split(',')?.[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      'unknown';

    try {
      const response = await handler(req, ...args);
      const latencyMs = Date.now() - startTime;
      const responseSize = response.headers.get('content-length')
        ? parseInt(response.headers.get('content-length')!, 10)
        : 0;

      logRequest({
        timestamp: new Date().toISOString(),
        method,
        path,
        query: Object.keys(query).length > 0 ? query : undefined,
        requestSize,
        responseStatus: response.status,
        responseSize,
        latencyMs,
        ipAddress,
      });

      return response;
    } catch (err: any) {
      const latencyMs = Date.now() - startTime;

      logRequest({
        timestamp: new Date().toISOString(),
        method,
        path,
        query: Object.keys(query).length > 0 ? query : undefined,
        requestSize,
        responseStatus: 500,
        responseSize: 0,
        latencyMs,
        error: err?.message || 'Unknown error',
        ipAddress,
      });

      throw err;
    }
  }) as T;
}
