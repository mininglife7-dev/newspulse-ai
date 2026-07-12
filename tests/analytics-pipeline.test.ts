import { describe, it, expect, beforeEach } from 'vitest';
import {
  trackEvent,
  trackFeatureAdoption,
  getUsageMetrics,
  getUserEvents,
  getEventsByCategory,
  getEventsByAction,
  getFeatureAdoptionStats,
  getSessionInfo,
  getCohortRetention,
  calculateCohortMetrics,
  getAnalyticsSummary,
  formatAnalyticsStatus,
  resetAnalyticsPipeline,
} from '@/lib/analytics-pipeline';

describe('Analytics Pipeline - DNS-GOV-017', () => {
  beforeEach(() => {
    resetAnalyticsPipeline();
  });

  describe('trackEvent', () => {
    it('creates and stores an event', () => {
      const event = trackEvent('pageview', 'page_load', {
        userId: 'user-1',
        userAgent: 'Mozilla/5.0',
      });

      expect(event.id).toBeDefined();
      expect(event.timestamp).toBeDefined();
      expect(event.category).toBe('pageview');
      expect(event.action).toBe('page_load');
      expect(event.userId).toBe('user-1');
    });

    it('assigns unique event IDs', () => {
      const event1 = trackEvent('click', 'feature_toggle');
      const event2 = trackEvent('click', 'feature_toggle');

      expect(event1.id).not.toBe(event2.id);
    });

    it('generates session ID if not provided', () => {
      const event = trackEvent('pageview', 'page_load');
      expect(event.sessionId).toBeDefined();
      expect(event.sessionId).toMatch(/^session-/);
    });

    it('tracks properties and values', () => {
      const event = trackEvent('conversion', 'signup', {
        userId: 'user-1',
        label: 'plan-premium',
        value: 99,
        properties: { plan: 'premium', country: 'US' },
      });

      expect(event.label).toBe('plan-premium');
      expect(event.value).toBe(99);
      expect(event.properties?.plan).toBe('premium');
    });

    it('maintains bounded event history', () => {
      // Add 10001 events
      for (let i = 0; i < 10001; i++) {
        trackEvent('pageview', 'page_load', { userId: `user-${i}` });
      }

      const summary = getAnalyticsSummary();
      // Should be bounded at 10000
      expect(summary.totalEvents).toBeLessThanOrEqual(10000);
    });
  });

  describe('trackFeatureAdoption', () => {
    it('tracks new feature adoption', () => {
      const adoption = trackFeatureAdoption('dark-mode', 'user-1');

      expect(adoption.feature).toBe('dark-mode');
      expect(adoption.adoptedUsers).toBe(1);
      expect(adoption.adoptionRate).toBeGreaterThan(0);
    });

    it('counts unique adopted users', () => {
      trackFeatureAdoption('dark-mode', 'user-1');
      trackFeatureAdoption('dark-mode', 'user-2');
      trackFeatureAdoption('dark-mode', 'user-3');

      const stats = getFeatureAdoptionStats();
      const darkMode = stats.find((f) => f.feature === 'dark-mode');
      expect(darkMode?.adoptedUsers).toBe(3);
    });

    it('does not double-count same user', () => {
      trackFeatureAdoption('dark-mode', 'user-1');
      trackFeatureAdoption('dark-mode', 'user-1');
      trackFeatureAdoption('dark-mode', 'user-1');

      const stats = getFeatureAdoptionStats();
      const darkMode = stats.find((f) => f.feature === 'dark-mode');
      expect(darkMode?.adoptedUsers).toBe(1);
    });

    it('calculates adoption rate', () => {
      trackFeatureAdoption('feature', 'user-1');
      trackFeatureAdoption('feature', 'user-2');

      const stats = getFeatureAdoptionStats();
      const feature = stats.find((f) => f.feature === 'feature');
      expect(feature?.adoptionRate).toBeGreaterThan(0);
      expect(feature?.adoptionRate).toBeLessThanOrEqual(1);
    });
  });

  describe('getUsageMetrics', () => {
    it('calculates daily usage metrics', () => {
      trackEvent('pageview', 'page_load', { userId: 'user-1' });
      trackEvent('pageview', 'page_load', { userId: 'user-2' });
      trackEvent('pageview', 'page_load', { userId: 'user-1' });

      const metrics = getUsageMetrics();

      expect(metrics?.activeUsers).toBe(2);
      expect(metrics?.pageViews).toBe(3);
      expect(metrics?.sessions).toBeGreaterThan(0);
    });

    it('tracks conversions', () => {
      trackEvent('pageview', 'page_load', { userId: 'user-1' });
      trackEvent('conversion', 'signup', { userId: 'user-1' });

      const metrics = getUsageMetrics();
      expect(metrics?.conversions).toBe(1);
    });

    it('calculates bounce rate', () => {
      trackEvent('pageview', 'page_load', { userId: 'user-1', sessionId: 'session-1' });
      trackEvent('pageview', 'page_load', { userId: 'user-2', sessionId: 'session-2' });
      trackEvent('conversion', 'signup', { userId: 'user-2', sessionId: 'session-2' });

      const metrics = getUsageMetrics();
      expect(metrics?.bounceRate).toBeGreaterThan(0);
      expect(metrics?.bounceRate).toBeLessThanOrEqual(1);
    });

    it('calculates average session duration', () => {
      trackEvent('pageview', 'page_load', { userId: 'user-1', sessionId: 'session-1' });
      trackEvent('click', 'feature_toggle', { userId: 'user-1', sessionId: 'session-1' });

      const metrics = getUsageMetrics();
      expect(metrics?.avgSessionDuration).toBeGreaterThanOrEqual(0);
    });

    it('returns undefined for empty period', () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const metrics = getUsageMetrics(futureDate);

      expect(metrics).toBeUndefined();
    });
  });

  describe('getUserEvents', () => {
    it('retrieves all events for a user', () => {
      trackEvent('pageview', 'page_load', { userId: 'user-1' });
      trackEvent('click', 'feature_toggle', { userId: 'user-1' });
      trackEvent('pageview', 'page_load', { userId: 'user-2' });

      const userEvents = getUserEvents('user-1');
      expect(userEvents.length).toBe(2);
      expect(userEvents.every((e) => e.userId === 'user-1')).toBe(true);
    });

    it('returns empty array for user with no events', () => {
      trackEvent('pageview', 'page_load', { userId: 'user-1' });

      const userEvents = getUserEvents('user-nonexistent');
      expect(userEvents.length).toBe(0);
    });
  });

  describe('getEventsByCategory', () => {
    it('filters events by category', () => {
      trackEvent('pageview', 'page_load');
      trackEvent('click', 'feature_toggle');
      trackEvent('conversion', 'signup');

      const pageviews = getEventsByCategory('pageview');
      expect(pageviews.length).toBe(1);
      expect(pageviews[0].category).toBe('pageview');
    });

    it('returns empty array when no events match', () => {
      trackEvent('pageview', 'page_load');

      const errors = getEventsByCategory('error');
      expect(errors.length).toBe(0);
    });
  });

  describe('getEventsByAction', () => {
    it('filters events by action', () => {
      trackEvent('pageview', 'page_load');
      trackEvent('pageview', 'page_load');
      trackEvent('conversion', 'signup');

      const pageLoads = getEventsByAction('page_load');
      expect(pageLoads.length).toBe(2);
      expect(pageLoads.every((e) => e.action === 'page_load')).toBe(true);
    });
  });

  describe('getFeatureAdoptionStats', () => {
    it('returns all feature adoption stats', () => {
      trackFeatureAdoption('feature-a', 'user-1');
      trackFeatureAdoption('feature-b', 'user-2');

      const stats = getFeatureAdoptionStats();
      expect(stats.length).toBe(2);
    });

    it('returns empty array when no features tracked', () => {
      const stats = getFeatureAdoptionStats();
      expect(stats.length).toBe(0);
    });
  });

  describe('getSessionInfo', () => {
    it('retrieves session details', () => {
      trackEvent('pageview', 'page_load', { userId: 'user-1', sessionId: 'session-123' });
      trackEvent('click', 'feature_toggle', { userId: 'user-1', sessionId: 'session-123' });

      const session = getSessionInfo('session-123');
      expect(session?.sessionId).toBe('session-123');
      expect(session?.userId).toBe('user-1');
      expect(session?.eventCount).toBe(2);
      expect(session?.duration).toBeGreaterThanOrEqual(0);
    });

    it('returns undefined for nonexistent session', () => {
      const session = getSessionInfo('nonexistent');
      expect(session).toBeUndefined();
    });
  });

  describe('calculateCohortMetrics', () => {
    it('calculates retention for a cohort', () => {
      const cohortDate = new Date();
      cohortDate.setHours(0, 0, 0, 0);

      trackEvent('pageview', 'page_load', {
        userId: 'user-1',
        timestamp: cohortDate.toISOString(),
      });

      const metrics = calculateCohortMetrics(cohortDate.toISOString());
      expect(metrics.cohortSize).toBeGreaterThan(0);
      expect(metrics.retention).toBeDefined();
      expect(metrics.churnRate).toBeGreaterThanOrEqual(0);
    });

    it('retrieves stored cohort metrics', () => {
      const cohortDate = new Date();
      cohortDate.setHours(0, 0, 0, 0);

      calculateCohortMetrics(cohortDate.toISOString());

      const retrieved = getCohortRetention(cohortDate.toISOString());
      expect(retrieved).toBeDefined();
      expect(retrieved?.cohortDate).toBe(cohortDate.toISOString());
    });
  });

  describe('getAnalyticsSummary', () => {
    it('returns summary statistics', () => {
      trackEvent('pageview', 'page_load', { userId: 'user-1' });
      trackEvent('pageview', 'page_load', { userId: 'user-2' });
      trackFeatureAdoption('feature', 'user-1');

      const summary = getAnalyticsSummary();
      expect(summary.totalEvents).toBeGreaterThan(0);
      expect(summary.uniqueUsers).toBeGreaterThan(0);
      expect(summary.features).toBeGreaterThan(0);
      expect(summary.lastProcessed).toBeDefined();
    });
  });

  describe('formatAnalyticsStatus', () => {
    it('formats status string', () => {
      trackEvent('pageview', 'page_load', { userId: 'user-1' });
      trackEvent('conversion', 'signup', { userId: 'user-1' });

      const status = formatAnalyticsStatus();
      expect(status).toContain('📊');
      expect(status).toContain('events');
      expect(status).toContain('users');
    });

    it('includes conversion metrics in status', () => {
      trackEvent('pageview', 'page_load', { userId: 'user-1' });
      trackEvent('conversion', 'signup', { userId: 'user-1' });
      getUsageMetrics();

      const status = formatAnalyticsStatus();
      expect(status).toContain('conversion');
    });
  });

  describe('Integration: Product Analytics Workflow', () => {
    it('tracks complete user journey', () => {
      const userId = 'user-journey';
      const sessionId = 'session-journey';

      // User lands on page
      trackEvent('pageview', 'page_load', { userId, sessionId, referrer: 'google' });

      // User explores features
      trackEvent('click', 'feature_toggle', { userId, sessionId, label: 'dark-mode' });
      trackFeatureAdoption('dark-mode', userId);

      // User signs up
      trackEvent('conversion', 'signup', { userId, sessionId, value: 1 });

      // Verify journey tracking
      const userEvents = getUserEvents(userId);
      expect(userEvents.length).toBe(3);

      const session = getSessionInfo(sessionId);
      expect(session?.eventCount).toBe(3);

      const features = getFeatureAdoptionStats();
      expect(features.length).toBeGreaterThan(0);
    });

    it('tracks feature adoption across multiple users', () => {
      const feature = 'new-workspace-ui';

      // 3 users adopt the feature
      trackFeatureAdoption(feature, 'user-1');
      trackFeatureAdoption(feature, 'user-2');
      trackFeatureAdoption(feature, 'user-3');

      // 2 additional users exist but haven't adopted
      trackEvent('pageview', 'page_load', { userId: 'user-4' });
      trackEvent('pageview', 'page_load', { userId: 'user-5' });

      const stats = getFeatureAdoptionStats();
      const adopted = stats.find((f) => f.feature === feature);

      expect(adopted).toBeDefined();
      expect(adopted?.adoptedUsers).toBe(3);
    });

    it('calculates cohort churn and retention', () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Track 5 users on cohort date
      for (let i = 0; i < 5; i++) {
        trackEvent('pageview', 'page_load', {
          userId: `user-${i}`,
          timestamp: today.toISOString(),
        });
      }

      const metrics = calculateCohortMetrics(today.toISOString());
      expect(metrics.cohortSize).toBe(5);
      expect(metrics.retention[0]).toBeCloseTo(1.0);
      expect(metrics.churnRate).toBeGreaterThanOrEqual(0);
    });
  });
});
