import { NextRequest, NextResponse } from 'next/server';
import { logger, createRequestId, measureDuration } from './logger';

export interface APIContext {
  requestId: string;
  startTime: number;
  userId?: string;
  workspaceId?: string;
}

export async function withLogging(
  handler: (req: NextRequest, context: APIContext) => Promise<NextResponse>,
  endpoint: string
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const requestId = createRequestId();
    const startTime = Date.now();
    const method = req.method;
    const url = req.nextUrl.pathname;

    logger.info('Request received', {
      requestId,
      method,
      endpoint: url,
    });

    try {
      const context: APIContext = {
        requestId,
        startTime,
      };

      const response = await handler(req, context);
      const duration = measureDuration(startTime);
      const statusCode = response.status;

      logger.info('Request completed', {
        requestId,
        method,
        endpoint: url,
        statusCode,
        duration,
      });

      // Add request ID to response headers for tracing
      const headers = new Headers(response.headers);
      headers.set('X-Request-ID', requestId);

      return new NextResponse(response.body, {
        status: response.status,
        headers,
      });
    } catch (error: any) {
      const duration = measureDuration(startTime);

      logger.error('Request failed', {
        requestId,
        method,
        endpoint: url,
        duration,
        error: error?.message || 'Unknown error',
        stack: error?.stack,
      });

      return NextResponse.json(
        {
          ok: false,
          error: 'Internal server error',
          requestId,
        },
        { status: 500 }
      );
    }
  };
}

export function extractWorkspaceId(req: NextRequest): string | null {
  const params = req.nextUrl.searchParams;
  return params.get('workspace_id') || null;
}

export async function extractUserIdFromAuth(req: NextRequest): Promise<string | null> {
  // Try to get from Supabase auth header if present
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    // In a real app, validate the token; for now just extract
    return authHeader.substring(7).split('.')[0]; // rough extraction
  }
  return null;
}
