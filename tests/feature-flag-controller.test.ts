/**
 * DNA-013: Feature Flag Controller Tests
 *
 * Verify feature rollout system:
 * - Instant rollouts (100% of users)
 * - Gradual rollouts (% of users over time)
 * - Canary deployments (gradual with automatic abort)
 * - A/B testing (segment-based variants)
 * - User targeting (percentile, segment, explicit, attribute)
 *
 * Total: 18 tests covering safe and unsafe rollout scenarios
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  FeatureFlagController,
  FeatureFlag,
  RolloutStrategy,
  UserTargeting,
  FeatureFlagEvaluation,
} from '@/lib/feature-flag-controller';

describe('DNA-013: Feature Flag Controller', () => {
  let controller: FeatureFlagController;

  beforeEach(() => {
    controller = FeatureFlagController.getInstance();
  });

  // =========================================================================
  // Test Suite 1: Instant Rollouts (Immediate Deployment)
  // =========================================================================

  describe('Instant Rollouts', () => {
    it('should enable feature for all users on instant rollout', async () => {
      await controller.createFlag({
        id: 'feature-instant',
        name: 'Instant Feature',
        description: 'Deployed to all users immediately',
        enabled: true,
        rollout: { type: 'instant' },
        targeting: { type: 'all' },
        status: 'active',
      });

      const result1 = await controller.evaluateFlag('feature-instant', 'user-001');
      const result2 = await controller.evaluateFlag('feature-instant', 'user-999');

      expect(result1.enabled).toBe(true);
      expect(result2.enabled).toBe(true);
    });

    it('should disable feature when disabled flag is evaluated', async () => {
      await controller.createFlag({
        id: 'feature-disabled',
        name: 'Disabled Feature',
        description: 'Feature is disabled',
        enabled: false,
        rollout: { type: 'instant' },
        targeting: { type: 'all' },
        status: 'active',
      });

      const result = await controller.evaluateFlag('feature-disabled', 'user-001');

      expect(result.enabled).toBe(false);
      expect(result.reason).toBe('feature_disabled');
    });

    it('should return flag_not_found for non-existent flags', async () => {
      const result = await controller.evaluateFlag('non-existent-flag', 'user-001');

      expect(result.enabled).toBe(false);
      expect(result.reason).toBe('flag_not_found');
    });
  });

  // =========================================================================
  // Test Suite 2: Gradual Rollouts (Phased Deployment)
  // =========================================================================

  describe('Gradual Rollouts', () => {
    it('should roll out to configured percentage of users', async () => {
      await controller.createFlag({
        id: 'feature-gradual',
        name: 'Gradual Rollout',
        description: 'Deploying to 50% of users',
        enabled: true,
        rollout: {
          type: 'gradual',
          percentages: [{ percentage: 50, duration: 86400000, startedAt: new Date().toISOString() }],
        },
        targeting: { type: 'all' },
        status: 'active',
      });

      const results = [];
      for (let i = 0; i < 100; i++) {
        const result = await controller.evaluateFlag('feature-gradual', `user-${i}`);
        results.push(result.enabled);
      }

      const enabledCount = results.filter(r => r).length;
      expect(enabledCount).toBeGreaterThan(30);
      expect(enabledCount).toBeLessThan(70);
    });

    it('should support multiple gradual phases', async () => {
      const now = new Date();
      const pastTime = new Date(now.getTime() - 86400000).toISOString();

      await controller.createFlag({
        id: 'feature-multi-phase',
        name: 'Multi-Phase Gradual',
        description: 'Multiple rollout phases',
        enabled: true,
        rollout: {
          type: 'gradual',
          percentages: [
            { percentage: 25, duration: 86400000, startedAt: pastTime, completedAt: now.toISOString() },
            { percentage: 50, duration: 86400000, startedAt: now.toISOString() },
          ],
        },
        targeting: { type: 'all' },
        status: 'active',
      });

      const flag = await controller.getFlag('feature-multi-phase');
      expect(flag?.rollout.type).toBe('gradual');
      if (flag?.rollout.type === 'gradual') {
        expect(flag.rollout.percentages).toHaveLength(2);
      }
    });
  });

  // =========================================================================
  // Test Suite 3: Canary Deployments (Automated Rollback)
  // =========================================================================

  describe('Canary Deployments', () => {
    it('should deploy to small percentage with error monitoring', async () => {
      await controller.createFlag({
        id: 'feature-canary',
        name: 'Canary Deployment',
        description: 'Testing with 10% error threshold',
        enabled: true,
        rollout: {
          type: 'canary',
          errorThreshold: 10,
          phases: [{ percentage: 5, duration: 3600000, maxErrorRate: 10, startedAt: new Date().toISOString() }],
        },
        targeting: { type: 'all' },
        status: 'active',
      });

      const result = await controller.evaluateFlag('feature-canary', 'user-001');
      expect(result.reason).toMatch(/canary|outside_canary/);
    });

    it('should abort canary on high error rate', async () => {
      await controller.createFlag({
        id: 'feature-canary-abort',
        name: 'Canary with Abort',
        description: 'Canary deployment with error tracking',
        enabled: true,
        rollout: {
          type: 'canary',
          errorThreshold: 5,
          phases: [{ percentage: 10, duration: 3600000, maxErrorRate: 5, startedAt: new Date().toISOString() }],
        },
        targeting: { type: 'all' },
        status: 'active',
      });

      await controller.recordExposure('feature-canary-abort');
      await controller.recordError('feature-canary-abort');
      await controller.recordError('feature-canary-abort');

      const metrics = await controller.getMetrics('feature-canary-abort');
      expect(metrics?.errorRate).toBeGreaterThan(0);

      const aborted = await controller.abortCanary('feature-canary-abort', 'error_rate_exceeded');
      expect(aborted).toBe(true);

      const flag = await controller.getFlag('feature-canary-abort');
      expect(flag?.status).toBe('rolled_back');
    });
  });

  // =========================================================================
  // Test Suite 4: A/B Testing (Variant Experiments)
  // =========================================================================

  describe('A/B Testing', () => {
    it('should distribute users across A/B variants', async () => {
      await controller.createFlag({
        id: 'feature-ab-test',
        name: 'A/B Test Feature',
        description: 'Testing two UI variants',
        enabled: true,
        rollout: {
          type: 'ab_test',
          variants: [
            { id: 'variant-a', name: 'Original', percentage: 50 },
            { id: 'variant-b', name: 'New', percentage: 50 },
          ],
        },
        targeting: { type: 'all' },
        status: 'active',
      });

      const variantCounts: { [key: string]: number } = { 'variant-a': 0, 'variant-b': 0 };

      for (let i = 0; i < 100; i++) {
        const result = await controller.evaluateFlag('feature-ab-test', `user-${i}`);
        if (result.variant) {
          variantCounts[result.variant]++;
        }
      }

      expect(variantCounts['variant-a']).toBeGreaterThan(30);
      expect(variantCounts['variant-b']).toBeGreaterThan(30);
    });

    it('should assign same user to same variant consistently', async () => {
      await controller.createFlag({
        id: 'feature-ab-consistent',
        name: 'Consistent A/B',
        description: 'Same user gets same variant',
        enabled: true,
        rollout: {
          type: 'ab_test',
          variants: [
            { id: 'variant-a', name: 'A', percentage: 50 },
            { id: 'variant-b', name: 'B', percentage: 50 },
          ],
        },
        targeting: { type: 'all' },
        status: 'active',
      });

      const result1 = await controller.evaluateFlag('feature-ab-consistent', 'user-123');
      const result2 = await controller.evaluateFlag('feature-ab-consistent', 'user-123');
      const result3 = await controller.evaluateFlag('feature-ab-consistent', 'user-123');

      expect(result1.variant).toBe(result2.variant);
      expect(result2.variant).toBe(result3.variant);
    });
  });

  // =========================================================================
  // Test Suite 5: User Targeting (Segmentation)
  // =========================================================================

  describe('User Targeting', () => {
    it('should target all users', async () => {
      await controller.createFlag({
        id: 'feature-target-all',
        name: 'All Users',
        description: 'Everyone gets it',
        enabled: true,
        rollout: { type: 'instant' },
        targeting: { type: 'all' },
        status: 'active',
      });

      const result = await controller.evaluateFlag('feature-target-all', 'user-001');
      expect(result.enabled).toBe(true);
    });

    it('should target percentile of users by ID hash', async () => {
      await controller.createFlag({
        id: 'feature-target-percentile',
        name: 'Percentile Target',
        description: 'Target 20% by user ID hash',
        enabled: true,
        rollout: { type: 'instant' },
        targeting: {
          type: 'percentile',
          percentile: { percentage: 20, seed: 'percentile-seed' },
        },
        status: 'active',
      });

      const results = [];
      for (let i = 0; i < 100; i++) {
        const result = await controller.evaluateFlag('feature-target-percentile', `user-${i}`);
        results.push(result.enabled);
      }

      const enabledCount = results.filter(r => r).length;
      expect(enabledCount).toBeGreaterThan(10);
      expect(enabledCount).toBeLessThan(30);
    });

    it('should target specific users by ID', async () => {
      await controller.createFlag({
        id: 'feature-target-explicit',
        name: 'Explicit Users',
        description: 'Specific user IDs only',
        enabled: true,
        rollout: { type: 'instant' },
        targeting: {
          type: 'explicit',
          userIds: ['admin-001', 'beta-tester-001', 'beta-tester-002'],
        },
        status: 'active',
      });

      const result1 = await controller.evaluateFlag('feature-target-explicit', 'admin-001');
      const result2 = await controller.evaluateFlag('feature-target-explicit', 'regular-user');

      expect(result1.enabled).toBe(true);
      expect(result2.enabled).toBe(false);
    });

    it('should target users by attributes', async () => {
      await controller.createFlag({
        id: 'feature-target-attribute',
        name: 'Attribute Target',
        description: 'Target by user attributes',
        enabled: true,
        rollout: { type: 'instant' },
        targeting: {
          type: 'attribute',
          attributes: { userType: 'beta_tester', region: 'EU' },
        },
        status: 'active',
      });

      const betaTesterEU = await controller.evaluateFlag('feature-target-attribute', 'user-001', {
        userType: 'beta_tester',
        region: 'EU',
      });

      const regularUserEU = await controller.evaluateFlag('feature-target-attribute', 'user-002', {
        userType: 'regular',
        region: 'EU',
      });

      expect(betaTesterEU.enabled).toBe(true);
      expect(regularUserEU.enabled).toBe(false);
    });
  });

  // =========================================================================
  // Test Suite 6: Feature Flag Lifecycle & Management
  // =========================================================================

  describe('Feature Flag Management', () => {
    it('should create and retrieve features', async () => {
      const created = await controller.createFlag({
        id: 'feature-create-test',
        name: 'Create Test',
        description: 'Testing creation',
        enabled: true,
        rollout: { type: 'instant' },
        targeting: { type: 'all' },
        status: 'draft',
      });

      const retrieved = await controller.getFlag('feature-create-test');

      expect(created.id).toBe(retrieved?.id);
      expect(created.status).toBe('draft');
    });

    it('should update feature flags', async () => {
      await controller.createFlag({
        id: 'feature-update-test',
        name: 'Update Test',
        description: 'Testing updates',
        enabled: true,
        rollout: { type: 'instant' },
        targeting: { type: 'all' },
        status: 'active',
      });

      const updated = await controller.updateFlag('feature-update-test', {
        enabled: false,
        status: 'paused',
      });

      expect(updated?.enabled).toBe(false);
      expect(updated?.status).toBe('paused');
    });

    it('should list all flags', async () => {
      await controller.createFlag({
        id: 'feature-list-1',
        name: 'List Test 1',
        description: 'Test 1',
        enabled: true,
        rollout: { type: 'instant' },
        targeting: { type: 'all' },
        status: 'active',
      });

      await controller.createFlag({
        id: 'feature-list-2',
        name: 'List Test 2',
        description: 'Test 2',
        enabled: true,
        rollout: { type: 'instant' },
        targeting: { type: 'all' },
        status: 'active',
      });

      const flags = await controller.getAllFlags();
      expect(flags.length).toBeGreaterThanOrEqual(2);
    });

    it('should track evaluation logs', async () => {
      await controller.createFlag({
        id: 'feature-log-test',
        name: 'Log Test',
        description: 'Testing logs',
        enabled: true,
        rollout: { type: 'instant' },
        targeting: { type: 'all' },
        status: 'active',
      });

      await controller.evaluateFlag('feature-log-test', 'user-001');
      await controller.evaluateFlag('feature-log-test', 'user-002');
      await controller.evaluateFlag('feature-log-test', 'user-003');

      const logs = await controller.getEvaluationLog();
      expect(logs.length).toBeGreaterThanOrEqual(3);
    });

    it('should track feature metrics', async () => {
      await controller.createFlag({
        id: 'feature-metrics-test',
        name: 'Metrics Test',
        description: 'Testing metrics',
        enabled: true,
        rollout: { type: 'instant' },
        targeting: { type: 'all' },
        status: 'active',
      });

      await controller.recordExposure('feature-metrics-test');
      await controller.recordExposure('feature-metrics-test');
      await controller.recordError('feature-metrics-test');

      const metrics = await controller.getMetrics('feature-metrics-test');
      expect(metrics?.exposedUsers).toBe(2);
      expect(metrics?.errorCount).toBe(1);
      expect(metrics?.errorRate).toBe(50);
    });
  });

  // =========================================================================
  // Test Suite 7: Production Safety (Edge Cases & Error Handling)
  // =========================================================================

  describe('Production Safety', () => {
    it('should handle non-existent flags gracefully', async () => {
      const result = await controller.evaluateFlag('does-not-exist', 'user-001');
      expect(result.enabled).toBe(false);
      expect(result.reason).toBe('flag_not_found');
    });

    it('should handle missing context in targeting', async () => {
      await controller.createFlag({
        id: 'feature-missing-context',
        name: 'Missing Context Test',
        description: 'Test without context',
        enabled: true,
        rollout: { type: 'instant' },
        targeting: {
          type: 'attribute',
          attributes: { region: 'EU' },
        },
        status: 'active',
      });

      const result = await controller.evaluateFlag('feature-missing-context', 'user-001');
      expect(result.enabled).toBe(false);
    });

    it('should assign users consistently across multiple evaluations', async () => {
      await controller.createFlag({
        id: 'feature-consistency',
        name: 'Consistency Test',
        description: 'Same result for same user',
        enabled: true,
        rollout: {
          type: 'gradual',
          percentages: [{ percentage: 50, duration: 86400000, startedAt: new Date().toISOString() }],
        },
        targeting: { type: 'all' },
        status: 'active',
      });

      const result1 = await controller.evaluateFlag('feature-consistency', 'user-consistency-test');
      const result2 = await controller.evaluateFlag('feature-consistency', 'user-consistency-test');
      const result3 = await controller.evaluateFlag('feature-consistency', 'user-consistency-test');

      expect(result1.enabled).toBe(result2.enabled);
      expect(result2.enabled).toBe(result3.enabled);
    });
  });
});
