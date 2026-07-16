import { NextResponse } from 'next/server';

export interface SecurityHeadersConfig {
  enableCSP: boolean;
  enableHSTS: boolean;
  enableXFrameOptions: boolean;
  enableXContentTypeOptions: boolean;
  enableReferrerPolicy: boolean;
  enablePermissionsPolicy: boolean;
}

export const defaultSecurityConfig: SecurityHeadersConfig = {
  enableCSP: true,
  enableHSTS: true,
  enableXFrameOptions: true,
  enableXContentTypeOptions: true,
  enableReferrerPolicy: true,
  enablePermissionsPolicy: true,
};

export function addSecurityHeaders(
  response: NextResponse,
  config: SecurityHeadersConfig = defaultSecurityConfig
): NextResponse {
  if (config.enableCSP) {
    // Content Security Policy
    response.headers.set(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:; frame-ancestors 'self'"
    );
  }

  if (config.enableHSTS) {
    // HTTP Strict Transport Security
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }

  if (config.enableXFrameOptions) {
    // Prevent clickjacking
    response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  }

  if (config.enableXContentTypeOptions) {
    // Prevent MIME type sniffing
    response.headers.set('X-Content-Type-Options', 'nosniff');
  }

  if (config.enableReferrerPolicy) {
    // Control referrer information
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  }

  if (config.enablePermissionsPolicy) {
    // Control browser features
    response.headers.set(
      'Permissions-Policy',
      'geolocation=(), microphone=(), camera=(), payment=()'
    );
  }

  // Additional security headers
  response.headers.set('X-Permitted-Cross-Domain-Policies', 'none');
  response.headers.set('X-XSS-Protection', '1; mode=block');

  return response;
}
