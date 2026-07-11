import { describe, it, expect, beforeEach, vi } from 'vitest';
import { VercelErrorCollector } from '../lib/vercel-error-collector';
import { ErrorMetrics, ErrorPattern } from '../lib/error-tracking';

describe('DNS-027: Vercel Error Collector', () => {
  let collector: VercelErrorCollector;

  beforeEach(() => {
    collector = new VercelErrorCollector('test-token-12345', 'test-project-id');
  });

  describe('Initialization', () => {
    it('should initialize with valid token and project ID', () => {
      expect(() => {
        new VercelErrorCollector('token', 'project-id');
      }).not.toThrow();
    });

    it('should throw if token is missing', () => {
      expect(() => {
        new VercelErrorCollector('', 'project-id');
      }).toThrow('VercelErrorCollector requires VERCEL_API_TOKEN and project ID');
    });

    it('should throw if project ID is missing', () => {
      expect(() => {
        new VercelErrorCollector('token', '');
      }).toThrow('VercelErrorCollector requires VERCEL_API_TOKEN and project ID');
    });
  });

  describe('Error Pattern Extraction', () => {
    it('should extract error patterns from log entries', async () => {
      const errorEntries = [
        {
          timestamp: '2026-07-11T00:00:00Z',
          path: '/api/search',
          method: 'POST',
          status: 500,
          message: 'Database connection refused',
          userAgent: 'curl',
          ip: '192.168.1.1',
        },
        {
          timestamp: '2026-07-11T00:01:00Z',
          path: '/api/search',
          method: 'POST',
          status: 500,
          message: 'Database connection refused',
          userAgent: 'curl',
          ip: '192.168.1.2',
        },
      ];

      const patterns = await collector.extractErrorPatterns(errorEntries);

      expect(patterns).toHaveLength(1);
      expect(patterns[0].occurrenceCount).toBe(2);
      expect(patterns[0].category).toBe('database');
      expect(patterns[0].severity).toBe('critical');
    });

    it('should categorize different error types', async () => {
      const errorEntries = [
        {
          timestamp: '2026-07-11T00:00:00Z',
          path: '/api/search',
          method: 'POST',
          status: 504,
          message: 'Request timeout after 30s',
          userAgent: 'curl',
          ip: '192.168.1.1',
        },
        {
          timestamp: '2026-07-11T00:01:00Z',
          path: '/api/history',
          method: 'GET',
          status: 500,
          message: 'Cannot read property of undefined',
          userAgent: 'curl',
          ip: '192.168.1.1',
        },
      ];

      const patterns = await collector.extractErrorPatterns(errorEntries);

      expect(patterns.length).toBeGreaterThanOrEqual(1);
      const categories = patterns.map((p) => p.category);
      expect(categories).toContain('runtime');
    });

    it('should infer correct severity from HTTP status', async () => {
      const errorEntries = [
        {
          timestamp: '2026-07-11T00:00:00Z',
          path: '/api/test',
          method: 'GET',
          status: 503,
          message: 'Service unavailable',
          userAgent: 'curl',
          ip: '192.168.1.1',
        },
        {
          timestamp: '2026-07-11T00:01:00Z',
          path: '/api/test',
          method: 'GET',
          status: 401,
          message: 'Unauthorized',
          userAgent: 'curl',
          ip: '192.168.1.1',
        },
      ];

      const patterns = await collector.extractErrorPatterns(errorEntries);

      const critical = patterns.find((p) => p.severity === 'critical');
      const high = patterns.find((p) => p.severity === 'high');

      expect(critical).toBeDefined();
      expect(high).toBeDefined();
    });

    it('should aggregate duplicate error patterns', async () => {
      const errorEntries = Array.from({ length: 50 }, (_, i) => ({
        timestamp: `2026-07-11T00:${String(i).padStart(2, '0')}:00Z`,
        path: '/api/search',
        method: 'POST',
        status: 500,
        message: 'Database connection refused',
        userAgent: 'curl',
        ip: '192.168.1.1',
      }));

      const patterns = await collector.extractErrorPatterns(errorEntries);

      expect(patterns).toHaveLength(1);
      expect(patterns[0].occurrenceCount).toBe(50);
      expect(patterns[0].firstSeen).toBe(errorEntries[0].timestamp);
      expect(patterns[0].lastSeen).toBe(errorEntries[49].timestamp);
    });

    it('should identify affected services from request path', async () => {
      const errorEntries = [
        {
          timestamp: '2026-07-11T00:00:00Z',
          path: '/api/search',
          method: 'POST',
          status: 500,
          message: 'Error',
          userAgent: 'curl',
          ip: '192.168.1.1',
        },
      ];

      const patterns = await collector.extractErrorPatterns(errorEntries);

      expect(patterns[0].affectedServices).toContain('api');
    });
  });

  describe('Metrics Parsing', () => {
    it('should parse deployment metrics', async () => {
      const mockDeployment = {
        uid: 'dpl-123',
        createdAt: '2026-07-11T00:00:00Z',
        status: 'READY',
      };

      const metrics = await collector.parseDeploymentMetrics(mockDeployment);

      expect(metrics).toHaveProperty('timestamp');
      expect(metrics).toHaveProperty('totalErrors');
      expect(metrics).toHaveProperty('errorRate');
      expect(metrics).toHaveProperty('errorsByCategory');
      expect(metrics).toHaveProperty('errorsBySeverity');
    });

    it('should estimate higher error count for failed deployments', async () => {
      const mockDeploymentError = {
        uid: 'dpl-error',
        createdAt: '2026-07-11T00:00:00Z',
        status: 'ERROR',
      };

      const metricsError = await collector.parseDeploymentMetrics(mockDeploymentError);

      expect(metricsError.totalErrors).toBeGreaterThan(50);
    });

    it('should cache metrics to avoid repeated API calls', async () => {
      const mockDeployment = {
        uid: 'dpl-cached',
        createdAt: '2026-07-11T00:00:00Z',
        status: 'READY',
      };

      const metrics1 = await collector.parseDeploymentMetrics(mockDeployment);
      const metrics2 = await collector.parseDeploymentMetrics(mockDeployment);

      // Should be same object (cached)
      expect(metrics1).toBe(metrics2);
    });

    it('should categorize errors by type and severity', async () => {
      const mockDeployment = {
        uid: 'dpl-123',
        createdAt: '2026-07-11T00:00:00Z',
        status: 'ERROR',
      };

      const metrics = await collector.parseDeploymentMetrics(mockDeployment);

      expect(metrics.errorsByCategory).toHaveProperty('api');
      expect(metrics.errorsByCategory).toHaveProperty('database');
      expect(metrics.errorsBySeverity).toHaveProperty('critical');
      expect(metrics.errorsBySeverity).toHaveProperty('high');
    });
  });

  describe('Error Collection and Processing', () => {
    it('should return empty metrics when deployment is not found', async () => {
      const result = await collector.collectAndProcess('deployment-404');

      expect(result.metrics.totalErrors).toBe(0);
      expect(result.patterns).toHaveLength(0);
      expect(result.incidents).toHaveLength(0);
    });

    it('should structure result with metrics, patterns, incidents, and alerts', async () => {
      const result = await collector.collectAndProcess('test-deployment');

      expect(result).toHaveProperty('metrics');
      expect(result).toHaveProperty('patterns');
      expect(result).toHaveProperty('incidents');
      expect(result).toHaveProperty('alerts');
    });

    it('should only wire errors when patterns exist', async () => {
      const result = await collector.collectAndProcess('healthy-deployment');

      if (result.patterns.length === 0) {
        expect(result.incidents).toHaveLength(0);
        expect(result.alerts).toHaveLength(0);
      }
    });
  });

  describe('Error Categorization', () => {
    it('should identify timeout errors', async () => {
      const errorEntries = [
        {
          timestamp: '2026-07-11T00:00:00Z',
          path: '/api/test',
          method: 'GET',
          status: 504,
          message: 'Request timeout after 30 seconds',
          userAgent: 'curl',
          ip: '192.168.1.1',
        },
      ];

      const patterns = await collector.extractErrorPatterns(errorEntries);

      expect(patterns[0].category).toBe('runtime');
    });

    it('should identify database errors', async () => {
      const errorEntries = [
        {
          timestamp: '2026-07-11T00:00:00Z',
          path: '/api/test',
          method: 'GET',
          status: 503,
          message: 'Connection refused to database server',
          userAgent: 'curl',
          ip: '192.168.1.1',
        },
      ];

      const patterns = await collector.extractErrorPatterns(errorEntries);

      expect(patterns[0].category).toBe('database');
    });

    it('should identify API errors', async () => {
      const errorEntries = [
        {
          timestamp: '2026-07-11T00:00:00Z',
          path: '/api/test',
          method: 'GET',
          status: 500,
          message: 'Failed to fetch from external API',
          userAgent: 'curl',
          ip: '192.168.1.1',
        },
      ];

      const patterns = await collector.extractErrorPatterns(errorEntries);

      expect(patterns[0].category).toBe('api');
    });

    it('should identify type errors', async () => {
      const errorEntries = [
        {
          timestamp: '2026-07-11T00:00:00Z',
          path: '/api/test',
          method: 'GET',
          status: 500,
          message: 'Cannot read property of null or undefined',
          userAgent: 'curl',
          ip: '192.168.1.1',
        },
      ];

      const patterns = await collector.extractErrorPatterns(errorEntries);

      expect(patterns[0].category).toBe('runtime');
    });
  });

  describe('Fingerprinting', () => {
    it('should normalize error messages to consistent fingerprints', async () => {
      const errorEntries1 = [
        {
          timestamp: '2026-07-11T00:00:00Z',
          path: '/api/test',
          method: 'GET',
          status: 500,
          message: 'Database error code 12345',
          userAgent: 'curl',
          ip: '192.168.1.1',
        },
      ];

      const errorEntries2 = [
        {
          timestamp: '2026-07-11T00:01:00Z',
          path: '/api/test',
          method: 'GET',
          status: 500,
          message: 'Database error code 67890',
          userAgent: 'curl',
          ip: '192.168.1.2',
        },
      ];

      const patterns1 = await collector.extractErrorPatterns(errorEntries1);
      const patterns2 = await collector.extractErrorPatterns(errorEntries2);

      // Both should produce the same fingerprint (numbers replaced with N)
      expect(patterns1[0].fingerprint).toBe(patterns2[0].fingerprint);
    });
  });
});
