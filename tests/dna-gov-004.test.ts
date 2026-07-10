import { describe, it, expect } from 'vitest';
import {
  calculateStdDev,
  detectCostAnomaly,
  getAlertSeverity,
} from '@/lib/vercel-cost';

describe('DNA-GOV-004: Cost Anomaly Detection', () => {
  describe('calculateStdDev()', () => {
    it('should return 0 for empty array', () => {
      const result = calculateStdDev([]);
      expect(result).toBe(0);
    });

    it('should return 0 for single value', () => {
      const result = calculateStdDev([5]);
      expect(result).toBe(0);
    });

    it('should return 0 for identical values', () => {
      const result = calculateStdDev([10, 10, 10, 10]);
      expect(result).toBe(0);
    });

    it('should calculate correct stddev for known distribution', () => {
      // [3, 5, 7]: mean = 5, deviations = [-2, 0, 2], variance = 8/3, stddev ≈ 1.633
      const result = calculateStdDev([3, 5, 7]);
      expect(Math.abs(result - Math.sqrt(8 / 3))).toBeLessThan(0.01);
    });

    it('should handle negative values', () => {
      // These shouldn't occur in cost data, but verify robustness
      const result = calculateStdDev([-5, 0, 5]);
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThan(10);
    });

    it('should handle large values', () => {
      const result = calculateStdDev([10000, 20000, 30000]);
      expect(result).toBeGreaterThan(0);
    });
  });

  describe('detectCostAnomaly()', () => {
    it('should return no anomaly when no historical data', () => {
      const result = detectCostAnomaly(100, []);
      expect(result.isAnomaly).toBe(false);
      expect(result.baseline).toBe(0);
      expect(result.stdDev).toBe(0);
    });

    it('should use median as baseline, not mean', () => {
      // [1, 2, 100] — median=2, mean=34.33
      // With 2.5-sigma: threshold = 2 + 2.5*stddev ≈ 2 + ~48 = ~50
      const result = detectCostAnomaly(10, [1, 2, 100]);
      expect(result.baseline).toBe(2); // median
      // Should not flag 10 as anomaly (10 < threshold)
      expect(result.isAnomaly).toBe(false);
    });

    it('should detect spike when spend exceeds 2.5-sigma threshold', () => {
      // Baseline: $5 per day, consistent
      const historicalSpends = [5, 5, 5, 5, 4.8, 5.2, 5, 4.9];
      const todaySpend = 20; // 4x the baseline
      const result = detectCostAnomaly(todaySpend, historicalSpends);

      expect(result.isAnomaly).toBe(true);
      expect(result.baseline).toBe(5);
      expect(result.exceedsBy).toBeGreaterThan(0);
      expect(result.percentAboveBaseline).toBe(300); // 20 is 300% above 5
    });

    it('should not flag normal variation', () => {
      // Natural variation within 1 stddev
      const historicalSpends = [10, 11, 9, 10.5, 9.5, 10, 11, 9.5];
      const todaySpend = 11.5; // Slightly high but normal variation
      const result = detectCostAnomaly(todaySpend, historicalSpends);

      expect(result.isAnomaly).toBe(false);
    });

    it('should return correct exceedsBy amount', () => {
      const historicalSpends = [5, 5, 5, 5, 5];
      const todaySpend = 25;
      const result = detectCostAnomaly(todaySpend, historicalSpends);

      expect(result.exceedsBy).toBeGreaterThan(0);
      expect(result.exceedsBy).toBeLessThan(todaySpend);
    });

    it('should handle single historical data point', () => {
      // Single point: median = value, stddev = 0
      const result = detectCostAnomaly(100, [50]);
      expect(result.baseline).toBe(50);
      expect(result.stdDev).toBe(0);
      // With stddev=0, threshold = 50 + 2.5*0 = 50, so 100 > 50 = anomaly
      expect(result.isAnomaly).toBe(true);
    });

    it('should handle custom threshold multiplier', () => {
      const historicalSpends = [10, 10, 10, 10, 10];
      const todaySpend = 35;

      // With 2.5-sigma: threshold = 10 + 0 = 10, so 35 > 10 = anomaly
      const result25 = detectCostAnomaly(todaySpend, historicalSpends, 2.5);
      expect(result25.isAnomaly).toBe(true);

      // With 5-sigma: threshold = 10 + 0 = 10, so 35 > 10 = anomaly (even more lenient)
      const result5 = detectCostAnomaly(todaySpend, historicalSpends, 5);
      expect(result5.isAnomaly).toBe(true);
    });

    it('should calculate percent above baseline correctly', () => {
      const historicalSpends = [10, 10, 10, 10];
      const todaySpend = 20;
      const result = detectCostAnomaly(todaySpend, historicalSpends);

      expect(result.percentAboveBaseline).toBe(100); // 20 is 100% above 10
    });

    it('should handle very small baseline', () => {
      const historicalSpends = [0.5, 0.5, 0.5];
      const todaySpend = 5;
      const result = detectCostAnomaly(todaySpend, historicalSpends);

      expect(result.baseline).toBe(0.5);
      expect(result.percentAboveBaseline).toBe(900); // 5 is 900% above 0.5
    });

    it('should return 0 for percentAboveBaseline when baseline is 0', () => {
      const historicalSpends = [0, 0, 0];
      const todaySpend = 10;
      const result = detectCostAnomaly(todaySpend, historicalSpends);

      expect(result.baseline).toBe(0);
      expect(result.percentAboveBaseline).toBe(0);
    });
  });

  describe('getAlertSeverity()', () => {
    it('should return info when baseline is 0', () => {
      const result = getAlertSeverity(10, 0);
      expect(result).toBe('info');
    });

    it('should return high when exceed is >100% of baseline', () => {
      // exceedsBy = 150, baseline = 100
      // percentOverThreshold = (150 / 100) * 100 = 150% > 100%
      const result = getAlertSeverity(150, 100);
      expect(result).toBe('high');
    });

    it('should return warning when exceed is 50-100% of baseline', () => {
      // exceedsBy = 75, baseline = 100
      // percentOverThreshold = (75 / 100) * 100 = 75% (50-100% range)
      const result = getAlertSeverity(75, 100);
      expect(result).toBe('warning');
    });

    it('should return info when exceed is <50% of baseline', () => {
      // exceedsBy = 25, baseline = 100
      // percentOverThreshold = (25 / 100) * 100 = 25% < 50%
      const result = getAlertSeverity(25, 100);
      expect(result).toBe('info');
    });

    it('should use exact boundary values', () => {
      // Just above 50% boundary
      const result50 = getAlertSeverity(50.1, 100);
      expect(result50).toBe('warning');

      // Just above 100% boundary
      const result100 = getAlertSeverity(100.1, 100);
      expect(result100).toBe('high');

      // At exactly 50% (not triggered)
      const resultAt50 = getAlertSeverity(50, 100);
      expect(resultAt50).toBe('info');

      // At exactly 100% (not triggered)
      const resultAt100 = getAlertSeverity(100, 100);
      expect(resultAt100).toBe('warning');
    });

    it('should handle small baseline values', () => {
      // exceedsBy = 0.75, baseline = 1
      // percentOverThreshold = 75%
      const result = getAlertSeverity(0.75, 1);
      expect(result).toBe('warning');
    });
  });

  describe('Integration: Cost spike detection workflow', () => {
    it('should detect and classify a major spike', () => {
      // Typical day: $5/day
      const baseline = [5, 5.1, 4.9, 5, 5.2, 4.8, 5, 5.1, 5, 4.9];
      // Today: $50 (10x spike)
      const todaySpend = 50;

      const anomaly = detectCostAnomaly(todaySpend, baseline);
      const severity = getAlertSeverity(anomaly.exceedsBy, anomaly.baseline);

      expect(anomaly.isAnomaly).toBe(true);
      expect(severity).toBe('high');
      expect(anomaly.percentAboveBaseline).toBe(900); // 50 is 900% above 5
    });

    it('should not alert on normal daily variation', () => {
      // Typical week: $100-$150/day
      const baseline = [100, 120, 110, 150, 130, 100, 120];
      // Today: $145 (slightly high but normal)
      const todaySpend = 145;

      const anomaly = detectCostAnomaly(todaySpend, baseline);
      const severity = getAlertSeverity(anomaly.exceedsBy, anomaly.baseline);

      expect(anomaly.isAnomaly).toBe(false);
      expect(severity).toBe('info');
    });

    it('should handle growing baseline (trending spend)', () => {
      // Trending up over 30 days
      const baseline = [5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
      // Today: $30 (2.5x the recent trend)
      const todaySpend = 30;

      const anomaly = detectCostAnomaly(todaySpend, baseline);
      const severity = getAlertSeverity(anomaly.exceedsBy, anomaly.baseline);

      expect(anomaly.isAnomaly).toBe(true);
      expect(severity).toBe('high');
    });

    it('should produce complete alert metadata', () => {
      const baseline = [5, 5, 5, 5, 5];
      const todaySpend = 25;

      const anomaly = detectCostAnomaly(todaySpend, baseline);

      expect(anomaly).toHaveProperty('isAnomaly');
      expect(anomaly).toHaveProperty('baseline');
      expect(anomaly).toHaveProperty('stdDev');
      expect(anomaly).toHaveProperty('threshold');
      expect(anomaly).toHaveProperty('exceedsBy');
      expect(anomaly).toHaveProperty('percentAboveBaseline');

      if (anomaly.isAnomaly) {
        expect(anomaly.threshold).toBeLessThan(todaySpend);
        expect(anomaly.exceedsBy).toBe(todaySpend - anomaly.threshold);
      }
    });
  });
});
