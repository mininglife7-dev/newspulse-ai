/**
 * CORS Configuration
 *
 * Implements Cross-Origin Resource Sharing (CORS) policy for API security.
 * Restricts which origins can access the API and what methods/headers are allowed.
 *
 * Usage:
 *   import { corsHeaders, isCorsAllowed } from '@/lib/cors-config';
 *
 *   export async function GET(request: Request) {
 *     if (!isCorsAllowed(request)) {
 *       return new Response(null, { status: 403, headers: { 'X-Error': 'CORS policy violation' } });
 *     }
 *     return new Response(body, { headers: corsHeaders() });
 *   }
 */

/**
 * Allowed origins for CORS
 * Environment-specific for security:
 * - Production: Only the deployed app domain
 * - Development: localhost for local testing
 */
export function getAllowedOrigins(): (string | RegExp)[] {
  const isDev = process.env.NODE_ENV === 'development';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  const origins: (string | RegExp)[] = [
    ...(isDev ? ['http://localhost:3000', 'http://localhost:3001'] : []),
    ...(appUrl ? [appUrl] : []),
    // Vercel preview deployments (all match newspulse-ai*.vercel.app)
    ...(isDev ? [] : [/^https:\/\/newspulse-ai.*\.vercel\.app$/]),
  ];

  return origins;
}

/**
 * Check if origin is allowed
 */
export function isOriginAllowed(origin: string): boolean {
  const allowedOrigins = getAllowedOrigins();

  for (const allowed of allowedOrigins) {
    if (typeof allowed === 'string') {
      if (allowed === origin) return true;
    } else {
      // RegExp
      if (allowed.test(origin)) return true;
    }
  }

  return false;
}

/**
 * Check if request is allowed (has valid origin)
 */
export function isCorsAllowed(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return true; // Same-origin requests don't have origin header

  return isOriginAllowed(origin);
}

/**
 * Allowed HTTP methods for CORS
 */
export const ALLOWED_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'];

/**
 * Allowed request headers
 */
export const ALLOWED_HEADERS = [
  'Content-Type',
  'Authorization',
  'X-Session-Id',
  'X-Request-Id',
  'User-Agent',
];

/**
 * Headers to expose to client
 */
export const EXPOSED_HEADERS = [
  'X-Response-Time',
  'X-Request-Id',
  'X-Deployment-Status',
  'X-Error-Status',
  'X-Alert-Level',
  'X-Critical-Count',
];

/**
 * Generate CORS headers for response
 */
export function corsHeaders(request?: Request): Record<string, string> {
  const origin = request?.headers.get('origin');
  const isAllowed = origin && isOriginAllowed(origin);

  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : '',
    'Access-Control-Allow-Methods': ALLOWED_METHODS.join(', '),
    'Access-Control-Allow-Headers': ALLOWED_HEADERS.join(', '),
    'Access-Control-Expose-Headers': EXPOSED_HEADERS.join(', '),
    'Access-Control-Max-Age': '86400', // 24 hours
    'Access-Control-Allow-Credentials': 'true',
  };
}

/**
 * Handle CORS preflight (OPTIONS) requests
 */
export function handleCorsPrelight(request: Request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders(request),
    });
  }

  return null;
}

/**
 * Middleware to enforce CORS policy
 * Returns error response if origin not allowed
 */
export function enforceCors(request: Request): Response | null {
  if (!isCorsAllowed(request)) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: 'CORS policy violation',
        origin: request.headers.get('origin'),
      }),
      {
        status: 403,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }

  return null;
}
