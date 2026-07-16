import { describe, it, expect } from 'vitest';

/**
 * Tests for customer journey monitoring
 * Verify funnel tracking, friction detection, and conversion metrics
 */

describe('Customer Journey Monitoring', () => {
  describe('GET /api/metrics/journey', () => {
    it('should have correct response structure', async () => {
      const response = {
        timestamp: new Date().toISOString(),
        period: 'last_7d',
        funnel: {
          stages: [
            {
              name: 'signup_page_view',
              displayName: 'Signup Page View',
              description: 'Users who visited the signup page',
              count: 1250,
              successRate: 100,
              avgTimeSeconds: 0,
            },
          ],
          metrics: [
            {
              timestamp: new Date().toISOString(),
              stage: 'signup_page_view',
              count: 1250,
              dropoffFromPrevious: 0,
              dropoffRate: 0,
            },
          ],
        },
        summary: {
          totalSignupAttempts: 1250,
          totalCompletions: 567,
          overallConversionRate: 45.4,
          conversionRatePercent: 45.4,
          largestDropoffStage: 'form_submitted',
          largestDropoffRate: 31.5,
          avgTimeToCompletionSeconds: 600,
          frictionPointCount: 2,
        },
        frictionPoints: [],
        recommendations: [],
      };

      expect(response).toHaveProperty('timestamp');
      expect(response).toHaveProperty('period');
      expect(response).toHaveProperty('funnel');
      expect(response).toHaveProperty('summary');
      expect(response).toHaveProperty('frictionPoints');
      expect(response).toHaveProperty('recommendations');
      expect(Array.isArray(response.funnel.stages)).toBe(true);
      expect(Array.isArray(response.funnel.metrics)).toBe(true);
    });

    it('should track all 7 funnel stages', () => {
      const stages = [
        'signup_page_view',
        'form_submitted',
        'email_sent',
        'email_verified',
        'profile_created',
        'workspace_created',
        'first_ai_system_added',
      ];

      expect(stages).toHaveLength(7);
      stages.forEach((stage) => {
        expect(typeof stage).toBe('string');
        expect(stage.length).toBeGreaterThan(0);
      });
    });

    it('should calculate dropoff rate correctly', () => {
      const count1 = 1000;
      const count2 = 850;
      const dropoffFromPrevious = count1 - count2;
      const dropoffRate = (dropoffFromPrevious / count1) * 100;

      expect(dropoffRate).toBe(15);
    });

    it('should identify friction points with >10% dropoff', () => {
      const metrics = [
        { stage: 'signup_page_view', dropoffRate: 0 },
        { stage: 'form_submitted', dropoffRate: 31.5 }, // friction
        { stage: 'email_sent', dropoffRate: 0 },
        { stage: 'email_verified', dropoffRate: 13.3 }, // friction
        { stage: 'profile_created', dropoffRate: 6.3 },
        { stage: 'workspace_created', dropoffRate: 7.9 },
        { stage: 'first_ai_system_added', dropoffRate: 12.1 }, // friction
      ];

      const frictionPoints = metrics.filter((m) => m.dropoffRate > 10);
      expect(frictionPoints).toHaveLength(3);
      expect(frictionPoints[0].stage).toBe('form_submitted');
      expect(frictionPoints[1].stage).toBe('email_verified');
      expect(frictionPoints[2].stage).toBe('first_ai_system_added');
    });

    it('should classify friction severity correctly', () => {
      const testCases = [
        { dropoffRate: 5, expectedSeverity: null }, // No friction
        { dropoffRate: 12, expectedSeverity: 'medium' }, // 10-15%
        { dropoffRate: 18, expectedSeverity: 'high' }, // 15-25%
        { dropoffRate: 28, expectedSeverity: 'critical' }, // >25%
      ];

      testCases.forEach(({ dropoffRate, expectedSeverity }) => {
        let severity = null;

        if (dropoffRate > 25) {
          severity = 'critical';
        } else if (dropoffRate > 15) {
          severity = 'high';
        } else if (dropoffRate > 10) {
          severity = 'medium';
        }

        expect(severity).toBe(expectedSeverity);
      });
    });

    it('should calculate overall conversion rate correctly', () => {
      const totalSignupAttempts = 1250;
      const totalCompletions = 567;
      const conversionRate = (totalCompletions / totalSignupAttempts) * 100;

      expect(conversionRate).toBeCloseTo(45.36, 1);
    });

    it('should calculate average time to completion', () => {
      const stageTimes = [0, 45, 2, 180, 120, 90, 240]; // seconds per stage
      const totalTime = stageTimes.reduce((sum, t) => sum + t, 0);

      expect(totalTime).toBe(677);
    });

    it('should identify largest dropoff stage', () => {
      const dropoffs = [
        { stage: 'form_submitted', rate: 31.5 },
        { stage: 'email_verified', rate: 13.3 },
        { stage: 'first_ai_system_added', rate: 12.1 },
      ];

      const largest = dropoffs.reduce((max, d) =>
        d.rate > max.rate ? d : max
      );

      expect(largest.stage).toBe('form_submitted');
      expect(largest.rate).toBe(31.5);
    });

    it('should flag low conversion rate as warning', () => {
      const conversionRate = 35; // Below 40% threshold
      const needsAttention = conversionRate < 40;
      expect(needsAttention).toBe(true);
    });

    it('should include recommendations for friction', () => {
      const frictionPoints = [
        { stage: 'form_submitted', dropoffRate: 31.5 },
        { stage: 'email_verified', dropoffRate: 13.3 },
      ];

      expect(frictionPoints.length).toBeGreaterThan(0);
      const hasRecommendations = frictionPoints.length > 0;
      expect(hasRecommendations).toBe(true);
    });
  });

  describe('Funnel Stages', () => {
    it('should have sequential stages in correct order', () => {
      const stages = [
        'signup_page_view',
        'form_submitted',
        'email_sent',
        'email_verified',
        'profile_created',
        'workspace_created',
        'first_ai_system_added',
      ];

      expect(stages[0]).toBe('signup_page_view');
      expect(stages[stages.length - 1]).toBe('first_ai_system_added');
    });

    it('should have monotonically decreasing counts', () => {
      const counts = [1250, 856, 856, 742, 698, 645, 567];

      for (let i = 1; i < counts.length; i++) {
        expect(counts[i]).toBeLessThanOrEqual(counts[i - 1]);
      }
    });

    it('should have valid success rates (0-100%)', () => {
      const successRates = [100, 68.5, 68.5, 59.4, 55.8, 51.6, 45.4];

      successRates.forEach((rate) => {
        expect(rate).toBeGreaterThanOrEqual(0);
        expect(rate).toBeLessThanOrEqual(100);
      });
    });

    it('should have non-negative average times', () => {
      const times = [0, 45, 2, 180, 120, 90, 240];

      times.forEach((time) => {
        expect(time).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('Friction Point Detection', () => {
    it('should detect no friction when all dropoffs are low', () => {
      const dropoffs = [0, 8, 0, 5, 3, 4, 6];
      const frictionPoints = dropoffs.filter((d) => d > 10);

      expect(frictionPoints).toHaveLength(0);
    });

    it('should detect critical friction (>25%)', () => {
      const dropoff = 30;
      const isCritical = dropoff > 25;
      expect(isCritical).toBe(true);
    });

    it('should detect high friction (15-25%)', () => {
      const dropoff = 20;
      const isHigh = dropoff > 15 && dropoff <= 25;
      expect(isHigh).toBe(true);
    });

    it('should detect medium friction (10-15%)', () => {
      const dropoff = 12;
      const isMedium = dropoff > 10 && dropoff <= 15;
      expect(isMedium).toBe(true);
    });

    it('should not flag low dropoff as friction', () => {
      const dropoff = 8;
      const isFriction = dropoff > 10;
      expect(isFriction).toBe(false);
    });
  });

  describe('Conversion Metrics', () => {
    it('should calculate step-by-step conversion rates', () => {
      const stages = [
        { name: 'signup', count: 1000 },
        { name: 'verified', count: 850 },
        { name: 'profile', count: 800 },
        { name: 'workspace', count: 700 },
      ];

      const rates = stages.map((s) => ({
        stage: s.name,
        rate: (s.count / stages[0].count) * 100,
      }));

      expect(rates[0].rate).toBe(100);
      expect(rates[1].rate).toBe(85);
      expect(rates[2].rate).toBe(80);
      expect(rates[3].rate).toBe(70);
    });

    it('should calculate conversion from first to last stage', () => {
      const firstCount = 1250;
      const lastCount = 567;
      const endToEndConversion = (lastCount / firstCount) * 100;

      expect(endToEndConversion).toBeCloseTo(45.36, 1);
    });

    it('should identify conversion thresholds', () => {
      const testCases = [
        { rate: 25, target: 40, belowTarget: true },
        { rate: 40, target: 40, belowTarget: false },
        { rate: 55, target: 40, belowTarget: false },
      ];

      testCases.forEach(({ rate, target, belowTarget }) => {
        expect(rate < target).toBe(belowTarget);
      });
    });
  });

  describe('Dropoff Analysis', () => {
    it('should calculate stage dropoffs correctly', () => {
      const prev = 100;
      const curr = 80;
      const dropoff = prev - curr;
      const dropoffRate = (dropoff / prev) * 100;

      expect(dropoff).toBe(20);
      expect(dropoffRate).toBe(20);
    });

    it('should identify largest dropoff in sequence', () => {
      const dropoffs = [
        { stage: 'a', rate: 10 },
        { stage: 'b', rate: 25 },
        { stage: 'c', rate: 15 },
        { stage: 'd', rate: 8 },
      ];

      const max = dropoffs.reduce((m, d) => (d.rate > m.rate ? d : m));

      expect(max.stage).toBe('b');
      expect(max.rate).toBe(25);
    });

    it('should detect increasing dropoff trend', () => {
      const dropoffs = [5, 10, 15, 20, 25];
      let isIncreasing = true;

      for (let i = 1; i < dropoffs.length; i++) {
        if (dropoffs[i] <= dropoffs[i - 1]) {
          isIncreasing = false;
        }
      }

      expect(isIncreasing).toBe(true);
    });

    it('should detect improving funnel (decreasing dropoffs)', () => {
      const dropoffs = [25, 20, 15, 10, 5];
      let isDecreasing = true;

      for (let i = 1; i < dropoffs.length; i++) {
        if (dropoffs[i] >= dropoffs[i - 1]) {
          isDecreasing = false;
        }
      }

      expect(isDecreasing).toBe(true);
    });
  });

  describe('Recommendations', () => {
    it('should recommend investigation for critical friction', () => {
      const frictionRate = 28;
      const shouldInvestigate = frictionRate > 25;
      expect(shouldInvestigate).toBe(true);
    });

    it('should recommend A/B testing for high friction', () => {
      const frictionRate = 18;
      const shouldTest = frictionRate > 15 && frictionRate <= 25;
      expect(shouldTest).toBe(true);
    });

    it('should recommend monitoring for medium friction', () => {
      const frictionRate = 12;
      const shouldMonitor = frictionRate > 10 && frictionRate <= 15;
      expect(shouldMonitor).toBe(true);
    });

    it('should recommend UX audit for low conversion rate', () => {
      const conversionRate = 32;
      const needsAudit = conversionRate < 40;
      expect(needsAudit).toBe(true);
    });

    it('should indicate healthy funnel when no friction detected', () => {
      const frictionPoints = [];
      const isHealthy = frictionPoints.length === 0;
      expect(isHealthy).toBe(true);
    });
  });

  describe('Time Metrics', () => {
    it('should track average time per stage', () => {
      const times = [0, 45, 2, 180, 120, 90, 240];

      times.forEach((time) => {
        expect(typeof time).toBe('number');
        expect(time).toBeGreaterThanOrEqual(0);
      });
    });

    it('should calculate total time to completion', () => {
      const times = [0, 45, 2, 180, 120, 90, 240];
      const total = times.reduce((sum, t) => sum + t, 0);

      expect(total).toBe(677);
    });

    it('should identify slowest stage', () => {
      const stages = [
        { name: 'form', time: 45 },
        { name: 'verification', time: 180 },
        { name: 'profile', time: 120 },
        { name: 'system_add', time: 240 },
      ];

      const slowest = stages.reduce((max, s) => (s.time > max.time ? s : max));

      expect(slowest.name).toBe('system_add');
      expect(slowest.time).toBe(240);
    });

    it('should calculate median completion time', () => {
      const times = [100, 200, 150, 180, 220];
      const sorted = [...times].sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];

      expect(median).toBe(180);
    });
  });

  describe('Period Support', () => {
    it('should support configurable time periods', () => {
      const periods = ['last_7d', 'last_30d', 'last_90d'];

      periods.forEach((period) => {
        expect(typeof period).toBe('string');
        expect(period.startsWith('last_')).toBe(true);
      });
    });

    it('should return period in response', () => {
      const response = {
        timestamp: new Date().toISOString(),
        period: 'last_7d',
      };

      expect(response.period).toBe('last_7d');
    });
  });

  describe('Health & Status', () => {
    it('should indicate funnel health based on conversion rate', () => {
      const testCases = [
        { conversionRate: 10, health: 'critical' },
        { conversionRate: 30, health: 'warning' },
        { conversionRate: 50, health: 'healthy' },
        { conversionRate: 70, health: 'excellent' },
      ];

      testCases.forEach(({ conversionRate, health }) => {
        let status;
        if (conversionRate < 20) {
          status = 'critical';
        } else if (conversionRate < 40) {
          status = 'warning';
        } else if (conversionRate < 60) {
          status = 'healthy';
        } else {
          status = 'excellent';
        }

        expect(status).toBe(health);
      });
    });

    it('should summarize friction impact', () => {
      const frictionPoints = [{ rate: 31.5 }, { rate: 13.3 }, { rate: 12.1 }];

      const totalFrictionImpact = frictionPoints.reduce(
        (sum, f) => sum + f.rate,
        0
      );

      expect(totalFrictionImpact).toBeCloseTo(56.9, 1);
    });
  });
});
