import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { checkAdmin, extractAdminToken } from '@/lib/auth';

const ORIGINAL = process.env.ADMIN_TOKEN;

afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.ADMIN_TOKEN;
  else process.env.ADMIN_TOKEN = ORIGINAL;
});

describe('extractAdminToken', () => {
  it('reads a Bearer token', () => {
    const h = new Headers({ authorization: 'Bearer secret123' });
    expect(extractAdminToken(h)).toBe('secret123');
  });

  it('is case-insensitive on the Bearer scheme', () => {
    const h = new Headers({ authorization: 'bearer secret123' });
    expect(extractAdminToken(h)).toBe('secret123');
  });

  it('reads the x-admin-token header', () => {
    const h = new Headers({ 'x-admin-token': 'secret123' });
    expect(extractAdminToken(h)).toBe('secret123');
  });

  it('returns null when no token header is present', () => {
    expect(extractAdminToken(new Headers())).toBeNull();
  });
});

describe('checkAdmin', () => {
  it('fails closed (503) when ADMIN_TOKEN is not configured', () => {
    delete process.env.ADMIN_TOKEN;
    const res = checkAdmin(new Headers({ 'x-admin-token': 'anything' }));
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.status).toBe(503);
      expect(res.code).toBe('admin_unconfigured');
    }
  });

  it('returns 401 when configured but no token is supplied', () => {
    process.env.ADMIN_TOKEN = 'the-real-token';
    const res = checkAdmin(new Headers());
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.status).toBe(401);
      expect(res.code).toBe('admin_token_missing');
    }
  });

  it('returns 401 for a wrong token', () => {
    process.env.ADMIN_TOKEN = 'the-real-token';
    const res = checkAdmin(new Headers({ 'x-admin-token': 'wrong' }));
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.status).toBe(401);
      expect(res.code).toBe('admin_token_invalid');
    }
  });

  it('allows a matching token via x-admin-token', () => {
    process.env.ADMIN_TOKEN = 'the-real-token';
    expect(checkAdmin(new Headers({ 'x-admin-token': 'the-real-token' })).ok).toBe(
      true
    );
  });

  it('allows a matching token via Bearer', () => {
    process.env.ADMIN_TOKEN = 'the-real-token';
    expect(
      checkAdmin(new Headers({ authorization: 'Bearer the-real-token' })).ok
    ).toBe(true);
  });
});
