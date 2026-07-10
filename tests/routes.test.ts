import { describe, it, expect } from 'vitest';
import { classifyRoute, safeRedirectPath } from '@/lib/routes';

describe('classifyRoute', () => {
  it('treats the landing page as public (not a prefix match for everything)', () => {
    expect(classifyRoute('/')).toBe('public');
  });

  it.each(['/dashboard', '/dashboard/settings', '/workspace', '/workspace/setup', '/assessment', '/inventory', '/api/workspace', '/api/ai-systems', '/api/assessments', '/api/obligations', '/api/reports'])(
    'protects %s',
    (path) => {
      expect(classifyRoute(path)).toBe('protected');
    }
  );

  it.each(['/auth/signin', '/auth/signup', '/auth/reset'])(
    'classifies %s as an auth screen',
    (path) => {
      expect(classifyRoute(path)).toBe('auth');
    }
  );

  it.each(['/auth/verify-email', '/auth/confirm', '/api/health', '/governance', '/manifest.webmanifest'])(
    'leaves %s public',
    (path) => {
      expect(classifyRoute(path)).toBe('public');
    }
  );

  it('does not protect lookalike prefixes', () => {
    expect(classifyRoute('/dashboardish')).toBe('public');
    expect(classifyRoute('/workspaces-blog')).toBe('public');
  });
});

describe('safeRedirectPath (open-redirect guard)', () => {
  it('passes through legitimate same-origin paths', () => {
    expect(safeRedirectPath('/dashboard')).toBe('/dashboard');
    expect(safeRedirectPath('/assessment/abc?tab=1#top')).toBe(
      '/assessment/abc?tab=1#top'
    );
    expect(safeRedirectPath('/workspace/setup')).toBe('/workspace/setup');
  });

  it.each([
    ['/\\evil.com', 'backslash normalizes to // and escapes origin'],
    ['//evil.com', 'protocol-relative'],
    ['/\tevil.com', 'embedded control char'],
    ['https://evil.com', 'absolute url'],
    ['http://evil.com', 'absolute url'],
    ['javascript:alert(1)', 'scheme'],
    ['\\\\evil.com', 'leading backslashes'],
    ['', 'empty'],
    [null, 'null'],
    [undefined, 'undefined'],
    ['evil.com', 'no leading slash'],
  ])('rejects %j (%s) -> /dashboard', (input, _reason) => {
    expect(safeRedirectPath(input as string | null)).toBe('/dashboard');
  });

  it('never returns a value that resolves cross-origin', () => {
    const base = 'https://app.example.com';
    for (const attack of [
      '/\\evil.com',
      '//evil.com',
      '/\t/evil.com',
      'https://evil.com',
    ]) {
      const out = safeRedirectPath(attack);
      expect(new URL(out, base).origin).toBe(base);
    }
  });

  it('honors a custom fallback', () => {
    expect(safeRedirectPath('//evil.com', '/home')).toBe('/home');
  });
});
