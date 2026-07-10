import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  recordEndpointError,
  recordEndpointSuccess,
  getEndpointStats,
  getErrorRateReport,
  resetErrorTracking,
  formatErrorAlert,
} from '@/lib/error-rate-monitor';

describe('Error Rate Monitor (DNA-GOV-004)', () => {
  beforeEach(() => {
    resetErrorTracking();
  });

  afterEach(() => {
    resetErrorTracking();
  });

  describe('recordEndpointError', () => {
    it('records error for an endpoint', () => {
      recordEndpointError('/api/workspace', 500, 'Database connection failed');

      const stats = getEndpointStats('/api/workspace');

      expect(stats.endpoint).toBe('/api/workspace');
      expect(stats.errorRequests).toBe(1);
      expect(stats.recentErrors).toHaveLength(1);
      expect(stats.recentErrors[0].statusCode).toBe(500);
    });

    it('tracks severity based on status code', () => {
      recordEndpointError('/api/workspace', 500, 'Server error');
      recordEndpointError('/api/workspace', 401, 'Unauthorized');
      recordEndpointError('/api/workspace', 404, 'Not found');

      const stats = getEndpointStats('/api/workspace');

      expect(stats.recentErrors[0].severity).toBe('critical'); // 500
      expect(stats.recentErrors[1].severity).toBe('high'); // 401
      expect(stats.recentErrors[2].severity).toBe('high'); // 404
    });
  });

  describe('recordEndpointSuccess', () => {
    it('records successful request', () => {
      recordEndpointSuccess('/api/health');

      const stats = getEndpointStats('/api/health');

      expect(stats.totalRequests).toBe(1);
      expect(stats.errorRequests).toBe(0);
      expect(stats.errorRate).toBe(0);
    });
  });

  describe('getEndpointStats', () => {
    it('calculates error rate correctly', () => {
      recordEndpointSuccess('/api/workspace');
      recordEndpointSuccess('/api/workspace');
      recordEndpointSuccess('/api/workspace');
      recordEndpointError('/api/workspace', 500);

      const stats = getEndpointStats('/api/workspace');

      expect(stats.totalRequests).toBe(4);
      expect(stats.errorRequests).toBe(1);
      expect(stats.errorRate).toBeCloseTo(0.25, 2); // 1/4 = 25%
    });

    it('returns empty stats for unknown endpoint', () => {
      const stats = getEndpointStats('/api/unknown');

      expect(stats.endpoint).toBe('/api/unknown');
      expect(stats.totalRequests).toBe(0);
      expect(stats.errorRequests).toBe(0);
      expect(stats.errorRate).toBe(0);
    });
  });

  describe('getErrorRateReport', () => {
    it('returns healthy report when no errors', () => {
      recordEndpointSuccess('/api/health');
      recordEndpointSuccess('/api/workspace');

      const report = getErrorRateReport();

      expect(report.ok).toBe(true);
      expect(report.alerts).toHaveLength(0);
      expect(report.summary.endpointsWithErrors).toBe(0);
    });

    it('alerts when error rate exceeds threshold (5%)', () => {
      // Create 20 requests with 2 errors = 10% error rate
      for (let i = 0; i < 18; i++) {
        recordEndpointSuccess('/api/workspace');
      }
      recordEndpointError('/api/workspace', 500);
      recordEndpointError('/api/workspace', 500);

      const report = getErrorRateReport();

      expect(report.ok).toBe(false);
      expect(report.alerts.length).toBeGreaterThan(0);
      expect(report.alerts[0]).toContain('error rate');
    });

    it('alerts for critical endpoint errors', () => {
      recordEndpointError('/api/workspace', 500);

      const report = getErrorRateReport();

      expect(report.summary.criticalEndpoints).toContain('/api/workspace');
      expect(report.alerts.some((a) => a.includes('CRITICAL'))).toBe(true);
    });

    it('counts total errors across all endpoints', () => {
      recordEndpointError('/api/workspace', 500);
      recordEndpointError('/api/workspace', 500);
      recordEndpointError('/api/health', 503);

      const report = getErrorRateReport();

      expect(report.summary.totalErrors).toBe(3);
      expect(report.summary.totalEndpoints).toBe(2);
    });

    it('reports endpoints with errors', () => {
      recordEndpointSuccess('/api/health');
      recordEndpointError('/api/workspace', 500);

      const report = getErrorRateReport();

      expect(report.summary.endpointsWithErrors).toBe(1);
      expect(report.endpoints.find((e) => e.endpoint === '/api/workspace')).toBeDefined();
    });

    it('tracks only recent errors in window', () => {
      const pastError = new Date(Date.now() - 10 * 60 * 1000); // 10 min ago
      const recentError = new Date(Date.now() - 1 * 60 * 1000); // 1 min ago

      recordEndpointError('/api/workspace', 500, 'Past error');

      // Fast forward time by clearing old errors
      const report1 = getErrorRateReport();
      expect(report1.summary.totalErrors).toBe(1);

      recordEndpointError('/api/workspace', 500, 'Recent error');
      const report2 = getErrorRateReport();

      // Should have both errors in window
      expect(report2.summary.totalErrors).toBe(2);
    });
  });

  describe('formatErrorAlert', () => {
    it('formats healthy status', () => {
      recordEndpointSuccess('/api/health');
      const report = getErrorRateReport();
      const alert = formatErrorAlert(report);

      expect(alert).toContain('✅');
      expect(alert).toContain('normal');
    });

    it('formats critical status', () => {
      recordEndpointError('/api/workspace', 500);
      const report = getErrorRateReport();
      const alert = formatErrorAlert(report);

      expect(alert).toContain('🔴');
      expect(alert).toContain('CRITICAL');
    });

    it('formats warning status', () => {
      for (let i = 0; i < 19; i++) {
        recordEndpointSuccess('/api/other');
      }
      recordEndpointError('/api/other', 500);
      recordEndpointError('/api/other', 500);

      const report = getErrorRateReport();
      const alert = formatErrorAlert(report);

      expect(alert).toContain('⚠️');
    });
  });

  describe('error tracking lifecycle', () => {
    it('tracks errors over time', () => {
      recordEndpointSuccess('/api/health');
      let report = getErrorRateReport();
      expect(report.summary.totalErrors).toBe(0);

      recordEndpointError('/api/health', 503);
      report = getErrorRateReport();
      expect(report.summary.totalErrors).toBe(1);

      recordEndpointError('/api/health', 503);
      report = getErrorRateReport();
      expect(report.summary.totalErrors).toBe(2);
    });

    it('resets tracking on demand', () => {
      recordEndpointError('/api/workspace', 500);
      let report = getErrorRateReport();
      expect(report.summary.totalErrors).toBe(1);

      resetErrorTracking();
      report = getErrorRateReport();
      expect(report.summary.totalErrors).toBe(0);
    });
  });
});
