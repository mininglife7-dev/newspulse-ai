import { describe, it, expect, beforeEach } from 'vitest';
import {
  updateCustomerMetrics,
  calculateHealthScore,
  calculateRiskScore,
  segmentCustomer,
  generateTriggers,
  getCustomerHealth,
  calculateRetentionMetrics,
  getCustomersBySegment,
  getHighRiskCustomers,
  formatRetentionStatus,
  resetCustomerRetention,
  type SegmentName,
} from '@/lib/customer-retention';

describe('Customer Retention - DNS-GOV-018', () => {
  beforeEach(() => {
    resetCustomerRetention();
  });

  describe('updateCustomerMetrics', () => {
    it('creates new customer metrics', () => {
      const metrics = updateCustomerMetrics('user-1', {
        totalSessions: 5,
        totalEvents: 50,
        uniqueFeaturesUsed: 3,
      });

      expect(metrics.userId).toBe('user-1');
      expect(metrics.totalSessions).toBe(5);
      expect(metrics.uniqueFeaturesUsed).toBe(3);
    });

    it('updates existing customer metrics', () => {
      updateCustomerMetrics('user-1', { totalSessions: 5 });
      const updated = updateCustomerMetrics('user-1', { totalSessions: 10 });

      expect(updated.totalSessions).toBe(10);
    });

    it('tracks account age and inactivity', () => {
      const metrics = updateCustomerMetrics('user-1', {
        accountAgeInDays: 30,
        daysSinceLastActivity: 7,
      });

      expect(metrics.accountAgeInDays).toBe(30);
      expect(metrics.daysSinceLastActivity).toBe(7);
    });
  });

  describe('calculateHealthScore', () => {
    it('calculates health score for engaged user', () => {
      updateCustomerMetrics('user-1', {
        totalSessions: 20,
        totalEvents: 100,
        uniqueFeaturesUsed: 5,
        loginFrequency: 3,
        conversionsCount: 1,
        daysSinceLastActivity: 1,
      });

      const health = calculateHealthScore('user-1');

      expect(health.score).toBeGreaterThan(60);
      expect(health.category).toBe('healthy');
    });

    it('calculates low health for inactive user', () => {
      updateCustomerMetrics('user-1', {
        totalSessions: 2,
        totalEvents: 5,
        uniqueFeaturesUsed: 1,
        loginFrequency: 0.1,
        conversionsCount: 0,
        daysSinceLastActivity: 90,
      });

      const health = calculateHealthScore('user-1');

      expect(health.score).toBeLessThan(30);
      expect(health.category).toBe('at-critical-risk');
    });

    it('returns at-risk category for moderate score', () => {
      updateCustomerMetrics('user-1', {
        totalSessions: 5,
        totalEvents: 20,
        uniqueFeaturesUsed: 2,
        loginFrequency: 1,
        conversionsCount: 0,
        daysSinceLastActivity: 30,
      });

      const health = calculateHealthScore('user-1');

      expect(health.score).toBeGreaterThanOrEqual(40);
      expect(health.score).toBeLessThan(70);
      expect(health.category).toBe('at-risk');
    });

    it('tracks health score trends', () => {
      updateCustomerMetrics('user-1', {
        totalSessions: 5,
        loginFrequency: 1,
        daysSinceLastActivity: 1,
        uniqueFeaturesUsed: 2,
      });

      const health1 = calculateHealthScore('user-1');

      updateCustomerMetrics('user-1', {
        totalSessions: 15,
        loginFrequency: 3,
      });

      const health2 = calculateHealthScore('user-1');

      expect(health2.trends.engagement).toBe('improving');
      expect(health2.score).toBeGreaterThan(health1.score);
    });
  });

  describe('calculateRiskScore', () => {
    it('calculates low risk for healthy user', () => {
      updateCustomerMetrics('user-1', {
        daysSinceLastActivity: 1,
        uniqueFeaturesUsed: 5,
        conversionsCount: 2,
        loginFrequency: 3,
      });

      const risk = calculateRiskScore('user-1');

      expect(risk.score).toBeLessThan(30);
      expect(risk.churnProbability).toBeLessThan(0.3);
    });

    it('calculates high risk for inactive user', () => {
      updateCustomerMetrics('user-1', {
        daysSinceLastActivity: 60,
        uniqueFeaturesUsed: 1,
        conversionsCount: 0,
        loginFrequency: 0,
      });

      const risk = calculateRiskScore('user-1');

      expect(risk.score).toBeGreaterThan(60);
      expect(risk.inactivityRisk).toBe('critical');
      expect(risk.churnProbability).toBeGreaterThan(0.6);
    });

    it('identifies feature adoption risk', () => {
      updateCustomerMetrics('user-1', {
        uniqueFeaturesUsed: 1,
        daysSinceLastActivity: 5,
        accountAgeInDays: 30,
      });

      const risk = calculateRiskScore('user-1');

      expect(risk.featureAdoptionRisk).toBe('high');
      expect(risk.factors.lowFeatureAdoption).toBe(true);
    });

    it('identifies conversion risk for non-converting users', () => {
      updateCustomerMetrics('user-1', {
        conversionsCount: 0,
        accountAgeInDays: 60,
        daysSinceLastActivity: 5,
      });

      const risk = calculateRiskScore('user-1');

      expect(risk.conversionRisk).toBe('high');
      expect(risk.factors.noConversions).toBe(true);
    });
  });

  describe('segmentCustomer', () => {
    it('segments champion customer', () => {
      updateCustomerMetrics('user-1', {
        totalSessions: 50,
        uniqueFeaturesUsed: 8,
        conversionsCount: 3,
        daysSinceLastActivity: 1,
        loginFrequency: 5,
      });

      const segment = segmentCustomer('user-1');

      expect(segment.segment).toBe('champions');
      expect(segment.confidence).toBeGreaterThan(0.7);
    });

    it('segments at-risk customer', () => {
      updateCustomerMetrics('user-1', {
        totalSessions: 5,
        uniqueFeaturesUsed: 1,
        conversionsCount: 0,
        daysSinceLastActivity: 40,
        loginFrequency: 0.5,
      });

      const segment = segmentCustomer('user-1');

      expect(segment.segment).toBe('at-risk');
    });

    it('segments churn-warning customer', () => {
      updateCustomerMetrics('user-1', {
        totalSessions: 2,
        uniqueFeaturesUsed: 0,
        conversionsCount: 0,
        daysSinceLastActivity: 75,
        loginFrequency: 0,
      });

      const segment = segmentCustomer('user-1');

      expect(segment.segment).toBe('churn-warning');
    });

    it('segments new user', () => {
      updateCustomerMetrics('user-1', {
        accountAgeInDays: 5,
        totalSessions: 1,
        daysSinceLastActivity: 0,
      });

      const segment = segmentCustomer('user-1');

      expect(segment.segment).toBe('new-users');
    });

    it('segments power user', () => {
      updateCustomerMetrics('user-1', {
        uniqueFeaturesUsed: 8,
        totalSessions: 50,
        loginFrequency: 4,
        conversionsCount: 2,
        daysSinceLastActivity: 1,
      });

      const segment = segmentCustomer('user-1');

      expect(segment.segment).toBe('power-users');
    });

    it('segments dormant user', () => {
      updateCustomerMetrics('user-1', {
        daysSinceLastActivity: 120,
        totalSessions: 1,
        uniqueFeaturesUsed: 0,
        loginFrequency: 0,
      });

      const segment = segmentCustomer('user-1');

      expect(segment.segment).toBe('dormant');
    });
  });

  describe('generateTriggers', () => {
    it('generates welcome trigger for new users', () => {
      updateCustomerMetrics('user-1', {
        accountAgeInDays: 3,
        totalSessions: 1,
      });

      const triggers = generateTriggers('user-1');

      expect(triggers.some((t) => t.type === 'welcome')).toBe(true);
    });

    it('generates feature education trigger for low adoption', () => {
      updateCustomerMetrics('user-1', {
        uniqueFeaturesUsed: 1,
        accountAgeInDays: 30,
        daysSinceLastActivity: 5,
      });

      const triggers = generateTriggers('user-1');

      expect(triggers.some((t) => t.type === 'feature-education')).toBe(true);
    });

    it('generates re-engagement trigger for inactive users', () => {
      updateCustomerMetrics('user-1', {
        daysSinceLastActivity: 45,
        totalSessions: 3,
      });

      const triggers = generateTriggers('user-1');

      expect(triggers.some((t) => t.type === 're-engagement')).toBe(true);
    });

    it('generates critical churn warning trigger', () => {
      updateCustomerMetrics('user-1', {
        daysSinceLastActivity: 90,
        uniqueFeaturesUsed: 0,
        conversionsCount: 0,
      });

      const triggers = generateTriggers('user-1');
      const churnTrigger = triggers.find((t) => t.type === 'churn-warning');

      expect(churnTrigger).toBeDefined();
      expect(churnTrigger?.priority).toBe('critical');
    });

    it('generates upgrade opportunity for power users', () => {
      updateCustomerMetrics('user-1', {
        uniqueFeaturesUsed: 8,
        conversionsCount: 2,
        loginFrequency: 4,
        daysSinceLastActivity: 1,
      });

      const triggers = generateTriggers('user-1');

      expect(triggers.some((t) => t.type === 'upgrade-opportunity')).toBe(true);
    });

    it('includes cooldown period for critical triggers', () => {
      updateCustomerMetrics('user-1', {
        daysSinceLastActivity: 90,
        uniqueFeaturesUsed: 0,
      });

      const triggers = generateTriggers('user-1');
      const criticalTrigger = triggers.find((t) => t.priority === 'critical');

      expect(criticalTrigger?.cooldownUntil).toBeDefined();
    });
  });

  describe('getCustomerHealth', () => {
    it('returns complete health overview', () => {
      updateCustomerMetrics('user-1', {
        totalSessions: 10,
        uniqueFeaturesUsed: 3,
        daysSinceLastActivity: 5,
      });

      const health = getCustomerHealth('user-1');

      expect(health.userId).toBe('user-1');
      expect(health.metrics).toBeDefined();
      expect(health.health).toBeDefined();
      expect(health.risk).toBeDefined();
      expect(health.segment).toBeDefined();
      expect(health.activeTriggers).toBeDefined();
    });

    it('includes only active triggers', () => {
      updateCustomerMetrics('user-1', {
        daysSinceLastActivity: 90,
        uniqueFeaturesUsed: 0,
      });

      const health = getCustomerHealth('user-1');
      const expiredTriggers = health.activeTriggers.filter(
        (t) => new Date(t.expiresAt) <= new Date()
      );

      expect(expiredTriggers.length).toBe(0);
    });
  });

  describe('calculateRetentionMetrics', () => {
    it('calculates cohort-level retention metrics', () => {
      for (let i = 0; i < 10; i++) {
        updateCustomerMetrics(`user-${i}`, {
          totalSessions: i * 5,
          uniqueFeaturesUsed: i % 3,
          daysSinceLastActivity: i * 10,
        });
        calculateHealthScore(`user-${i}`);
        calculateRiskScore(`user-${i}`);
      }

      const metrics = calculateRetentionMetrics();

      expect(metrics.totalCustomers).toBe(10);
      expect(metrics.avgHealthScore).toBeGreaterThanOrEqual(0);
      expect(metrics.avgHealthScore).toBeLessThanOrEqual(100);
      expect(metrics.avgRiskScore).toBeGreaterThanOrEqual(0);
      expect(metrics.avgRiskScore).toBeLessThanOrEqual(100);
    });

    it('categorizes customers by health', () => {
      // Create healthy user
      updateCustomerMetrics('user-1', {
        totalSessions: 50,
        uniqueFeaturesUsed: 8,
        daysSinceLastActivity: 1,
      });
      calculateHealthScore('user-1');

      // Create at-risk user
      updateCustomerMetrics('user-2', {
        totalSessions: 5,
        uniqueFeaturesUsed: 1,
        daysSinceLastActivity: 40,
      });
      calculateHealthScore('user-2');

      const metrics = calculateRetentionMetrics();

      expect(
        metrics.healthyCustomers +
          metrics.atRiskCustomers +
          metrics.criticalRiskCustomers
      ).toBeGreaterThan(0);
    });

    it('categorizes customers by churn risk', () => {
      for (let i = 0; i < 5; i++) {
        updateCustomerMetrics(`user-${i}`, {
          daysSinceLastActivity: i * 30,
          uniqueFeaturesUsed: 5 - i,
        });
        calculateRiskScore(`user-${i}`);
      }

      const metrics = calculateRetentionMetrics();

      expect(
        metrics.churnRisk.low +
          metrics.churnRisk.medium +
          metrics.churnRisk.high +
          metrics.churnRisk.critical
      ).toBeGreaterThan(0);
    });
  });

  describe('getCustomersBySegment', () => {
    it('retrieves customers by segment', () => {
      updateCustomerMetrics('user-1', {
        totalSessions: 50,
        uniqueFeaturesUsed: 8,
        daysSinceLastActivity: 1,
      });
      segmentCustomer('user-1');

      updateCustomerMetrics('user-2', {
        totalSessions: 1,
        uniqueFeaturesUsed: 1,
        daysSinceLastActivity: 60,
      });
      segmentCustomer('user-2');

      const champions = getCustomersBySegment('champions');
      const churnWarning = getCustomersBySegment('churn-warning');

      expect(champions.length).toBeGreaterThanOrEqual(0);
      expect(churnWarning.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getHighRiskCustomers', () => {
    it('retrieves high-risk customers sorted by risk', () => {
      for (let i = 0; i < 5; i++) {
        updateCustomerMetrics(`user-${i}`, {
          daysSinceLastActivity: 60 + i * 10,
          uniqueFeaturesUsed: 0,
        });
        calculateRiskScore(`user-${i}`);
      }

      const highRisk = getHighRiskCustomers(10);

      expect(highRisk.length).toBeGreaterThan(0);
      expect(highRisk[0].risk.score).toBeGreaterThanOrEqual(
        highRisk[1]?.risk.score || 0
      );
    });

    it('respects limit parameter', () => {
      for (let i = 0; i < 20; i++) {
        updateCustomerMetrics(`user-${i}`, {
          daysSinceLastActivity: 75,
          uniqueFeaturesUsed: 0,
        });
        calculateRiskScore(`user-${i}`);
      }

      const highRisk = getHighRiskCustomers(5);

      expect(highRisk.length).toBeLessThanOrEqual(5);
    });
  });

  describe('formatRetentionStatus', () => {
    it('formats retention status string', () => {
      updateCustomerMetrics('user-1', {
        totalSessions: 10,
        daysSinceLastActivity: 5,
      });
      calculateHealthScore('user-1');

      const status = formatRetentionStatus();

      expect(status).toContain('👥');
      expect(status).toContain('Retention Engine');
      expect(status).toContain('customers');
    });
  });

  describe('Integration: Customer Lifecycle Management', () => {
    it('tracks customer journey from new to power user', () => {
      // New user signs up
      updateCustomerMetrics('user-1', {
        accountAgeInDays: 1,
        totalSessions: 1,
        daysSinceLastActivity: 0,
      });

      let segment = segmentCustomer('user-1');
      expect(segment.segment).toBe('new-users');

      // Customer engages after 2 weeks
      updateCustomerMetrics('user-1', {
        accountAgeInDays: 14,
        totalSessions: 10,
        uniqueFeaturesUsed: 3,
        daysSinceLastActivity: 1,
        loginFrequency: 2,
      });

      segment = segmentCustomer('user-1');
      expect(segment.segment).not.toBe('new-users');

      // Customer becomes power user
      updateCustomerMetrics('user-1', {
        accountAgeInDays: 90,
        totalSessions: 50,
        uniqueFeaturesUsed: 8,
        conversionsCount: 2,
        loginFrequency: 4,
        daysSinceLastActivity: 1,
      });

      segment = segmentCustomer('user-1');
      expect(segment.segment).toBe('power-users');

      const health = calculateHealthScore('user-1');
      expect(health.score).toBeGreaterThan(70);
    });

    it('detects and alerts on churn risk progression', () => {
      // Initially healthy
      updateCustomerMetrics('user-1', {
        totalSessions: 20,
        uniqueFeaturesUsed: 5,
        daysSinceLastActivity: 3,
        loginFrequency: 2,
      });

      let risk = calculateRiskScore('user-1');
      expect(risk.score).toBeLessThan(40);

      // User becomes inactive
      updateCustomerMetrics('user-1', {
        daysSinceLastActivity: 50,
        loginFrequency: 0.5,
      });

      risk = calculateRiskScore('user-1');
      expect(risk.score).toBeGreaterThan(50);

      // Trigger critical warning
      updateCustomerMetrics('user-1', {
        daysSinceLastActivity: 80,
        uniqueFeaturesUsed: 0,
        conversionsCount: 0,
      });

      const triggers = generateTriggers('user-1');
      expect(
        triggers.some(
          (t) => t.type === 'churn-warning' && t.priority === 'critical'
        )
      ).toBe(true);
    });

    it('generates retention strategy for diverse customer base', () => {
      // Create diverse customer base
      const scenarios = [
        { id: 'champion', sessions: 50, features: 8, days: 1, conversions: 3 },
        { id: 'loyal', sessions: 20, features: 4, days: 5, conversions: 1 },
        { id: 'at-risk', sessions: 5, features: 1, days: 40, conversions: 0 },
        { id: 'new', sessions: 2, features: 1, days: 2, conversions: 0 },
        { id: 'dormant', sessions: 1, features: 0, days: 120, conversions: 0 },
      ];

      const results: Record<string, any> = {};

      scenarios.forEach((s) => {
        updateCustomerMetrics(s.id, {
          totalSessions: s.sessions,
          uniqueFeaturesUsed: s.features,
          daysSinceLastActivity: s.days,
          conversionsCount: s.conversions,
          accountAgeInDays: 30,
          loginFrequency: s.sessions / 30,
        });

        const segment = segmentCustomer(s.id);
        const triggers = generateTriggers(s.id);
        const health = calculateHealthScore(s.id);
        const risk = calculateRiskScore(s.id);

        results[s.id] = {
          segment: segment.segment,
          triggerCount: triggers.length,
          healthScore: health.score,
          riskScore: risk.score,
        };
      });

      // Verify strategy differentiation
      expect(results.champion.healthScore).toBeGreaterThan(
        results.dormant.healthScore
      );
      expect(results.dormant.riskScore).toBeGreaterThan(
        results.champion.riskScore
      );
      expect(results.new.triggerCount).toBeGreaterThan(0);
    });
  });
});
