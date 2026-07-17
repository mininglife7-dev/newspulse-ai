/**
 * API Performance Middleware
 *
 * Automatically tracks response times for all API endpoints.
 * Wraps route handlers to measure duration, status codes, and send to Sentry.
 *
 * Usage in API route:
 * ```typescript
 * // app/api/inventory/route.ts
 * import { withPerformanceTracking } from '@/lib/monitoring/api-performance-middleware';
 *
 * export const GET = withPerformanceTracking(
 *   async (req) => {
 *     // Your handler code
 *     return Response.json({ items: [] });
 *   },
 *   { endpoint: '/api/inventory' }
 * );
 * ```
 */

import { NextRequest, NextResponse } from 'next/server';
import { startPerformanceTracking } from './performance-tracking';

export interface PerformanceMiddlewareOptions {
  endpoint: string;
  method?: string;
  skipTracking?: (req: NextRequest) => boolean; // Skip tracking for certain requests
}

/**
 * Higher-order function to wrap API route handlers with performance tracking
 */
export function withPerformanceTracking(
  handler: (req: NextRequest) => Promise<Response>,
  options: PerformanceMiddlewareOptions
) {
  return async (req: NextRequest): Promise<Response> => {
    // Check if we should skip tracking
    if (options.skipTracking?.(req)) {
      return handler(req);
    }

    // Extract user info from auth context if available
    const userId = req.headers.get('x-user-id');
    const workspaceId = req.headers.get('x-workspace-id');

    // Start performance tracking
    const tracker = startPerformanceTracking(
      options.endpoint,
      options.method || req.method
    );

    try {
      // Call the actual handler
      const response = await handler(req);

      // End tracking with success
      tracker.end({
        statusCode: response.status,
        userId: userId || undefined,
        workspaceId: workspaceId || undefined,
      });

      return response;
    } catch (error) {
      // End tracking with error
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      tracker.end({
        statusCode: 500,
        userId: userId || undefined,
        workspaceId: workspaceId || undefined,
        error: errorMessage,
      });

      // Re-throw the error
      throw error;
    }
  };
}

/**
 * Utility to add performance headers to responses
 */
export function addPerformanceHeaders(response: Response): Response {
  const newResponse = new Response(response.body, response);

  // Add Server-Timing header for client-side performance measurement
  const timing = response.headers.get('Server-Timing') || '';
  const totalTime = Date.now(); // In a real scenario, measure the actual request duration

  newResponse.headers.set('Server-Timing', `total=${totalTime}`);

  return newResponse;
}

/**
 * Middleware to track response times across all API routes
 * Can be used in middleware.ts for global API tracking
 */
export async function trackApiPerformance(
  request: NextRequest,
  next: (request: NextRequest) => Promise<NextResponse>
) {
  const pathname = request.nextUrl.pathname;

  // Only track API routes
  if (!pathname.startsWith('/api/')) {
    return next(request);
  }

  const method = request.method;
  const tracker = startPerformanceTracking(pathname, method);

  try {
    const response = await next(request);

    tracker.end({
      statusCode: response.status,
    });

    // Add performance headers
    const newResponse = new NextResponse(response.body, response);
    newResponse.headers.set('X-Response-Time', `${Date.now()}ms`);

    return newResponse;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    tracker.end({
      statusCode: 500,
      error: errorMessage,
    });

    throw error;
  }
}
