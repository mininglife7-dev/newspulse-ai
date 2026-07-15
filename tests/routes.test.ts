import { describe, it, expect } from 'vitest';
import { classifyRoute, safeInternalPath } from '@/lib/routes';

describe('classifyRoute', () => {
  it('treats the landing page as public (not a prefix match for everything)', () => {
    expect(classifyRoute('/')).toBe('public');
  });

  it.each(['/dashboard', '/dashboard/settings', '/workspace', '/workspace/setup', '/assessment', '/api/workspace'])(
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

describe('safeInternalPath (open-redirect guard)', () => {
  it('accepts genuine same-origin paths', () => {
    expect(safeInternalPath('/dashboard')).toBe('/dashboard');
    expect(safeInternalPath('/workspace/setup')).toBe('/workspace/setup');
    expect(safeInternalPath('/a/b?c=d#e')).toBe('/a/b?c=d#e');
  });

  it('rejects absolute and protocol-relative URLs', () => {
    expect(safeInternalPath('https://evil.com')).toBe('/dashboard');
    expect(safeInternalPath('http://evil.com')).toBe('/dashboard');
    expect(safeInternalPath('//evil.com')).toBe('/dashboard');
  });

  it('rejects backslash-smuggled targets browsers may treat as absolute', () => {
    // "/\evil.com" is normalized by some browsers to "//evil.com".
    expect(safeInternalPath('/\\evil.com')).toBe('/dashboard');
  });

  it('rejects non-path and empty input, falling back', () => {
    expect(safeInternalPath('')).toBe('/dashboard');
    expect(safeInternalPath(null)).toBe('/dashboard');
    expect(safeInternalPath(undefined)).toBe('/dashboard');
    expect(safeInternalPath('dashboard')).toBe('/dashboard');
  });

  it('honors a custom fallback', () => {
    expect(safeInternalPath(null, '/')).toBe('/');
    expect(safeInternalPath('https://evil.com', '/auth/signin')).toBe(
      '/auth/signin'
    );
  });
});
