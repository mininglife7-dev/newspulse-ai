/**
 * Middleware helper for automatic request/response logging on API endpoints.
 * Wraps handlers to capture performance metrics and errors.
 *
 * Usage:
 * export async function POST(req: Request) {
 *   return withLogging(req, async () => {
 *     // Your handler logic
 *     return NextResponse.json({ ok: true });
 *   }, { endpoint: '/api/workspace', method: 'POST' });
 * }
 */

import { NextResponse, type NextRequest } from 'next/server';
import { logRequest, getRequestIp } from '@/lib/request-logger';

export interface LoggingOptions {
  endpoint: string;
  method: string;
  userId?: string;
  workspaceId?: string;
}

/**
 * Get request size from Content-Length header
 */
function getRequestSize(headers: Headers): number {
  const contentLength = headers.get('content-length');
  return contentLength ? parseInt(contentLength, 10) : 0;
}

/**
 * Wrap handler with automatic request/response logging
 */
export async function withLogging(
  req: NextRequest,
  handler: () => Promise<Response>,
  options: LoggingOptions
): Promise<Response> {
  const startTime = Date.now();
  const ip = getRequestIp(req.headers);
  const requestSize = getRequestSize(req.headers);

  let response: Response | null = null;
  let error: Error | null = null;
  let responseSize = 0;

  try {
    response = await handler();

    // Clone response to capture body size (reading it consumes it)
    const clonedResponse = response.clone();
    const body = await clonedResponse.text();
    responseSize = Buffer.byteLength(body);

    return response;
  } catch (err) {
    error = err instanceof Error ? err : new Error(String(err));

    const response = NextResponse.json(
      { ok: false, error: 'Internal server error' },
      { status: 500 }
    );

    logRequest({
      method: options.method,
      path: options.endpoint,
      status: 500,
      latencyMs: Date.now() - startTime,
      ip,
      userId: options.userId,
      workspaceId: options.workspaceId,
      requestSize,
      responseSize,
      error: error.message,
    });

    throw error;
  } finally {
    if (response && !error) {
      logRequest({
        method: options.method,
        path: options.endpoint,
        status: response.status,
        latencyMs: Date.now() - startTime,
        ip,
        userId: options.userId,
        workspaceId: options.workspaceId,
        requestSize,
        responseSize,
      });
    }
  }
}

/**
 * Middleware to extract user info from auth headers/cookies
 * Returns userId if available, undefined otherwise
 */
export async function extractUserIdFromAuth(req: NextRequest): Promise<string | undefined> {
  try {
    // Try to extract from Authorization header (Bearer token)
    const auth = req.headers.get('authorization');
    if (!auth?.startsWith('Bearer ')) {
      return undefined;
    }

    // In production, this would decode JWT or validate with auth provider
    // For now, we just note that auth is present
    return 'authenticated-user'; // Placeholder
  } catch {
    return undefined;
  }
}

/**
 * Convenience decorator factory for API routes
 * Reduces boilerplate in route handlers
 */
export function createApiLogger(options: Partial<LoggingOptions>) {
  return (
    handler: (
      req: NextRequest,
      ...args: any[]
    ) => Promise<Response>
  ) => {
    return async (req: NextRequest, ...args: any[]) => {
      const userId = await extractUserIdFromAuth(req);

      return withLogging(
        req,
        () => handler(req, ...args),
        {
          endpoint: options.endpoint || req.nextUrl.pathname,
          method: options.method || req.method,
          userId: userId || options.userId,
          workspaceId: options.workspaceId,
        }
      );
    };
  };
}
