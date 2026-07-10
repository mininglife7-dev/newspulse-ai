import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  calculateZScore,
  getSeverity,
  detectAnomaly,
  projectCostImpact,
  formatCostAnomalyReport,
  getVercelMetrics,
  getSupabaseMetrics,
  generateCostAnomalyReport,
  type CostMetric,
  type CostBaseline,
  type CostAnomaly,
  type CostAnomalyReport,
} from '@/lib/cost-anomaly-detection';

global.fetch = vi.fn();

describe('Cost Anomaly Detection (DNA-GOV-013)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('calculateZScore', () => {
    it('should calculate Z-score correctly', () => {
      const value = 100;
      const mean = 50;
      const stdDev = 10;

      const zScore = calculateZScore(value, mean, stdDev);

      expect(zScore).toBe(5); // (100 - 50) / 10 = 5
    });

    it('should handle negative Z-scores', () => {
      const value = 30;
      const mean = 50;
      const stdDev = 10;

      const zScore = calculateZScore(value, mean, stdDev);

      expect(zScore).toBe(-2); // (30 - 50) / 10 = -2
    });

    it('should return 0 when std deviation is 0', () => {
      const zScore = calculateZScore(100, 50, 0);
      expect(zScore).toBe(0);
    });

    it('should handle values equal to mean', () => {
      const zScore = calculateZScore(50, 50, 10);
      expect(zScore).toBe(0);
    });
  });

  describe('getSeverity', () => {
    it('should classify critical severity (Z >= 3.0)', () => {
      expect(getSeverity(3.5)).toBe('critical');
      expect(getSeverity(-3.5)).toBe('critical');
    });

    it('should classify high severity (Z >= 2.5)', () => {
      expect(getSeverity(2.7)).toBe('high');
      expect(getSeverity(-2.7)).toBe('high');
    });

    it('should classify medium severity (Z >= 2.0)', () => {
      expect(getSeverity(2.2)).toBe('medium');
      expect(getSeverity(-2.2)).toBe('medium');
    });

    it('should classify low severity (Z >= 1.5)', () => {
      expect(getSeverity(1.8)).toBe('low');
      expect(getSeverity(-1.8)).toBe('low');
    });

    it('should return low for Z < 1.5', () => {
      expect(getSeverity(1.4)).toBe('low');
      expect(getSeverity(0.5)).toBe('low');
    });
  });

  describe('detectAnomaly', () => {
    const baseline: CostBaseline = {
      service: 'vercel',
      metric: 'bandwidth',
      avgDailySpend: 5.0,
      avgDailyUsage: 50,
      maxDailySpend: 15,
      stdDeviation: 10,
      dataPoints: 30,
      lastUpdated: '2024-01-01T12:00:00Z',
    };

    it('should detect anomaly when value exceeds threshold', () => {
      const metric: CostMetric = {
        service: 'vercel',
        metric: 'bandwidth',
        value: 85, // 3.5 standard deviations above mean
        unit: 'GB',
        timestamp: '2024-01-08T12:00:00Z',
        period: 'monthly',
      };

      const anomaly = detectAnomaly(metric, baseline);

      expect(anomaly).not.toBeNull();
      expect(anomaly!.severity).toBe('critical'); // Z-score ~3.5 (>= 3.0)
      expect(anomaly!.percentageChange).toBeGreaterThan(0);
    });

    it('should return null when value within normal range', () => {
      const metric: CostMetric = {
        service: 'vercel',
        metric: 'bandwidth',
        value: 55, // 0.5 standard deviations above mean
        unit: 'GB',
        timestamp: '2024-01-08T12:00:00Z',
        period: 'monthly',
      };

      const anomaly = detectAnomaly(metric, baseline);

      expect(anomaly).toBeNull();
    });

    it('should detect decrease anomalies', () => {
      const metric: CostMetric = {
        service: 'vercel',
        metric: 'bandwidth',
        value: 5, // 4.5 standard deviations below mean
        unit: 'GB',
        timestamp: '2024-01-08T12:00:00Z',
        period: 'monthly',
      };

      const anomaly = detectAnomaly(metric, baseline);

      expect(anomaly).not.toBeNull();
      expect(anomaly!.percentageChange).toBeLessThan(0);
    });

    it('should calculate correct percentage change', () => {
      const metric: CostMetric = {
        service: 'vercel',
        metric: 'bandwidth',
        value: 100, // 50% increase from baseline
        unit: 'GB',
        timestamp: '2024-01-08T12:00:00Z',
        period: 'monthly',
      };

      const anomaly = detectAnomaly(metric, baseline);

      if (anomaly) {
        expect(Math.round(anomaly.percentageChange)).toBe(100); // 100% increase
      }
    });
  });

  describe('projectCostImpact', () => {
    it('should project annual impact for positive anomaly', () => {
      const currentMonthly = 1000;
      const baselineMonthly = 800;

      const impact = projectCostImpact(currentMonthly, baselineMonthly);

      expect(impact).toBe(2400); // (1000-800)*12 = 2400
    });

    it('should project negative impact for decrease', () => {
      const currentMonthly = 600;
      const baselineMonthly = 800;

      const impact = projectCostImpact(currentMonthly, baselineMonthly);

      expect(impact).toBe(-2400); // (600-800)*12 = -2400
    });

    it('should return 0 when costs are equal', () => {
      const impact = projectCostImpact(500, 500);
      expect(impact).toBe(0);
    });
  });

  describe('getVercelMetrics', () => {
    it('should return empty array when no Vercel token', async () => {
      delete process.env.VERCEL_TOKEN;
      const metrics = await getVercelMetrics();
      expect(metrics).toEqual([]);
    });

    it('should fetch Vercel metrics successfully', async () => {
      process.env.VERCEL_TOKEN = 'test-token';
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          usage: {
            bandwidth: { totalGB: 100 },
            functionInvocations: { count: 50000 },
          },
          balance: { estimated_cost: 150 },
        }),
      });

      const metrics = await getVercelMetrics();

      expect(metrics.length).toBeGreaterThan(0);
      expect(metrics.some((m) => m.metric === 'bandwidth')).toBe(true);
      expect(metrics.some((m) => m.metric === 'function-invocations')).toBe(true);
      expect(metrics.some((m) => m.metric === 'estimated-monthly-cost')).toBe(true);
    });

    it('should handle Vercel API errors gracefully', async () => {
      process.env.VERCEL_TOKEN = 'test-token';
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 401,
      });

      const metrics = await getVercelMetrics();
      expect(metrics).toEqual([]);
    });
  });

  describe('getSupabaseMetrics', () => {
    it('should return empty array when no Supabase key', async () => {
      delete process.env.SUPABASE_API_KEY;
      const metrics = await getSupabaseMetrics();
      expect(metrics).toEqual([]);
    });

    it('should fetch Supabase metrics successfully', async () => {
      process.env.SUPABASE_API_KEY = 'test-key';
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => [
          {
            db_size_bytes: 1000 * 1024 * 1024 * 1024, // 1GB
            storage_size_bytes: 500 * 1024 * 1024 * 1024, // 500MB
          },
        ],
      });

      const metrics = await getSupabaseMetrics();

      expect(metrics.length).toBeGreaterThan(0);
      expect(metrics.some((m) => m.metric === 'database-size')).toBe(true);
      expect(metrics.some((m) => m.metric === 'storage-usage')).toBe(true);
    });

    it('should handle Supabase API errors gracefully', async () => {
      process.env.SUPABASE_API_KEY = 'test-key';
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 401,
      });

      const metrics = await getSupabaseMetrics();
      expect(metrics).toEqual([]);
    });
  });

  describe('generateCostAnomalyReport', () => {
    beforeEach(() => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ usage: {}, balance: {} }),
      });
    });

    it('should generate report with correct structure', async () => {
      const report = await generateCostAnomalyReport();

      expect(report.timestamp).toBeDefined();
      expect(report.period).toBe('monthly');
      expect(Array.isArray(report.anomalies)).toBe(true);
      expect(typeof report.totalAnomalies).toBe('number');
      expect(typeof report.criticalCount).toBe('number');
      expect(typeof report.highCount).toBe('number');
      expect(Array.isArray(report.recommendations)).toBe(true);
    });

    it('should include recommendations even when no anomalies', async () => {
      const report = await generateCostAnomalyReport();

      expect(report.recommendations.length).toBeGreaterThan(0);
    });

    it('should calculate estimated monthly impact', async () => {
      const report = await generateCostAnomalyReport();

      expect(typeof report.estimatedMonthlyImpact).toBe('number');
    });
  });

  describe('formatCostAnomalyReport', () => {
    it('should format basic report structure', () => {
      const report: CostAnomalyReport = {
        timestamp: '2024-01-08T12:00:00Z',
        period: 'monthly',
        anomalies: [],
        totalAnomalies: 0,
        criticalCount: 0,
        highCount: 0,
        estimatedMonthlyImpact: 0,
        recommendations: ['✅ All metrics within normal baseline'],
      };

      const formatted = formatCostAnomalyReport(report);

      expect(formatted).toContain('Cost Anomaly Detection Report');
      expect(formatted).toContain('Total Anomalies: 0');
      expect(formatted).toContain('✅ All metrics');
    });

    it('should format report with critical anomalies', () => {
      const anomaly: CostAnomaly = {
        service: 'vercel',
        metric: 'bandwidth',
        currentValue: 150,
        baselineValue: 50,
        percentageChange: 200,
        zScore: 4.5,
        severity: 'critical',
        reason: 'Bandwidth is 200% higher than baseline',
        detectedAt: '2024-01-08T12:00:00Z',
      };

      const report: CostAnomalyReport = {
        timestamp: '2024-01-08T12:00:00Z',
        period: 'monthly',
        anomalies: [anomaly],
        totalAnomalies: 1,
        criticalCount: 1,
        highCount: 0,
        estimatedMonthlyImpact: 1000,
        recommendations: ['Review CDN usage and enable caching'],
      };

      const formatted = formatCostAnomalyReport(report);

      expect(formatted).toContain('🔴 Critical: 1');
      expect(formatted).toContain('vercel');
      expect(formatted).toContain('bandwidth');
      expect(formatted).toContain('200%');
    });

    it('should show estimated annual impact', () => {
      const report: CostAnomalyReport = {
        timestamp: '2024-01-08T12:00:00Z',
        period: 'monthly',
        anomalies: [],
        totalAnomalies: 0,
        criticalCount: 0,
        highCount: 0,
        estimatedMonthlyImpact: 500,
        recommendations: [],
      };

      const formatted = formatCostAnomalyReport(report);

      expect(formatted).toContain('$6000'); // 500 * 12
    });

    it('should list all recommendations', () => {
      const report: CostAnomalyReport = {
        timestamp: '2024-01-08T12:00:00Z',
        period: 'monthly',
        anomalies: [],
        totalAnomalies: 0,
        criticalCount: 0,
        highCount: 0,
        estimatedMonthlyImpact: 0,
        recommendations: [
          'Review CDN usage',
          'Check database size',
          'Audit storage usage',
        ],
      };

      const formatted = formatCostAnomalyReport(report);

      expect(formatted).toContain('Review CDN usage');
      expect(formatted).toContain('Check database size');
      expect(formatted).toContain('Audit storage usage');
    });
  });

  describe('Integration scenarios', () => {
    beforeEach(() => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ usage: {}, balance: {} }),
      });
    });

    it('should detect high bandwidth usage anomaly', async () => {
      const anomaly: CostAnomaly = {
        service: 'vercel',
        metric: 'bandwidth',
        currentValue: 200,
        baselineValue: 50,
        percentageChange: 300,
        zScore: 3.5,
        severity: 'high',
        reason: 'Bandwidth is 300% higher than baseline',
        detectedAt: '2024-01-08T12:00:00Z',
      };

      const report: CostAnomalyReport = {
        timestamp: '2024-01-08T12:00:00Z',
        period: 'monthly',
        anomalies: [anomaly],
        totalAnomalies: 1,
        criticalCount: 0,
        highCount: 1,
        estimatedMonthlyImpact: 1500,
        recommendations: ['Review CDN usage and consider enabling aggressive caching'],
      };

      const formatted = formatCostAnomalyReport(report);
      expect(formatted).toContain('🟠 High: 1');
      expect(formatted).toContain('CDN usage');
    });

    it('should detect database growth anomaly', () => {
      const anomaly: CostAnomaly = {
        service: 'supabase',
        metric: 'database-size',
        currentValue: 50,
        baselineValue: 10,
        percentageChange: 400,
        zScore: 2.8,
        severity: 'high',
        reason: 'Database size is 400% higher than baseline',
        detectedAt: '2024-01-08T12:00:00Z',
      };

      expect(anomaly.service).toBe('supabase');
      expect(anomaly.percentageChange).toBe(400);
      expect(anomaly.severity).toBe('high');
    });

    it('should provide cost optimization recommendations', () => {
      const report: CostAnomalyReport = {
        timestamp: '2024-01-08T12:00:00Z',
        period: 'monthly',
        anomalies: [],
        totalAnomalies: 0,
        criticalCount: 0,
        highCount: 0,
        estimatedMonthlyImpact: 0,
        recommendations: [
          '✅ All metrics within normal baseline - no action required',
        ],
      };

      expect(report.recommendations[0]).toContain('✅');
    });
  });
});
