import { NextResponse, type NextRequest } from 'next/server';

/**
 * Optional admin guard for destructive endpoints.
 *
 * Off by default: when ADMIN_TOKEN is not set, every request passes and
 * behavior is identical to before this guard existed. When the founder sets
 * ADMIN_TOKEN in the deployment env, DELETE endpoints require
 * `Authorization: Bearer <token>` — the UI prompts for it on 401.
 *
 * Returns null when the request may proceed, or a 401 response to return.
 */
export function requireAdmin(req: NextRequest): NextResponse | null {
  const token = process.env.ADMIN_TOKEN;
  if (!token) return null;

  const auth = req.headers.get('authorization');
  if (auth === `Bearer ${token}`) return null;

  return NextResponse.json(
    {
      ok: false,
      error:
        'This action is protected. Provide the admin token to delete data.',
    },
    { status: 401 }
  );
}
