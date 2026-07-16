import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  processSLAViolations,
  getSeverity,
  formatSLAViolation,
} from '@/lib/sla-alert-monitor';
import * as alertHub from '@/lib/alert-hub';

// Mock alert-hub
vi.mock('@/lib/alert-hub', () => ({
  recordAlert: vi.fn(),
}));

describe('SLA Alert Monitor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('processSLAViolations', () => {
    it('should not record alerts when no violations', () => {
      processSLAViolations(true, 0, []);
      expect(alertHub.recordAlert).not.toHaveBeenCalled();
    });

    it('should record critical alert when high-value endpoint violates SLA', () => {
      const violations = [
        {
          endpoint: 'GET /api/dashboard',
          violations: ['P95 exceeded: 1200ms > 500ms'],
          metrics: { p95: 1200, p99: 1400, count: 150 },
          sla: { p95MaxMs: 500, p99MaxMs: 1000 },
        },
      ];

      processSLAViolations(false, 1, violations);

      expect(alertHub.recordAlert).toHaveBeenCalledWith(
        'production-health',
        'critical',
        expect.stringContaining('SLA Violations'),
        expect.stringContaining('GET /api/dashboard'),
        expect.any(String)
      );
    });

    it('should record critical alert when multiple endpoints violate', () => {
      const violations = [
        {
          endpoint: 'GET /api/ai-systems',
          violations: ['P95 exceeded: 800ms > 600ms'],
          metrics: { p95: 800, p99: 1300, count: 100 },
          sla: { p95MaxMs: 600, p99MaxMs: 1200 },
        },
        {
          endpoint: 'POST /api/evidence',
          violations: ['P99 exceeded: 2500ms > 2000ms'],
          metrics: { p95: 950, p99: 2500, count: 50 },
          sla: { p95MaxMs: 1000, p99MaxMs: 2000 },
        },
      ];

      processSLAViolations(false, 2, violations);

      // Should record overall alert
      expect(alertHub.recordAlert).toHaveBeenCalledWith(
        'production-health',
        'critical',
        expect.stringContaining('2 endpoints'),
        expect.any(String),
        expect.any(String)
      );
    });

    it('should record warning alert for low-value endpoint violations', () => {
      const violations = [
        {
          endpoint: 'GET /api/evidence',
          violations: ['P95 exceeded: 700ms > 600ms'],
          metrics: { p95: 700, p99: 1100, count: 75 },
          sla: { p95MaxMs: 600, p99MaxMs: 1200 },
        },
      ];

      processSLAViolations(false, 1, violations);

      expect(alertHub.recordAlert).toHaveBeenCalledWith(
        'production-health',
        'warning',
        expect.any(String),
        expect.any(String),
        expect.any(String)
      );
    });
  });

  describe('getSeverity', () => {
    it('should return critical when exceeding target by >50%', () => {
      const severity = getSeverity(760, 500, 1600, 1000);
      expect(severity).toBe('critical');
    });

    it('should return warning when exceeding target by 10-50%', () => {
      const severity = getSeverity(550, 500, 1100, 1000);
      expect(severity).toBe('warning');
    });

    it('should return warning when within target', () => {
      const severity = getSeverity(400, 500, 800, 1000);
      expect(severity).toBe('warning');
    });
  });

  describe('formatSLAViolation', () => {
    it('should format violation message correctly', () => {
      const violation = {
        endpoint: 'GET /api/dashboard',
        violations: ['P95 exceeded'],
        metrics: { p95: 1234.56, p99: 2000.78, count: 150 },
        sla: { p95MaxMs: 500, p99MaxMs: 1000 },
      };

      const formatted = formatSLAViolation(violation);

      expect(formatted).toContain('GET /api/dashboard');
      expect(formatted).toContain('150 requests');
      expect(formatted).toContain('1235ms');
      expect(formatted).toContain('500ms');
      expect(formatted).toContain('2001ms');
      expect(formatted).toContain('1000ms');
    });
  });
});
