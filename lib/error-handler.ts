/**
 * Standardized Error Response Handler
 *
 * Provides consistent error response formatting across all API endpoints.
 * Enables structured error tracking and correlation in logging infrastructure.
 *
 * All endpoints should use these helpers for consistent error responses:
 * - badRequest(message, details?)
 * - unauthorized(message?)
 * - forbidden(message?)
 * - notFound(message?)
 * - conflict(message, details?)
 * - serverError(message, error?)
 * - unavailable(message?)
 *
 * Each response includes:
 * - ok: false
 * - status: HTTP status code
 * - error: Human-readable error message
 * - code: Machine-readable error code for routing/handling
 * - details: Optional structured error details
 * - timestamp: ISO timestamp for correlation
 * - requestId: Optional correlation ID (set by middleware)
 */

import { NextResponse, type NextRequest } from 'next/server';

export interface ErrorResponse {
  ok: false;
  status: number;
  error: string;
  code: string;
  details?: Record<string, any>;
  timestamp: string;
  requestId?: string;
}

/**
 * Error codes for classification and routing
 */
export enum ErrorCode {
  // 4xx Client Errors
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  AUTHENTICATION_REQUIRED = 'AUTHENTICATION_REQUIRED',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  RESOURCE_CONFLICT = 'RESOURCE_CONFLICT',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',

  // 5xx Server Errors
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  OPERATION_FAILED = 'OPERATION_FAILED',
  VALIDATION_FAILED = 'VALIDATION_FAILED',
}

/**
 * Creates a standardized error response
 */
function createErrorResponse(
  statusCode: number,
  code: ErrorCode,
  message: string,
  details?: Record<string, any>
): ErrorResponse {
  return {
    ok: false,
    status: statusCode,
    error: message,
    code,
    details,
    timestamp: new Date().toISOString(),
  };
}

/**
 * 400 Bad Request — Invalid input or malformed request
 */
export function badRequest(message: string, details?: Record<string, any>) {
  return NextResponse.json(
    createErrorResponse(400, ErrorCode.INVALID_INPUT, message, details),
    { status: 400 }
  );
}

/**
 * 400 Bad Request — Missing required field
 */
export function missingRequiredField(fieldName: string) {
  return NextResponse.json(
    createErrorResponse(
      400,
      ErrorCode.MISSING_REQUIRED_FIELD,
      `Missing required field: ${fieldName}`,
      { fieldName }
    ),
    { status: 400 }
  );
}

/**
 * 401 Unauthorized — Authentication required
 */
export function unauthorized(message = 'Authentication required') {
  return NextResponse.json(
    createErrorResponse(401, ErrorCode.AUTHENTICATION_REQUIRED, message),
    { status: 401 }
  );
}

/**
 * 403 Forbidden — User lacks permissions
 */
export function forbidden(message = 'Insufficient permissions to access this resource') {
  return NextResponse.json(
    createErrorResponse(403, ErrorCode.INSUFFICIENT_PERMISSIONS, message),
    { status: 403 }
  );
}

/**
 * 404 Not Found — Resource does not exist
 */
export function notFound(resourceType: string, resourceId?: string) {
  const message = resourceId
    ? `${resourceType} "${resourceId}" not found`
    : `${resourceType} not found`;

  return NextResponse.json(
    createErrorResponse(404, ErrorCode.RESOURCE_NOT_FOUND, message, {
      resourceType,
      resourceId,
    }),
    { status: 404 }
  );
}

/**
 * 409 Conflict — Resource conflict or constraint violation
 */
export function conflict(message: string, details?: Record<string, any>) {
  return NextResponse.json(
    createErrorResponse(409, ErrorCode.RESOURCE_CONFLICT, message, details),
    { status: 409 }
  );
}

/**
 * 429 Too Many Requests — Rate limit exceeded
 */
export function rateLimited(retryAfterSeconds?: number) {
  const response = NextResponse.json(
    createErrorResponse(
      429,
      ErrorCode.RATE_LIMIT_EXCEEDED,
      'Too many requests. Please try again later.',
      retryAfterSeconds ? { retryAfterSeconds } : undefined
    ),
    { status: 429 }
  );

  if (retryAfterSeconds) {
    response.headers.set('Retry-After', String(retryAfterSeconds));
  }

  return response;
}

/**
 * 500 Internal Server Error — Unexpected server error
 */
export function serverError(message: string, error?: Error | unknown) {
  const details: Record<string, any> = {};

  if (error instanceof Error) {
    details.errorMessage = error.message;
    details.errorName = error.name;
  } else if (error) {
    details.error = String(error);
  }

  return NextResponse.json(
    createErrorResponse(
      500,
      ErrorCode.INTERNAL_SERVER_ERROR,
      message,
      Object.keys(details).length > 0 ? details : undefined
    ),
    { status: 500 }
  );
}

/**
 * 500 Internal Server Error — Database operation failed
 */
export function databaseError(operation: string, error?: Error | unknown) {
  const message = `Database ${operation} failed`;
  const details: Record<string, any> = { operation };

  if (error instanceof Error) {
    details.errorMessage = error.message;
  }

  return NextResponse.json(
    createErrorResponse(500, ErrorCode.DATABASE_ERROR, message, details),
    { status: 500 }
  );
}

/**
 * 503 Service Unavailable — Dependency unavailable
 */
export function unavailable(message = 'Service temporarily unavailable. Please try again later.') {
  return NextResponse.json(
    createErrorResponse(503, ErrorCode.SERVICE_UNAVAILABLE, message),
    { status: 503 }
  );
}

/**
 * 400 Bad Request — Validation failed
 */
export function validationFailed(failures: Record<string, string>) {
  return NextResponse.json(
    createErrorResponse(
      400,
      ErrorCode.VALIDATION_FAILED,
      'Validation failed',
      { failures }
    ),
    { status: 400 }
  );
}

/**
 * Helper to safely handle and log errors from promises/operations
 */
export async function safeExecute<T>(
  operation: () => Promise<T>,
  errorHandler?: (error: Error) => NextResponse
): Promise<T | null> {
  try {
    return await operation();
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error('[safeExecute] operation failed:', error);

    if (errorHandler) {
      throw errorHandler(error);
    }

    throw error;
  }
}

/**
 * Validates request body structure
 * Returns error response if invalid, otherwise returns parsed body
 */
export async function validateJsonBody<T>(
  request: NextRequest,
  validator?: (data: unknown) => data is T
): Promise<T | NextResponse> {
  try {
    const data = await request.json();

    if (validator && !validator(data)) {
      return badRequest('Request body does not match expected schema');
    }

    return data as T;
  } catch (err) {
    return badRequest('Invalid JSON in request body');
  }
}

/**
 * Asserts a condition and returns error if false
 */
export function assertOrError(condition: boolean, errorResponse: NextResponse): void | NextResponse {
  if (!condition) {
    return errorResponse;
  }
}

/**
 * Maps common Supabase error codes to standardized error responses
 */
export function handleSupabaseError(error: any, fallbackMessage = 'Database operation failed') {
  if (!error) {
    return serverError(fallbackMessage);
  }

  const message = error.message || String(error);
  const code = error.code || 'unknown';

  // Map specific Supabase errors
  if (code === '23505') {
    // Unique violation
    return conflict('Resource already exists. This violates a unique constraint.');
  }

  if (code === '23503') {
    // Foreign key violation
    return conflict('Cannot perform operation due to related data.');
  }

  if (code === '42P01') {
    // Table not found
    return serverError('Database schema error. Please contact support.');
  }

  if (code === '42703') {
    // Column not found
    return serverError('Database schema error. Please contact support.');
  }

  // Generic database error
  return databaseError('operation', { code, message });
}
