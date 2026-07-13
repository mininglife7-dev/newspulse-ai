import { NextRequest, NextResponse } from 'next/server';

/**
 * Verify admin/internal API token for monitoring endpoints
 * Tokens should be passed as: Authorization: Bearer <token>
 */
export function requireAdminToken(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return false;
  }

  const token = authHeader.slice(7); // Remove 'Bearer ' prefix
  const adminToken = process.env.ADMIN_TOKEN;

  if (!adminToken) {
    console.error(
      'ADMIN_TOKEN not configured - monitoring endpoints require authentication'
    );
    return false;
  }

  return token === adminToken;
}

/**
 * Create 401 Unauthorized response
 */
export function unauthorizedResponse() {
  return NextResponse.json(
    {
      error: 'Unauthorized',
      message: 'Valid authentication token required',
    },
    { status: 401 }
  );
}

/**
 * Create 403 Forbidden response
 */
export function forbiddenResponse(reason?: string) {
  return NextResponse.json(
    {
      error: 'Forbidden',
      message: reason || 'Access denied',
    },
    { status: 403 }
  );
}

/**
 * Verify request from allowed IP addresses (for Vercel cron jobs)
 * Vercel cron jobs come from known IP ranges
 */
export function isVercelCron(req: NextRequest): boolean {
  const xForwardedFor = req.headers.get('x-forwarded-for');
  const vercelCronToken = req.headers.get('authorization')?.slice(7);

  // If ADMIN_TOKEN is set and provided, use token auth
  if (process.env.ADMIN_TOKEN && vercelCronToken === process.env.ADMIN_TOKEN) {
    return true;
  }

  // Optional: Verify Vercel IP ranges
  // Vercel publishes IP ranges at: https://vercel.com/docs/concepts/edge-network/viewing-log-data#vercel-ip-ranges
  if (xForwardedFor) {
    const vercelIPs = [
      '35.184.141.144/32',
      '45.33.82.182/32',
      '45.33.83.35/32',
      // ... more Vercel IPs - keep this list updated or use env var
    ];
    // In production, validate xForwardedFor against vercelIPs
    // For now, just verify token is provided
  }

  return false;
}
