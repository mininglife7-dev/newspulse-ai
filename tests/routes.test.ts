import { describe, it, expect } from 'vitest';
import { classifyRoute } from '@/lib/routes';

describe('classifyRoute', () => {
  it('treats the landing page as public (not a prefix match for everything)', () => {
    expect(classifyRoute('/')).toBe('public');
  });

  it.each(['/dashboard', '/dashboard/settings', '/workspace', '/workspace/setup', '/assessment', '/inventory', '/api/workspace', '/api/ai-systems'])(
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
