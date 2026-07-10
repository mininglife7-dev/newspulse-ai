import { describe, it, expect } from 'vitest';
import { classifyRoute, safeRedirectPath } from '@/lib/routes';

describe('classifyRoute', () => {
  it('treats the landing page as public (not a prefix match for everything)', () => {
    expect(classifyRoute('/')).toBe('public');
  });

  it.each([
    '/dashboard',
    '/dashboard/settings',
    '/workspace',
    '/workspace/setup',
    '/assessment',
    '/inventory',
    '/api/workspace',
    '/api/ai-systems',
  ])('protects %s', (path) => {
    expect(classifyRoute(path)).toBe('protected');
  });

  it.each(['/auth/signin', '/auth/signup', '/auth/reset'])(
    'classifies %s as an auth screen',
    (path) => {
      expect(classifyRoute(path)).toBe('auth');
    }
  );

  it.each([
    '/auth/verify-email',
    '/auth/confirm',
    '/api/health',
    '/governance',
    '/manifest.webmanifest',
  ])('leaves %s public', (path) => {
    expect(classifyRoute(path)).toBe('public');
  });

  it('does not protect lookalike prefixes', () => {
    expect(classifyRoute('/dashboardish')).toBe('public');
    expect(classifyRoute('/workspaces-blog')).toBe('public');
  });
});

describe('safeRedirectPath — open-redirect guard', () => {
  it('allows genuine same-origin paths (with query + hash)', () => {
    expect(safeRedirectPath('/dashboard')).toBe('/dashboard');
    expect(safeRedirectPath('/workspace/setup')).toBe('/workspace/setup');
    expect(safeRedirectPath('/inventory?step=2#top')).toBe(
      '/inventory?step=2#top'
    );
  });

  it('rejects protocol-relative and absolute URLs', () => {
    expect(safeRedirectPath('//evil.com')).toBe('/dashboard');
    expect(safeRedirectPath('https://evil.com')).toBe('/dashboard');
    expect(safeRedirectPath('http://evil.com')).toBe('/dashboard');
  });

  it('rejects the backslash bypass that a naive "//" check misses', () => {
    // These all resolve to an external host via WHATWG URL normalization,
    // yet start with a single "/" and would slip past a `!startsWith('//')`.
    expect(safeRedirectPath('/\\evil.com')).toBe('/dashboard');
    expect(safeRedirectPath('/\\/evil.com')).toBe('/dashboard');
    expect(safeRedirectPath('/\\\\evil.com')).toBe('/dashboard');
  });

  it('rejects empty / non-path / null values, honoring the fallback', () => {
    expect(safeRedirectPath(null)).toBe('/dashboard');
    expect(safeRedirectPath(undefined)).toBe('/dashboard');
    expect(safeRedirectPath('')).toBe('/dashboard');
    expect(safeRedirectPath('dashboard')).toBe('/dashboard');
    expect(safeRedirectPath('mailto:x@y.com')).toBe('/dashboard');
    expect(safeRedirectPath('/evil', '/signin-fallback')).toBe('/evil');
    expect(safeRedirectPath('//evil.com', '/signin-fallback')).toBe(
      '/signin-fallback'
    );
  });

  it('never returns a value that resolves off-origin', () => {
    const attacks = [
      '/\\evil.com',
      '//evil.com',
      '/\t/evil.com',
      '/\n//evil.com',
    ];
    for (const a of attacks) {
      const out = safeRedirectPath(a);
      const origin = new URL(out, 'https://euro-ai.invalid').origin;
      expect(origin).toBe('https://euro-ai.invalid');
    }
  });
});
