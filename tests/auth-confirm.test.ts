import { describe, it, expect, vi, beforeEach } from 'vitest';

const calls: { exchanged: string[]; verified: any[] } = {
  exchanged: [],
  verified: [],
};
let failNext = false;

vi.mock('@/lib/supabase-server', () => ({
  createRouteClient: () => ({
    auth: {
      exchangeCodeForSession: async (code: string) => {
        calls.exchanged.push(code);
        return { error: failNext ? { message: 'bad code' } : null };
      },
      verifyOtp: async (args: any) => {
        calls.verified.push(args);
        return { error: failNext ? { message: 'bad token' } : null };
      },
    },
  }),
}));

import { GET } from '@/app/auth/confirm/route';

function get(query: string) {
  return GET(new Request(`https://euro-ai.example/auth/confirm${query}`));
}

beforeEach(() => {
  calls.exchanged = [];
  calls.verified = [];
  failNext = false;
});

describe('GET /auth/confirm', () => {
  it('exchanges a PKCE code and redirects to the dashboard', async () => {
    const res = await get('?code=abc123');
    expect(calls.exchanged).toEqual(['abc123']);
    expect(res.status).toBeGreaterThanOrEqual(300);
    expect(res.headers.get('location')).toBe(
      'https://euro-ai.example/dashboard'
    );
  });

  it('verifies a token_hash link', async () => {
    const res = await get('?token_hash=th1&type=signup');
    expect(calls.verified).toEqual([{ type: 'signup', token_hash: 'th1' }]);
    expect(res.headers.get('location')).toBe(
      'https://euro-ai.example/dashboard'
    );
  });

  it('honors a same-origin next param', async () => {
    const res = await get('?code=abc&next=/workspace/setup');
    expect(res.headers.get('location')).toBe(
      'https://euro-ai.example/workspace/setup'
    );
  });

  it('rejects absolute-URL next params (open redirect)', async () => {
    const res = await get('?code=abc&next=https://evil.example/phish');
    expect(res.headers.get('location')).toBe(
      'https://euro-ai.example/dashboard'
    );
  });

  it('redirects to sign-in with an error when verification fails', async () => {
    failNext = true;
    const res = await get('?code=abc');
    expect(res.headers.get('location')).toContain(
      '/auth/signin?error=verification_failed'
    );
  });

  it('redirects to sign-in when no credentials are present', async () => {
    const res = await get('');
    expect(res.headers.get('location')).toContain(
      '/auth/signin?error=verification_failed'
    );
  });
});
