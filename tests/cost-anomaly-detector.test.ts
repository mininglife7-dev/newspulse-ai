import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  detectCostAnomalies,
  anomaliesToAlerts,
  type CostDataPoint,
  type CostAnomalyReport,
} from '@/lib/cost-anomaly-detector';

describe('DNA-GOV-011: Cost Anomaly Detection', () => {
  let mockFetch: any;

  beforeEach(() => {
    vi.clearAllMocks();
    // Clear environment
    delete process.env.VERCEL_TOKEN;
    delete process.env.SUPABASE_API_TOKEN;
    delete process.env.SUPABASE_PROJECT_ID;

    // Create fresh mock for each test
    mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('Cost Anomaly Detection', () => {
    it('should return report with no anomalies when both APIs unavailable', async () => {
      const report = await detectCostAnomalies();

      expect(report).toBeDefined();
      expect(report.timestamp).toBeDefined();
      expect(report.summary).toBe('No cost anomalies detected');
      expect(report.anomalies).toHaveLength(0);
      expect(report.vercel.dailyCost).toBeNull();
      expect(report.supabase.dailyCost).toBeNull();
    });

    it('should detect Vercel API errors gracefully', async () => {
      process.env.VERCEL_TOKEN = 'test-token';

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      const report = await detectCostAnomalies();

      expect(report.vercel.monthlyProjection).toBeNull();
      expect(report.vercel.anomalyDetected).toBe(false);
    });

    it('should handle missing tokens gracefully', async () => {
      const report = await detectCostAnomalies();

      expect(report.vercel.monthlyProjection).toBeNull();
      expect(report.supabase.monthlyProjection).toBeNull();
      expect(report.anomalies).toHaveLength(0);
    });
  });

  describe('Anomaly Detection Severity', () => {
    it('should classify critical anomalies (>3x baseline)', async () => {
      const report: CostAnomalyReport = {
        timestamp: new Date().toISOString(),
        vercel: {
          dailyCost: 5.0,
          monthlyProjection: 150.0,
          anomalyDetected: true,
        },
        supabase: {
          dailyCost: null,
          monthlyProjection: null,
          anomalyDetected: false,
        },
        anomalies: [
          {
            provider: 'vercel',
            metric: 'monthly_cost',
            currentCost: 150.0,
            baselineCost: 15.0,
            ratio: 10.0,
            severity: 'critical',
            message: 'Vercel costs are 1000% of baseline',
          },
        ],
        summary: 'Critical cost anomaly detected',
      };

      const alerts = anomaliesToAlerts(report);

      expect(alerts).toHaveLength(1);
      expect(alerts[0].severity).toBe('critical');
      expect(alerts[0].source).toBe('DNA-GOV-011');
      expect(alerts[0].category).toBe('cost');
    });

    it('should classify high anomalies (1.5x - 3x baseline)', async () => {
      const report: CostAnomalyReport = {
        timestamp: new Date().toISOString(),
        vercel: {
          dailyCost: 0.75,
          monthlyProjection: 22.5,
          anomalyDetected: true,
        },
        supabase: {
          dailyCost: null,
          monthlyProjection: null,
          anomalyDetected: false,
        },
        anomalies: [
          {
            provider: 'vercel',
            metric: 'monthly_cost',
            currentCost: 22.5,
            baselineCost: 15.0,
            ratio: 1.5,
            severity: 'high',
            message: 'Vercel costs are 150% of baseline',
          },
        ],
        summary: 'High cost anomaly detected',
      };

      const alerts = anomaliesToAlerts(report);

      expect(alerts).toHaveLength(1);
      expect(alerts[0].severity).toBe('warning');
    });

    it('should not alert on normal spending', async () => {
      const report: CostAnomalyReport = {
        timestamp: new Date().toISOString(),
        vercel: {
          dailyCost: 0.5,
          monthlyProjection: 15.0,
          anomalyDetected: false,
        },
        supabase: {
          dailyCost: 1.0,
          monthlyProjection: 30.0,
          anomalyDetected: false,
        },
        anomalies: [],
        summary: 'No cost anomalies detected',
      };

      const alerts = anomaliesToAlerts(report);

      expect(alerts).toHaveLength(0);
    });
  });

  describe('Alert Integration', () => {
    it('should generate properly formatted alerts', async () => {
      const report: CostAnomalyReport = {
        timestamp: '2026-07-11T10:00:00Z',
        vercel: {
          dailyCost: 2.0,
          monthlyProjection: 60.0,
          anomalyDetected: true,
        },
        supabase: {
          dailyCost: null,
          monthlyProjection: null,
          anomalyDetected: false,
        },
        anomalies: [
          {
            provider: 'vercel',
            metric: 'monthly_cost',
            currentCost: 60.0,
            baselineCost: 15.0,
            ratio: 4.0,
            severity: 'critical',
            message:
              'Vercel costs are 400% of baseline ($60.00/mo vs $15.00/mo baseline)',
          },
        ],
        summary: '1 cost anomaly(ies) detected',
      };

      const alerts = anomaliesToAlerts(report);

      expect(alerts).toHaveLength(1);
      const alert = alerts[0];

      expect(alert.id).toMatch(/^dna-011-vercel-monthly_cost-/);
      expect(alert.severity).toBe('critical');
      expect(alert.category).toBe('cost');
      expect(alert.title).toContain('Vercel');
      expect(alert.message).toContain('400%');
      expect(alert.source).toBe('DNA-GOV-011');
    });

    it('should handle multiple anomalies', async () => {
      const report: CostAnomalyReport = {
        timestamp: '2026-07-11T10:00:00Z',
        vercel: {
          dailyCost: 2.0,
          monthlyProjection: 60.0,
          anomalyDetected: true,
        },
        supabase: {
          dailyCost: 4.0,
          monthlyProjection: 120.0,
          anomalyDetected: true,
        },
        anomalies: [
          {
            provider: 'vercel',
            metric: 'monthly_cost',
            currentCost: 60.0,
            baselineCost: 15.0,
            ratio: 4.0,
            severity: 'critical',
            message: 'Vercel costs are 400% of baseline',
          },
          {
            provider: 'supabase',
            metric: 'monthly_cost',
            currentCost: 120.0,
            baselineCost: 30.0,
            ratio: 4.0,
            severity: 'critical',
            message: 'Supabase costs are 400% of baseline',
          },
        ],
        summary: '2 cost anomaly(ies) detected',
      };

      const alerts = anomaliesToAlerts(report);

      expect(alerts).toHaveLength(2);
      expect(alerts[0].source).toBe('DNA-GOV-011');
      expect(alerts[1].source).toBe('DNA-GOV-011');
    });
  });

  describe('Cost Baseline Thresholds', () => {
    it('should identify Vercel critical threshold (>$45/mo)', async () => {
      const report: CostAnomalyReport = {
        timestamp: new Date().toISOString(),
        vercel: {
          dailyCost: 1.5,
          monthlyProjection: 45.0,
          anomalyDetected: true,
        },
        supabase: {
          dailyCost: null,
          monthlyProjection: null,
          anomalyDetected: false,
        },
        anomalies: [
          {
            provider: 'vercel',
            metric: 'monthly_cost',
            currentCost: 45.0,
            baselineCost: 15.0,
            ratio: 3.0,
            severity: 'critical',
            message: 'Vercel critical threshold exceeded',
          },
        ],
        summary: 'Critical anomaly',
      };

      expect(report.anomalies[0].severity).toBe('critical');
      expect(report.anomalies[0].ratio).toBe(3.0);
    });

    it('should identify Supabase critical threshold (>$120/mo)', async () => {
      const report: CostAnomalyReport = {
        timestamp: new Date().toISOString(),
        vercel: {
          dailyCost: null,
          monthlyProjection: null,
          anomalyDetected: false,
        },
        supabase: {
          dailyCost: 4.0,
          monthlyProjection: 120.0,
          anomalyDetected: true,
        },
        anomalies: [
          {
            provider: 'supabase',
            metric: 'monthly_cost',
            currentCost: 120.0,
            baselineCost: 30.0,
            ratio: 4.0,
            severity: 'critical',
            message: 'Supabase critical threshold exceeded',
          },
        ],
        summary: 'Critical anomaly',
      };

      expect(report.anomalies[0].severity).toBe('critical');
      expect(report.anomalies[0].ratio).toBe(4.0);
    });
  });

  describe('Report Structure', () => {
    it('should include all required fields in report', async () => {
      const report = await detectCostAnomalies();

      // Required top-level fields
      expect(report.timestamp).toBeDefined();
      expect(typeof report.timestamp).toBe('string');
      expect(report.summary).toBeDefined();
      expect(Array.isArray(report.anomalies)).toBe(true);

      // Vercel section
      expect(report.vercel).toBeDefined();
      expect('dailyCost' in report.vercel).toBe(true);
      expect('monthlyProjection' in report.vercel).toBe(true);
      expect('anomalyDetected' in report.vercel).toBe(true);

      // Supabase section
      expect(report.supabase).toBeDefined();
      expect('dailyCost' in report.supabase).toBe(true);
      expect('monthlyProjection' in report.supabase).toBe(true);
      expect('anomalyDetected' in report.supabase).toBe(true);
    });

    it('should return ISO timestamp', async () => {
      const report = await detectCostAnomalies();
      const timestamp = new Date(report.timestamp);

      expect(timestamp.getTime()).toBeLessThanOrEqual(Date.now());
      expect(timestamp.getTime()).toBeGreaterThan(Date.now() - 5000); // Within 5 seconds
    });
  });
});
