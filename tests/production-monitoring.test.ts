import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  checkLandingPage,
  checkSignupPage,
  checkApiHealth,
  checkSupabaseConnection,
  runProductionHealthChecks,
} from '@/lib/production-monitoring';

describe('Production Monitoring (DNA-GOV-002)', () => {
  const testBaseUrl = 'http://localhost:3000';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('checkLandingPage', () => {
    it('reports healthy when landing page responds 200', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
      });

      const result = await checkLandingPage(testBaseUrl);

      expect(result.name).toBe('landing-page');
      expect(result.status).toBe('healthy');
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
      expect(result.error).toBeUndefined();
    });

    it('reports degraded when landing page responds 500', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      });

      const result = await checkLandingPage(testBaseUrl);

      expect(result.status).toBe('degraded');
      expect(result.error).toContain('500');
    });

    it('reports critical on network error', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network timeout'));

      const result = await checkLandingPage(testBaseUrl);

      expect(result.status).toBe('critical');
      expect(result.error).toContain('Network timeout');
    });
  });

  describe('checkSignupPage', () => {
    it('reports healthy when signup page loads', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
      });

      const result = await checkSignupPage(testBaseUrl);

      expect(result.name).toBe('signup-page');
      expect(result.status).toBe('healthy');
    });

    it('reports critical on network error', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Connection refused'));

      const result = await checkSignupPage(testBaseUrl);

      expect(result.status).toBe('critical');
    });
  });

  describe('checkApiHealth', () => {
    it('reports healthy when /api/health returns ok:true', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ ok: true }),
      });

      const result = await checkApiHealth(testBaseUrl);

      expect(result.name).toBe('api-health');
      expect(result.status).toBe('healthy');
      expect(result.error).toBeUndefined();
    });

    it('reports degraded when /api/health returns ok:false', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ ok: false }),
      });

      const result = await checkApiHealth(testBaseUrl);

      expect(result.status).toBe('degraded');
      expect(result.error).toContain('ok:false');
    });

    it('reports critical on network error', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Timeout'));

      const result = await checkApiHealth(testBaseUrl);

      expect(result.status).toBe('critical');
    });
  });

  describe('checkSupabaseConnection', () => {
    it('reports healthy when API returns 401 (auth required)', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        status: 401,
      });

      const result = await checkSupabaseConnection(testBaseUrl);

      expect(result.name).toBe('supabase-connection');
      expect(result.status).toBe('healthy');
    });

    it('reports healthy when API returns 400 (validation error)', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        status: 400,
      });

      const result = await checkSupabaseConnection(testBaseUrl);

      expect(result.status).toBe('healthy');
    });

    it('reports healthy when API returns 500 (DB error)', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        status: 500,
      });

      const result = await checkSupabaseConnection(testBaseUrl);

      expect(result.status).toBe('healthy');
    });

    it('reports degraded on unexpected status', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        status: 503,
      });

      const result = await checkSupabaseConnection(testBaseUrl);

      expect(result.status).toBe('degraded');
    });

    it('reports critical on network error', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Connection error'));

      const result = await checkSupabaseConnection(testBaseUrl);

      expect(result.status).toBe('critical');
    });
  });

  describe('runProductionHealthChecks', () => {
    it('returns healthy report when all checks pass', async () => {
      global.fetch = vi.fn().mockImplementation((url) => {
        // checkSupabaseConnection expects 401/400/500 to be healthy
        if (url.includes('/api/workspace')) {
          return Promise.resolve({ status: 401 });
        }
        // All other checks expect 200 with ok:true
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ ok: true }),
        });
      });

      const report = await runProductionHealthChecks(testBaseUrl);

      expect(report.ok).toBe(true);
      expect(report.summary.healthy).toBe(4);
      expect(report.summary.critical).toBe(0);
      expect(report.summary.degraded).toBe(0);
      expect(report.alerts).toHaveLength(0);
    });

    it('returns alerts when critical checks fail', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const report = await runProductionHealthChecks(testBaseUrl);

      expect(report.ok).toBe(false);
      expect(report.summary.critical).toBe(4);
      expect(report.alerts.length).toBeGreaterThan(0);
      expect(report.alerts[0]).toContain('CRITICAL');
    });

    it('generates performance alert when latency is high', async () => {
      global.fetch = vi.fn().mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              ok: true,
              status: 200,
              json: async () => ({ ok: true }),
            });
          }, 3100);
        });
      });

      const report = await runProductionHealthChecks(testBaseUrl);

      const perfAlert = report.alerts.find((a) => a.includes('PERFORMANCE'));
      expect(perfAlert).toBeDefined();
    });

    it('includes all checks in report', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ ok: true }),
      });

      const report = await runProductionHealthChecks(testBaseUrl);

      expect(report.checks).toHaveLength(4);
      expect(report.checks.map((c) => c.name)).toEqual([
        'landing-page',
        'signup-page',
        'api-health',
        'supabase-connection',
      ]);
    });
  });
});
