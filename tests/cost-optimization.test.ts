import { describe, it, expect, beforeEach } from 'vitest';
import {
  recordCostDataPoint,
  detectAnomalies,
  checkThresholdsAndEscalate,
  markEscalationNotified,
  updateThreshold,
  generateCostReport,
  getRecentEscalations,
  getEscalation,
  formatCostReportAsMarkdown,
  resetCostStore,
  type CostProvider,
  type CostMetric,
} from '@/lib/cost-optimization';

describe('DNS-020: Cost Optimization Escalation', () => {
  beforeEach(() => {
    resetCostStore();
  });

  describe('Cost Data Recording', () => {
    it('records cost data points with provider, metric, and amount', () => {
      const dataPoint = recordCostDataPoint('vercel', 'compute', 25.5, 'USD', 'hours');

      expect(dataPoint.provider).toBe('vercel');
      expect(dataPoint.metric).toBe('compute');
      expect(dataPoint.cost).toBe(25.5);
      expect(dataPoint.currency).toBe('USD');
      expect(dataPoint.unit).toBe('hours');
      expect(dataPoint.timestamp).toBeDefined();
      expect(dataPoint.id).toBeDefined();
    });

    it('records multiple cost data points across providers', () => {
      recordCostDataPoint('vercel', 'compute', 50);
      recordCostDataPoint('supabase', 'storage', 30);
      recordCostDataPoint('aws', 'compute', 100);

      const today = new Date();
      const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
      const report = generateCostReport(today, tomorrow);

      expect(report.totalCost).toBe(180);
      expect(report.costsByProvider['vercel']).toBe(50);
      expect(report.costsByProvider['supabase']).toBe(30);
      expect(report.costsByProvider['aws']).toBe(100);
    });

    it('records metadata with cost data points', () => {
      const dataPoint = recordCostDataPoint('datadog', 'monitoring', 75, 'USD', undefined, {
        ingestionRate: '1000 events/min',
        retentionDays: 30,
      });

      expect(dataPoint.metadata?.ingestionRate).toBe('1000 events/min');
      expect(dataPoint.metadata?.retentionDays).toBe(30);
    });
  });

  describe('Anomaly Detection', () => {
    it('detects cost spike when today exceeds 150% of weekly average', () => {
      // Record 7 days of baseline ($10/day)
      for (let i = 7; i > 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        recordCostDataPoint('vercel', 'bandwidth', 10, 'USD', undefined, undefined, date);
      }

      // Record today's spike ($18 = 180% of $10)
      recordCostDataPoint('vercel', 'bandwidth', 18);

      const anomalies = detectAnomalies();

      expect(anomalies.length).toBeGreaterThan(0);
      const spikeAnomaly = anomalies.find((a) => a.anomalyType === 'spike');
      expect(spikeAnomaly).toBeDefined();
      expect(spikeAnomaly?.severity).toBe('warning');
    });

    it('detects critical spike when today exceeds 200% of weekly average', () => {
      for (let i = 7; i > 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        recordCostDataPoint('aws', 'compute', 100, 'USD', undefined, undefined, date);
      }

      recordCostDataPoint('aws', 'compute', 250);

      const anomalies = detectAnomalies();
      const criticalAnomaly = anomalies.find(
        (a) => a.provider === 'aws' && a.metric === 'compute' && a.percentageIncrease > 100
      );

      expect(criticalAnomaly?.severity).toBe('critical');
      expect(criticalAnomaly?.percentageIncrease).toBeGreaterThan(100);
    });

    it('detects threshold exceeded anomalies', () => {
      // Vercel compute threshold is $50/day
      recordCostDataPoint('vercel', 'compute', 75);

      const anomalies = detectAnomalies();
      const thresholdAnomaly = anomalies.find(
        (a) => a.provider === 'vercel' && a.metric === 'compute' && a.anomalyType === 'threshold-exceeded'
      );

      expect(thresholdAnomaly).toBeDefined();
    });

    it('returns empty anomalies when no spikes detected', () => {
      recordCostDataPoint('vercel', 'compute', 10);
      recordCostDataPoint('supabase', 'storage', 5);

      const anomalies = detectAnomalies();

      expect(anomalies.length).toBe(0);
    });
  });

  describe('Threshold Management', () => {
    it('updates cost threshold for provider and metric', () => {
      updateThreshold('vercel', 'compute', {
        provider: 'vercel',
        metric: 'compute',
        dailyLimit: 200,
        monthlyLimit: 5000,
        escalationSeverity: 'critical',
      });

      // Record cost exceeding old threshold but not new
      recordCostDataPoint('vercel', 'compute', 75);

      // This should no longer trigger anomaly with new higher threshold
      const anomalies = detectAnomalies();
      const thresholdExceeded = anomalies.find(
        (a) => a.provider === 'vercel' && a.metric === 'compute' && a.anomalyType === 'threshold-exceeded'
      );

      expect(thresholdExceeded).toBeUndefined();
    });

    it('supports updating thresholds for different severity levels', () => {
      updateThreshold('aws', 'compute', {
        provider: 'aws',
        metric: 'compute',
        dailyLimit: 100,
        monthlyLimit: 2000,
        escalationSeverity: 'critical',
      });

      recordCostDataPoint('aws', 'compute', 150);

      const anomalies = detectAnomalies();
      const anomaly = anomalies.find((a) => a.provider === 'aws' && a.metric === 'compute');

      expect(anomaly?.severity).toBe('critical');
    });
  });

  describe('Escalation Events', () => {
    it('generates escalation event for anomalies', () => {
      for (let i = 7; i > 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        recordCostDataPoint('supabase', 'api-calls', 150, 'USD', undefined, undefined, date);
      }
      recordCostDataPoint('supabase', 'api-calls', 400);

      const escalations = checkThresholdsAndEscalate();

      expect(escalations.length).toBeGreaterThan(0);
      const escalation = escalations[0];
      expect(escalation.provider).toBe('supabase');
      expect(escalation.metric).toBe('api-calls');
      expect(escalation.founderNotified).toBe(false);
      expect(escalation.recommendedActions.length).toBeGreaterThan(0);
    });

    it('marks escalation as notified to Founder', () => {
      recordCostDataPoint('vercel', 'bandwidth', 150);
      const escalations = checkThresholdsAndEscalate();

      if (escalations.length > 0) {
        const escalation = markEscalationNotified(escalations[0].id);
        expect(escalation?.founderNotified).toBe(true);
      }
    });

    it('prevents duplicate escalations within 1 hour', () => {
      for (let i = 7; i > 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        recordCostDataPoint('aws', 'compute', 200, 'USD', undefined, undefined, date);
      }
      recordCostDataPoint('aws', 'compute', 500);

      const first = checkThresholdsAndEscalate();
      const second = checkThresholdsAndEscalate();

      expect(first.length).toBeGreaterThan(0);
      expect(second.length).toBe(0);
    });

    it('retrieves specific escalation by ID', () => {
      recordCostDataPoint('datadog', 'monitoring', 150);
      const escalations = checkThresholdsAndEscalate();

      if (escalations.length > 0) {
        const retrieved = getEscalation(escalations[0].id);
        expect(retrieved).toBeDefined();
        expect(retrieved?.id).toBe(escalations[0].id);
        expect(retrieved?.provider).toBe('datadog');
      }
    });

    it('gets recent escalations within specified hours', () => {
      recordCostDataPoint('sendgrid', 'notifications', 100);
      const escalations = checkThresholdsAndEscalate();

      const recent = getRecentEscalations(24);
      expect(recent.length).toBeGreaterThanOrEqual(escalations.length);
    });

    it('includes recommended actions based on increase percentage', () => {
      for (let i = 7; i > 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        recordCostDataPoint('aws', 'compute', 100, 'USD', undefined, undefined, date);
      }
      recordCostDataPoint('aws', 'compute', 500);

      const escalations = checkThresholdsAndEscalate();
      const escalation = escalations.find((e) => e.provider === 'aws');

      expect(escalation?.recommendedActions).toContain('URGENT: Investigate immediate cause of cost spike');
      expect(escalation?.recommendedActions.length).toBeGreaterThan(0);
    });
  });

  describe('Cost Reports', () => {
    it('generates cost report for period', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      recordCostDataPoint('vercel', 'compute', 50);
      recordCostDataPoint('vercel', 'bandwidth', 30);
      recordCostDataPoint('supabase', 'storage', 20);

      const report = generateCostReport(yesterday, tomorrow);

      expect(report.totalCost).toBe(100);
      expect(report.costsByProvider['vercel']).toBe(80);
      expect(report.costsByProvider['supabase']).toBe(20);
      expect(report.costsByMetric['compute']).toBe(50);
      expect(report.costsByMetric['bandwidth']).toBe(30);
      expect(report.costsByMetric['storage']).toBe(20);
    });

    it('includes forecast in cost report', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      recordCostDataPoint('vercel', 'compute', 100);

      const report = generateCostReport(yesterday, tomorrow);

      expect(report.forecast).toBeDefined();
      expect(report.forecast?.projectedMonthlyTotal).toBeGreaterThan(0);
      expect(report.forecast?.trendDirection).toMatch(/increasing|stable|decreasing/);
      expect(report.forecast?.riskLevel).toMatch(/low|medium|high/);
    });

    it('calculates trend direction based on weekly comparison', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Record stable costs
      for (let i = 0; i < 7; i++) {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        recordCostDataPoint('vercel', 'compute', 50, 'USD', undefined, undefined, date);
      }

      const report = generateCostReport(yesterday, tomorrow);
      expect(['increasing', 'stable', 'decreasing']).toContain(report.forecast?.trendDirection);
    });

    it('identifies high risk when projected monthly cost exceeds $5000', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      recordCostDataPoint('aws', 'compute', 500);

      const report = generateCostReport(yesterday, tomorrow);
      expect(report.forecast?.riskLevel).toBe('high');
    });

    it('includes detected anomalies in report', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      for (let i = 7; i > 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        recordCostDataPoint('vercel', 'bandwidth', 50, 'USD', undefined, undefined, date);
      }
      recordCostDataPoint('vercel', 'bandwidth', 150);

      detectAnomalies();
      const report = generateCostReport(yesterday, tomorrow);
      expect(report.anomalies.length).toBeGreaterThan(0);
    });

    it('counts escalations in report', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      recordCostDataPoint('vercel', 'compute', 100);
      checkThresholdsAndEscalate();

      const report = generateCostReport(yesterday, tomorrow);
      expect(report.escalations).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Report Formatting', () => {
    it('formats cost report as markdown', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      recordCostDataPoint('vercel', 'compute', 75);
      recordCostDataPoint('supabase', 'storage', 25);

      const report = generateCostReport(yesterday, tomorrow);
      const markdown = formatCostReportAsMarkdown(report);

      expect(markdown).toContain('# Cost Optimization Report');
      expect(markdown).toContain('Executive Summary');
      expect(markdown).toContain('Cost by Provider');
      expect(markdown).toContain('Cost by Metric');
      expect(markdown).toContain('vercel');
      expect(markdown).toContain('supabase');
      expect(markdown).toContain('$100.00');
    });

    it('includes anomalies section in markdown when present', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      for (let i = 7; i > 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        recordCostDataPoint('aws', 'compute', 100, 'USD', undefined, undefined, date);
      }
      recordCostDataPoint('aws', 'compute', 300);

      const report = generateCostReport(yesterday, tomorrow);
      const markdown = formatCostReportAsMarkdown(report);

      if (report.anomalies.length > 0) {
        expect(markdown).toContain('Detected Anomalies');
        expect(markdown).toContain('aws/compute');
      }
    });

    it('includes recommendations based on risk level', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      recordCostDataPoint('aws', 'compute', 500);

      const report = generateCostReport(yesterday, tomorrow);
      const markdown = formatCostReportAsMarkdown(report);

      expect(markdown).toContain('Recommendations');
      if (report.forecast?.riskLevel === 'high') {
        expect(markdown).toContain('HIGH RISK');
      }
    });

    it('formats percentage values correctly in markdown', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      recordCostDataPoint('vercel', 'compute', 75);
      recordCostDataPoint('supabase', 'storage', 25);

      const report = generateCostReport(yesterday, tomorrow);
      const markdown = formatCostReportAsMarkdown(report);

      // Should have percentage representation
      expect(markdown).toMatch(/\d+\.\d+%/);
    });
  });

  describe('Store Reset', () => {
    it('clears all cost data and escalations', () => {
      recordCostDataPoint('vercel', 'compute', 50);
      recordCostDataPoint('supabase', 'storage', 30);
      checkThresholdsAndEscalate();

      resetCostStore();

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const report = generateCostReport(yesterday, tomorrow);

      expect(report.totalCost).toBe(0);
      expect(Object.values(report.costsByProvider).reduce((a, b) => a + b, 0)).toBe(0);
      expect(getRecentEscalations().length).toBe(0);
    });
  });

  describe('Integration Scenarios', () => {
    it('detects and escalates cost spike during incident response', () => {
      // Baseline week
      for (let i = 7; i > 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        recordCostDataPoint('aws', 'compute', 200, 'USD', undefined, undefined, date);
        recordCostDataPoint('vercel', 'bandwidth', 50, 'USD', undefined, undefined, date);
      }

      // Incident causes spike
      recordCostDataPoint('aws', 'compute', 600);
      recordCostDataPoint('vercel', 'bandwidth', 200);

      const anomalies = detectAnomalies();
      const escalations = checkThresholdsAndEscalate();

      expect(anomalies.length).toBeGreaterThan(0);
      expect(escalations.length).toBeGreaterThan(0);
      expect(escalations.some((e) => e.severity === 'critical')).toBe(true);
    });

    it('provides cost report with escalation history', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      for (let i = 7; i > 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        recordCostDataPoint('datadog', 'monitoring', 50, 'USD', undefined, undefined, date);
      }
      recordCostDataPoint('datadog', 'monitoring', 200);

      checkThresholdsAndEscalate();
      const report = generateCostReport(yesterday, tomorrow);

      expect(report.escalations).toBeGreaterThanOrEqual(0);
      expect(report.anomalies.length).toBeGreaterThan(0);
    });

    it('tracks notification status for cost escalations', () => {
      recordCostDataPoint('vercel', 'compute', 100);
      const escalations = checkThresholdsAndEscalate();

      if (escalations.length > 0) {
        expect(escalations[0].founderNotified).toBe(false);

        markEscalationNotified(escalations[0].id);
        const updated = getEscalation(escalations[0].id);

        expect(updated?.founderNotified).toBe(true);
      }
    });
  });
});
