import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  recordRateLimitViolation,
  getTelemetry,
  getTopViolators,
  resetTelemetry,
  shouldBlockClient,
} from '@/lib/rate-limiter-telemetry';
import * as alertHub from '@/lib/alert-hub';

vi.mock('@/lib/alert-hub', () => ({
  recordAlert: vi.fn(),
}));

describe('Rate Limiter Telemetry', () => {
  beforeEach(() => {
    resetTelemetry();
    vi.clearAllMocks();
  });

  describe('recordRateLimitViolation', () => {
    it('should record violations for new client', () => {
      recordRateLimitViolation('192.168.1.1');
      const telemetry = getTelemetry();

      expect(telemetry.totalViolations).toBe(1);
      expect(telemetry.uniqueClientsLimited).toBe(1);
      expect(telemetry.violationsByClient.get('192.168.1.1')).toBe(1);
    });

    it('should accumulate violations for same client', () => {
      recordRateLimitViolation('192.168.1.1');
      recordRateLimitViolation('192.168.1.1');
      recordRateLimitViolation('192.168.1.1');

      const telemetry = getTelemetry();
      expect(telemetry.totalViolations).toBe(3);
      expect(telemetry.violationsByClient.get('192.168.1.1')).toBe(3);
      expect(telemetry.uniqueClientsLimited).toBe(1);
    });

    it('should track multiple clients separately', () => {
      recordRateLimitViolation('192.168.1.1');
      recordRateLimitViolation('192.168.1.2');
      recordRateLimitViolation('192.168.1.1');

      const telemetry = getTelemetry();
      expect(telemetry.totalViolations).toBe(3);
      expect(telemetry.uniqueClientsLimited).toBe(2);
      expect(telemetry.violationsByClient.get('192.168.1.1')).toBe(2);
      expect(telemetry.violationsByClient.get('192.168.1.2')).toBe(1);
    });

    it('should detect burst behavior at threshold', () => {
      const client = '192.168.1.1';
      for (let i = 0; i < 5; i++) {
        recordRateLimitViolation(client);
      }

      expect(alertHub.recordAlert).toHaveBeenCalledWith(
        'production-health',
        'warning',
        expect.stringContaining('burst'),
        expect.any(String),
        expect.any(String)
      );
    });

    it('should detect abuse pattern at high violations', () => {
      const client = '192.168.1.1';
      for (let i = 0; i < 20; i++) {
        recordRateLimitViolation(client);
      }

      expect(alertHub.recordAlert).toHaveBeenCalledWith(
        'production-health',
        'critical',
        expect.stringContaining('abuse'),
        expect.any(String),
        expect.any(String)
      );
    });
  });

  describe('getTelemetry', () => {
    it('should return current telemetry snapshot', () => {
      recordRateLimitViolation('192.168.1.1');
      recordRateLimitViolation('192.168.1.1');

      const telemetry = getTelemetry();
      expect(telemetry.totalViolations).toBe(2);
      expect(telemetry.uniqueClientsLimited).toBe(1);
      expect(telemetry.lastViolation).toBeDefined();
    });

    it('should return independent copy of maps', () => {
      recordRateLimitViolation('192.168.1.1');
      const telemetry1 = getTelemetry();
      recordRateLimitViolation('192.168.1.2');
      const telemetry2 = getTelemetry();

      expect(telemetry1.violationsByClient.size).toBe(1);
      expect(telemetry2.violationsByClient.size).toBe(2);
    });
  });

  describe('getTopViolators', () => {
    it('should return top violators by count', () => {
      recordRateLimitViolation('client-a');
      recordRateLimitViolation('client-a');
      recordRateLimitViolation('client-a');
      recordRateLimitViolation('client-b');
      recordRateLimitViolation('client-b');
      recordRateLimitViolation('client-c');

      const top = getTopViolators(2);
      expect(top).toHaveLength(2);
      expect(top[0]).toEqual(['client-a', 3]);
      expect(top[1]).toEqual(['client-b', 2]);
    });

    it('should respect limit parameter', () => {
      for (let i = 1; i <= 5; i++) {
        recordRateLimitViolation(`client-${i}`);
      }

      const top = getTopViolators(2);
      expect(top).toHaveLength(2);
    });

    it('should return all clients if fewer than limit', () => {
      recordRateLimitViolation('client-a');
      recordRateLimitViolation('client-b');

      const top = getTopViolators(10);
      expect(top).toHaveLength(2);
    });
  });

  describe('shouldBlockClient', () => {
    it('should not block client below abuse threshold', () => {
      for (let i = 0; i < 10; i++) {
        recordRateLimitViolation('192.168.1.1');
      }

      expect(shouldBlockClient('192.168.1.1')).toBe(false);
    });

    it('should block client at abuse threshold', () => {
      for (let i = 0; i < 20; i++) {
        recordRateLimitViolation('192.168.1.1');
      }

      expect(shouldBlockClient('192.168.1.1')).toBe(true);
    });

    it('should not block unknown clients', () => {
      expect(shouldBlockClient('unknown-client')).toBe(false);
    });
  });

  describe('resetTelemetry', () => {
    it('should clear all telemetry data', () => {
      recordRateLimitViolation('192.168.1.1');
      recordRateLimitViolation('192.168.1.1');
      resetTelemetry();

      const telemetry = getTelemetry();
      expect(telemetry.totalViolations).toBe(0);
      expect(telemetry.uniqueClientsLimited).toBe(0);
      expect(telemetry.violationsByClient.size).toBe(0);
      expect(telemetry.lastViolation).toBeNull();
    });
  });
});
