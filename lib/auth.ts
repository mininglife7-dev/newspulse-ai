import crypto from 'node:crypto';

/**
 * Minimal admin authorization for destructive API actions.
 *
 * There are no user accounts in this app, but destructive endpoints (wiping or
 * deleting saved searches) must not be callable by anonymous traffic. We gate
 * them behind a single shared secret, `ADMIN_TOKEN`, supplied per-request as
 * either `Authorization: Bearer <token>` or an `x-admin-token` header.
 *
 * Fail-closed: if `ADMIN_TOKEN` is not configured on the server, admin actions
 * are DISABLED rather than open. This means an un-configured deployment cannot
 * have its data wiped by a stranger.
 */

export type AdminResult =
  | { ok: true }
  | { ok: false; status: 401 | 503; code: string; error: string };

/** Pull an admin token out of the request headers, if present. */
export function extractAdminToken(headers: Headers): string | null {
  const authz = headers.get('authorization');
  if (authz && /^Bearer\s+/i.test(authz)) {
    const token = authz.replace(/^Bearer\s+/i, '').trim();
    if (token) return token;
  }
  const x = headers.get('x-admin-token');
  return x && x.trim() ? x.trim() : null;
}

/** Constant-time string comparison to avoid leaking the token via timing. */
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

/**
 * Authorize an admin action from request headers.
 * Returns `{ ok: true }` when allowed, or a structured denial with the HTTP
 * status the caller should return.
 */
export function checkAdmin(headers: Headers): AdminResult {
  const configured = process.env.ADMIN_TOKEN?.trim();
  if (!configured) {
    return {
      ok: false,
      status: 503,
      code: 'admin_unconfigured',
      error:
        'Admin actions are disabled on this deployment (no ADMIN_TOKEN configured).',
    };
  }

  const provided = extractAdminToken(headers);
  if (!provided) {
    return {
      ok: false,
      status: 401,
      code: 'admin_token_missing',
      error: 'Admin token required for this action.',
    };
  }

  if (!safeEqual(provided, configured)) {
    return {
      ok: false,
      status: 401,
      code: 'admin_token_invalid',
      error: 'Invalid admin token.',
    };
  }

  return { ok: true };
}
