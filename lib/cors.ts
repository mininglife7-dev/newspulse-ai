import { NextRequest, NextResponse } from 'next/server';

export interface CORSConfig {
  allowedOrigins: string[];
  allowedMethods: string[];
  allowedHeaders: string[];
  exposedHeaders: string[];
  maxAge: number;
  credentials: boolean;
}

// Default CORS configuration for production
export const defaultCORSConfig: CORSConfig = {
  // Only allow requests from the application domain
  // In development, also allow localhost
  allowedOrigins:
    process.env.NODE_ENV === 'development'
      ? ['http://localhost:3000', 'http://127.0.0.1:3000']
      : ['https://newspulse-ai.vercel.app'],

  // Allowed HTTP methods for API requests
  allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],

  // Headers that can be sent with the request
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],

  // Headers exposed to the browser
  exposedHeaders: [
    'X-Request-ID',
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
  ],

  // How long preflight cache should be stored (in seconds)
  maxAge: 86400, // 24 hours

  // Whether to include credentials (cookies, auth headers)
  credentials: true,
};

export function setCORSHeaders(
  response: NextResponse,
  request: NextRequest,
  config: CORSConfig = defaultCORSConfig
): NextResponse {
  const origin = request.headers.get('origin');

  // Check if origin is allowed
  const isOriginAllowed = config.allowedOrigins.includes(origin || '');

  if (isOriginAllowed) {
    response.headers.set('Access-Control-Allow-Origin', origin || '');
    response.headers.set(
      'Access-Control-Allow-Credentials',
      config.credentials ? 'true' : 'false'
    );
    response.headers.set(
      'Access-Control-Allow-Methods',
      config.allowedMethods.join(', ')
    );
    response.headers.set(
      'Access-Control-Allow-Headers',
      config.allowedHeaders.join(', ')
    );
    response.headers.set(
      'Access-Control-Expose-Headers',
      config.exposedHeaders.join(', ')
    );
    response.headers.set('Access-Control-Max-Age', config.maxAge.toString());
  }

  return response;
}

export async function handleCORSPreflight(
  request: NextRequest,
  config: CORSConfig = defaultCORSConfig
): Promise<NextResponse | null> {
  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    const response = new NextResponse(null, { status: 204 });
    return setCORSHeaders(response, request, config);
  }

  // Not a preflight request
  return null;
}

// Example middleware to apply CORS to API routes
export async function withCORS(
  handler: (req: NextRequest) => Promise<NextResponse>,
  request: NextRequest,
  config: CORSConfig = defaultCORSConfig
): Promise<NextResponse> {
  // Handle preflight
  const preflightResponse = await handleCORSPreflight(request, config);
  if (preflightResponse) {
    return preflightResponse;
  }

  // Handle actual request
  const response = await handler(request);
  return setCORSHeaders(response, request, config);
}
