import { describe, it, expect, beforeEach } from 'vitest';
import {
  registerFlag,
  getFlag,
  listFlags,
  updateFlag,
  evaluateFlag,
  getVariant,
  startGradualRollout,
  incrementRollout,
  formatFlagStatus,
  getFlagStats,
  resetFlagHub,
  type FeatureFlag,
  type FlagContext,
} from '@/lib/feature-flag-controller';

describe('Feature Flag Controller - DNA-GOV-013', () => {
  beforeEach(() => {
    resetFlagHub();
  });

  describe('registerFlag', () => {
    it('registers a new flag', () => {
      const flag: FeatureFlag = {
        id: 'test-flag-1',
        name: 'Test Feature',
        description: 'A test feature flag',
        enabled: true,
        percentage: 0,
        rules: [],
        createdAt: '2026-07-12T00:00:00Z',
        updatedAt: '2026-07-12T00:00:00Z',
        createdBy: 'test-user',
        tags: [],
      };

      registerFlag(flag);
      const retrieved = getFlag('test-flag-1');

      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('Test Feature');
      expect(retrieved?.enabled).toBe(true);
    });

    it('updates timestamp when registering flag', () => {
      const flag: FeatureFlag = {
        id: 'test-flag-2',
        name: 'Test',
        description: '',
        enabled: false,
        percentage: 0,
        rules: [],
        createdAt: '2026-07-10T00:00:00Z',
        updatedAt: '2026-07-10T00:00:00Z',
        createdBy: 'user',
        tags: [],
      };

      const before = new Date();
      registerFlag(flag);
      const after = new Date();

      const retrieved = getFlag('test-flag-2');
      const updateTime = new Date(retrieved?.updatedAt || '');

      expect(updateTime.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(updateTime.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('getFlag', () => {
    it('returns undefined for non-existent flag', () => {
      const flag = getFlag('nonexistent');
      expect(flag).toBeUndefined();
    });

    it('returns flag by ID', () => {
      const original: FeatureFlag = {
        id: 'flag-1',
        name: 'Feature One',
        description: 'desc',
        enabled: true,
        percentage: 50,
        rules: [],
        createdAt: '2026-07-12T00:00:00Z',
        updatedAt: '2026-07-12T00:00:00Z',
        createdBy: 'user',
        tags: ['production'],
      };

      registerFlag(original);
      const retrieved = getFlag('flag-1');

      expect(retrieved?.id).toBe('flag-1');
      expect(retrieved?.percentage).toBe(50);
      expect(retrieved?.tags).toContain('production');
    });
  });

  describe('listFlags', () => {
    it('returns empty array when no flags registered', () => {
      const flags = listFlags();
      expect(Array.isArray(flags)).toBe(true);
      expect(flags.length).toBe(0);
    });

    it('returns all registered flags', () => {
      const flag1: FeatureFlag = {
        id: 'flag-1',
        name: 'Feature 1',
        description: '',
        enabled: true,
        percentage: 0,
        rules: [],
        createdAt: '2026-07-12T00:00:00Z',
        updatedAt: '2026-07-12T00:00:00Z',
        createdBy: 'user',
        tags: [],
      };

      const flag2: FeatureFlag = {
        id: 'flag-2',
        name: 'Feature 2',
        description: '',
        enabled: false,
        percentage: 100,
        rules: [],
        createdAt: '2026-07-12T00:00:00Z',
        updatedAt: '2026-07-12T00:00:00Z',
        createdBy: 'user',
        tags: [],
      };

      registerFlag(flag1);
      registerFlag(flag2);

      const flags = listFlags();
      expect(flags.length).toBe(2);
      expect(flags.map((f) => f.id)).toContain('flag-1');
      expect(flags.map((f) => f.id)).toContain('flag-2');
    });
  });

  describe('updateFlag', () => {
    it('returns undefined for non-existent flag', () => {
      const updated = updateFlag('nonexistent', { enabled: true });
      expect(updated).toBeUndefined();
    });

    it('updates flag properties', () => {
      const flag: FeatureFlag = {
        id: 'flag-1',
        name: 'Original Name',
        description: 'Original desc',
        enabled: false,
        percentage: 10,
        rules: [],
        createdAt: '2026-07-12T00:00:00Z',
        updatedAt: '2026-07-12T00:00:00Z',
        createdBy: 'user',
        tags: [],
      };

      registerFlag(flag);

      const updated = updateFlag('flag-1', {
        name: 'Updated Name',
        percentage: 50,
        enabled: true,
      });

      expect(updated?.name).toBe('Updated Name');
      expect(updated?.percentage).toBe(50);
      expect(updated?.enabled).toBe(true);
    });

    it('preserves ID and createdAt when updating', () => {
      const flag: FeatureFlag = {
        id: 'flag-1',
        name: 'Original',
        description: '',
        enabled: false,
        percentage: 0,
        rules: [],
        createdAt: '2026-07-01T00:00:00Z',
        updatedAt: '2026-07-12T00:00:00Z',
        createdBy: 'user',
        tags: [],
      };

      registerFlag(flag);
      const updated = updateFlag('flag-1', { enabled: true })!;

      expect(updated.id).toBe('flag-1');
      expect(updated.createdAt).toBe('2026-07-01T00:00:00Z');
    });

    it('updates updatedAt timestamp', () => {
      const flag: FeatureFlag = {
        id: 'flag-1',
        name: 'Test',
        description: '',
        enabled: false,
        percentage: 0,
        rules: [],
        createdAt: '2026-07-12T00:00:00Z',
        updatedAt: '2026-07-12T00:00:00Z',
        createdBy: 'user',
        tags: [],
      };

      registerFlag(flag);

      const before = new Date();
      updateFlag('flag-1', { enabled: true });
      const after = new Date();

      const updated = getFlag('flag-1')!;
      const updateTime = new Date(updated.updatedAt);

      expect(updateTime.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(updateTime.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('evaluateFlag', () => {
    it('returns disabled for non-existent flag', () => {
      const evaluation = evaluateFlag('nonexistent', {});
      expect(evaluation.enabled).toBe(false);
      expect(evaluation.reason).toBe('Flag not found');
    });

    it('returns disabled when flag is globally disabled', () => {
      const flag: FeatureFlag = {
        id: 'flag-1',
        name: 'Test',
        description: '',
        enabled: false,
        percentage: 100,
        rules: [],
        createdAt: '2026-07-12T00:00:00Z',
        updatedAt: '2026-07-12T00:00:00Z',
        createdBy: 'user',
        tags: [],
      };

      registerFlag(flag);

      const evaluation = evaluateFlag('flag-1', { userId: 'user-1' });
      expect(evaluation.enabled).toBe(false);
      expect(evaluation.reason).toBe('Flag is globally disabled');
    });

    it('enables flag when rule type is "all"', () => {
      const flag: FeatureFlag = {
        id: 'flag-1',
        name: 'Test',
        description: '',
        enabled: true,
        percentage: 0,
        rules: [{ type: 'all', value: '', enabled: true }],
        createdAt: '2026-07-12T00:00:00Z',
        updatedAt: '2026-07-12T00:00:00Z',
        createdBy: 'user',
        tags: [],
      };

      registerFlag(flag);

      const evaluation = evaluateFlag('flag-1', {});
      expect(evaluation.enabled).toBe(true);
      expect(evaluation.reason).toContain('all');
    });

    it('matches user ID rule', () => {
      const flag: FeatureFlag = {
        id: 'flag-1',
        name: 'Test',
        description: '',
        enabled: true,
        percentage: 0,
        rules: [{ type: 'user', value: 'user-123', enabled: true }],
        createdAt: '2026-07-12T00:00:00Z',
        updatedAt: '2026-07-12T00:00:00Z',
        createdBy: 'user',
        tags: [],
      };

      registerFlag(flag);

      const match = evaluateFlag('flag-1', { userId: 'user-123' });
      expect(match.enabled).toBe(true);

      const noMatch = evaluateFlag('flag-1', { userId: 'user-456' });
      expect(noMatch.enabled).toBe(false);
    });

    it('matches email rule', () => {
      const flag: FeatureFlag = {
        id: 'flag-1',
        name: 'Test',
        description: '',
        enabled: true,
        percentage: 0,
        rules: [{ type: 'email', value: 'admin@example.com', enabled: true }],
        createdAt: '2026-07-12T00:00:00Z',
        updatedAt: '2026-07-12T00:00:00Z',
        createdBy: 'user',
        tags: [],
      };

      registerFlag(flag);

      const match = evaluateFlag('flag-1', { userEmail: 'admin@example.com' });
      expect(match.enabled).toBe(true);

      const noMatch = evaluateFlag('flag-1', {
        userEmail: 'other@example.com',
      });
      expect(noMatch.enabled).toBe(false);
    });

    it('matches company ID rule', () => {
      const flag: FeatureFlag = {
        id: 'flag-1',
        name: 'Test',
        description: '',
        enabled: true,
        percentage: 0,
        rules: [{ type: 'company', value: 'company-abc', enabled: true }],
        createdAt: '2026-07-12T00:00:00Z',
        updatedAt: '2026-07-12T00:00:00Z',
        createdBy: 'user',
        tags: [],
      };

      registerFlag(flag);

      const match = evaluateFlag('flag-1', { companyId: 'company-abc' });
      expect(match.enabled).toBe(true);

      const noMatch = evaluateFlag('flag-1', { companyId: 'company-xyz' });
      expect(noMatch.enabled).toBe(false);
    });

    it('matches tag rule', () => {
      const flag: FeatureFlag = {
        id: 'flag-1',
        name: 'Test',
        description: '',
        enabled: true,
        percentage: 0,
        rules: [{ type: 'tag', value: 'beta-tester', enabled: true }],
        createdAt: '2026-07-12T00:00:00Z',
        updatedAt: '2026-07-12T00:00:00Z',
        createdBy: 'user',
        tags: [],
      };

      registerFlag(flag);

      const match = evaluateFlag('flag-1', {
        tags: ['beta-tester', 'early-access'],
      });
      expect(match.enabled).toBe(true);

      const noMatch = evaluateFlag('flag-1', { tags: ['other'] });
      expect(noMatch.enabled).toBe(false);
    });

    it('skips disabled rules', () => {
      const flag: FeatureFlag = {
        id: 'flag-1',
        name: 'Test',
        description: '',
        enabled: true,
        percentage: 0,
        rules: [{ type: 'user', value: 'user-123', enabled: false }],
        createdAt: '2026-07-12T00:00:00Z',
        updatedAt: '2026-07-12T00:00:00Z',
        createdBy: 'user',
        tags: [],
      };

      registerFlag(flag);

      const evaluation = evaluateFlag('flag-1', { userId: 'user-123' });
      expect(evaluation.enabled).toBe(false);
    });

    it('applies percentage rollout consistently', () => {
      const flag: FeatureFlag = {
        id: 'flag-1',
        name: 'Test',
        description: '',
        enabled: true,
        percentage: 50,
        rules: [],
        createdAt: '2026-07-12T00:00:00Z',
        updatedAt: '2026-07-12T00:00:00Z',
        createdBy: 'user',
        tags: [],
      };

      registerFlag(flag);

      const userId = 'user-consistent';
      const eval1 = evaluateFlag('flag-1', { userId });
      const eval2 = evaluateFlag('flag-1', { userId });
      const eval3 = evaluateFlag('flag-1', { userId });

      expect(eval1.enabled).toBe(eval2.enabled);
      expect(eval2.enabled).toBe(eval3.enabled);
    });

    it('handles percentage rollout with 0%', () => {
      const flag: FeatureFlag = {
        id: 'flag-1',
        name: 'Test',
        description: '',
        enabled: true,
        percentage: 0,
        rules: [],
        createdAt: '2026-07-12T00:00:00Z',
        updatedAt: '2026-07-12T00:00:00Z',
        createdBy: 'user',
        tags: [],
      };

      registerFlag(flag);

      const evaluation = evaluateFlag('flag-1', { userId: 'user-1' });
      expect(evaluation.enabled).toBe(false);
    });

    it('handles percentage rollout with 100%', () => {
      const flag: FeatureFlag = {
        id: 'flag-1',
        name: 'Test',
        description: '',
        enabled: true,
        percentage: 100,
        rules: [],
        createdAt: '2026-07-12T00:00:00Z',
        updatedAt: '2026-07-12T00:00:00Z',
        createdBy: 'user',
        tags: [],
      };

      registerFlag(flag);

      const evaluation = evaluateFlag('flag-1', { userId: 'user-1' });
      expect(evaluation.enabled).toBe(true);
    });

    it('returns flag metadata in evaluation', () => {
      const flag: FeatureFlag = {
        id: 'flag-1',
        name: 'Test Feature',
        description: 'A test flag',
        enabled: true,
        percentage: 50,
        rules: [],
        createdAt: '2026-07-12T00:00:00Z',
        updatedAt: '2026-07-12T00:00:00Z',
        createdBy: 'user',
        tags: [],
      };

      registerFlag(flag);

      const evaluation = evaluateFlag('flag-1', { userId: 'user-1' });
      expect(evaluation.flagId).toBe('flag-1');
      expect(evaluation.flagName).toBe('Test Feature');
      expect(evaluation.reason).toBeDefined();
      expect(evaluation.evaluatedAt).toBeDefined();
    });
  });

  describe('getVariant', () => {
    it('returns evaluation without variant when flag disabled', () => {
      const flag: FeatureFlag = {
        id: 'flag-1',
        name: 'Test',
        description: '',
        enabled: false,
        percentage: 100,
        rules: [],
        createdAt: '2026-07-12T00:00:00Z',
        updatedAt: '2026-07-12T00:00:00Z',
        createdBy: 'user',
        tags: [],
      };

      registerFlag(flag);

      const result = getVariant('flag-1', { userId: 'user-1' });
      expect(result.enabled).toBe(false);
      expect(result.variant).toBeUndefined();
    });

    it('returns evaluation without variant when no variants defined', () => {
      const flag: FeatureFlag = {
        id: 'flag-1',
        name: 'Test',
        description: '',
        enabled: true,
        percentage: 100,
        rules: [],
        createdAt: '2026-07-12T00:00:00Z',
        updatedAt: '2026-07-12T00:00:00Z',
        createdBy: 'user',
        tags: [],
      };

      registerFlag(flag);

      const result = getVariant('flag-1', { userId: 'user-1' });
      expect(result.enabled).toBe(true);
      expect(result.variant).toBeUndefined();
    });

    it('assigns variant consistently for same user', () => {
      const flag: FeatureFlag = {
        id: 'flag-1',
        name: 'Test',
        description: '',
        enabled: true,
        percentage: 100,
        rules: [],
        variants: { variantA: 50, variantB: 50 },
        createdAt: '2026-07-12T00:00:00Z',
        updatedAt: '2026-07-12T00:00:00Z',
        createdBy: 'user',
        tags: [],
      };

      registerFlag(flag);

      const userId = 'consistent-user';
      const result1 = getVariant('flag-1', { userId });
      const result2 = getVariant('flag-1', { userId });
      const result3 = getVariant('flag-1', { userId });

      expect(result1.variant).toBe(result2.variant);
      expect(result2.variant).toBe(result3.variant);
      expect(result1.variant).toMatch(/variantA|variantB/);
    });

    it('distributes variants across users', () => {
      const flag: FeatureFlag = {
        id: 'flag-1',
        name: 'Test',
        description: '',
        enabled: true,
        percentage: 100,
        rules: [],
        variants: { variantA: 50, variantB: 50 },
        createdAt: '2026-07-12T00:00:00Z',
        updatedAt: '2026-07-12T00:00:00Z',
        createdBy: 'user',
        tags: [],
      };

      registerFlag(flag);

      const variantCounts = { variantA: 0, variantB: 0 };

      for (let i = 0; i < 100; i++) {
        const result = getVariant('flag-1', { userId: `user-${i}` });
        if (result.variant === 'variantA') variantCounts.variantA++;
        if (result.variant === 'variantB') variantCounts.variantB++;
      }

      expect(variantCounts.variantA).toBeGreaterThan(0);
      expect(variantCounts.variantB).toBeGreaterThan(0);
    });

    it('includes variant in reason', () => {
      const flag: FeatureFlag = {
        id: 'flag-1',
        name: 'Test',
        description: '',
        enabled: true,
        percentage: 100,
        rules: [],
        variants: { variantA: 100 },
        createdAt: '2026-07-12T00:00:00Z',
        updatedAt: '2026-07-12T00:00:00Z',
        createdBy: 'user',
        tags: [],
      };

      registerFlag(flag);

      const result = getVariant('flag-1', { userId: 'user-1' });
      expect(result.reason).toContain('variant:');
    });

    it('handles multiple variants with different percentages', () => {
      const flag: FeatureFlag = {
        id: 'flag-1',
        name: 'Test',
        description: '',
        enabled: true,
        percentage: 100,
        rules: [],
        variants: { controlGroup: 70, variantA: 20, variantB: 10 },
        createdAt: '2026-07-12T00:00:00Z',
        updatedAt: '2026-07-12T00:00:00Z',
        createdBy: 'user',
        tags: [],
      };

      registerFlag(flag);

      const variantCounts = { controlGroup: 0, variantA: 0, variantB: 0 };

      for (let i = 0; i < 1000; i++) {
        const result = getVariant('flag-1', { userId: `user-${i}` });
        const v = result.variant as 'controlGroup' | 'variantA' | 'variantB';
        if (v in variantCounts) {
          variantCounts[v]++;
        }
      }

      const controlRatio = variantCounts.controlGroup / 1000;
      const aRatio = variantCounts.variantA / 1000;
      const bRatio = variantCounts.variantB / 1000;

      expect(controlRatio).toBeGreaterThan(0.6);
      expect(controlRatio).toBeLessThan(0.8);
      expect(aRatio).toBeGreaterThan(0.1);
      expect(aRatio).toBeLessThan(0.3);
      expect(bRatio).toBeGreaterThan(0.05);
      expect(bRatio).toBeLessThan(0.15);
    });
  });

  describe('startGradualRollout', () => {
    it('throws error for invalid start percentage', () => {
      const flag: FeatureFlag = {
        id: 'flag-1',
        name: 'Test',
        description: '',
        enabled: false,
        percentage: 0,
        rules: [],
        createdAt: '2026-07-12T00:00:00Z',
        updatedAt: '2026-07-12T00:00:00Z',
        createdBy: 'user',
        tags: [],
      };

      registerFlag(flag);

      expect(() => startGradualRollout('flag-1', -1, 100)).toThrow();
      expect(() => startGradualRollout('flag-1', 101, 100)).toThrow();
    });

    it('throws error for invalid target percentage', () => {
      const flag: FeatureFlag = {
        id: 'flag-1',
        name: 'Test',
        description: '',
        enabled: false,
        percentage: 0,
        rules: [],
        createdAt: '2026-07-12T00:00:00Z',
        updatedAt: '2026-07-12T00:00:00Z',
        createdBy: 'user',
        tags: [],
      };

      registerFlag(flag);

      expect(() => startGradualRollout('flag-1', 10, -1)).toThrow();
      expect(() => startGradualRollout('flag-1', 10, 101)).toThrow();
    });

    it('enables flag and sets start percentage', () => {
      const flag: FeatureFlag = {
        id: 'flag-1',
        name: 'Test',
        description: '',
        enabled: false,
        percentage: 0,
        rules: [],
        createdAt: '2026-07-12T00:00:00Z',
        updatedAt: '2026-07-12T00:00:00Z',
        createdBy: 'user',
        tags: [],
      };

      registerFlag(flag);

      const result = startGradualRollout('flag-1', 10, 100);

      expect(result?.enabled).toBe(true);
      expect(result?.percentage).toBe(10);
    });

    it('adds target percentage tag', () => {
      const flag: FeatureFlag = {
        id: 'flag-1',
        name: 'Test',
        description: '',
        enabled: false,
        percentage: 0,
        rules: [],
        createdAt: '2026-07-12T00:00:00Z',
        updatedAt: '2026-07-12T00:00:00Z',
        createdBy: 'user',
        tags: [],
      };

      registerFlag(flag);

      const result = startGradualRollout('flag-1', 10, 75);

      expect(result?.tags).toContain('rollout-target-75%');
    });

    it('returns undefined for non-existent flag', () => {
      const result = startGradualRollout('nonexistent', 10, 100);
      expect(result).toBeUndefined();
    });
  });

  describe('incrementRollout', () => {
    it('increases percentage by increment amount', () => {
      const flag: FeatureFlag = {
        id: 'flag-1',
        name: 'Test',
        description: '',
        enabled: true,
        percentage: 10,
        rules: [],
        createdAt: '2026-07-12T00:00:00Z',
        updatedAt: '2026-07-12T00:00:00Z',
        createdBy: 'user',
        tags: [],
      };

      registerFlag(flag);

      const result = incrementRollout('flag-1', 20);

      expect(result?.percentage).toBe(30);
    });

    it('caps percentage at 100', () => {
      const flag: FeatureFlag = {
        id: 'flag-1',
        name: 'Test',
        description: '',
        enabled: true,
        percentage: 90,
        rules: [],
        createdAt: '2026-07-12T00:00:00Z',
        updatedAt: '2026-07-12T00:00:00Z',
        createdBy: 'user',
        tags: [],
      };

      registerFlag(flag);

      const result = incrementRollout('flag-1', 20);

      expect(result?.percentage).toBe(100);
    });

    it('returns undefined for non-existent flag', () => {
      const result = incrementRollout('nonexistent', 10);
      expect(result).toBeUndefined();
    });
  });

  describe('formatFlagStatus', () => {
    it('shows enabled status and percentage', () => {
      const flag: FeatureFlag = {
        id: 'flag-1',
        name: 'Test',
        description: '',
        enabled: true,
        percentage: 50,
        rules: [],
        createdAt: '2026-07-12T00:00:00Z',
        updatedAt: '2026-07-12T00:00:00Z',
        createdBy: 'user',
        tags: [],
      };

      const status = formatFlagStatus(flag);

      expect(status).toContain('✅');
      expect(status).toContain('50%');
    });

    it('shows disabled status', () => {
      const flag: FeatureFlag = {
        id: 'flag-1',
        name: 'Test',
        description: '',
        enabled: false,
        percentage: 0,
        rules: [],
        createdAt: '2026-07-12T00:00:00Z',
        updatedAt: '2026-07-12T00:00:00Z',
        createdBy: 'user',
        tags: [],
      };

      const status = formatFlagStatus(flag);

      expect(status).toContain('❌');
    });

    it('shows rule count', () => {
      const flag: FeatureFlag = {
        id: 'flag-1',
        name: 'Test',
        description: '',
        enabled: true,
        percentage: 0,
        rules: [
          { type: 'user', value: 'user-1', enabled: true },
          { type: 'email', value: 'test@example.com', enabled: true },
        ],
        createdAt: '2026-07-12T00:00:00Z',
        updatedAt: '2026-07-12T00:00:00Z',
        createdBy: 'user',
        tags: [],
      };

      const status = formatFlagStatus(flag);

      expect(status).toContain('2 rules');
    });
  });

  describe('getFlagStats', () => {
    it('returns undefined for non-existent flag', () => {
      const stats = getFlagStats('nonexistent');
      expect(stats).toBeUndefined();
    });

    it('returns comprehensive stats', () => {
      const flag: FeatureFlag = {
        id: 'flag-1',
        name: 'Test Feature',
        description: 'A test flag',
        enabled: true,
        percentage: 75,
        rules: [
          { type: 'user', value: 'user-1', enabled: true },
          { type: 'email', value: 'admin@example.com', enabled: true },
        ],
        variants: { variantA: 50, variantB: 50 },
        createdAt: '2026-07-12T00:00:00Z',
        updatedAt: '2026-07-12T00:00:00Z',
        createdBy: 'founder',
        tags: ['production', 'beta'],
      };

      registerFlag(flag);

      const stats = getFlagStats('flag-1');

      expect(stats?.flagName).toBe('Test Feature');
      expect(stats?.enabled).toBe(true);
      expect(stats?.percentage).toBe(75);
      expect(stats?.ruleCount).toBe(2);
      expect(stats?.variants).toEqual(['variantA', 'variantB']);
      expect(stats?.tags).toEqual(['production', 'beta']);
    });

    it('handles flag without variants', () => {
      const flag: FeatureFlag = {
        id: 'flag-1',
        name: 'Test',
        description: '',
        enabled: true,
        percentage: 50,
        rules: [],
        createdAt: '2026-07-12T00:00:00Z',
        updatedAt: '2026-07-12T00:00:00Z',
        createdBy: 'user',
        tags: [],
      };

      registerFlag(flag);

      const stats = getFlagStats('flag-1');

      expect(stats?.variants).toEqual([]);
    });
  });

  describe('Integration: Gradual Rollout Workflow', () => {
    it('simulates gradual rollout from 0% to 100%', () => {
      const flag: FeatureFlag = {
        id: 'new-feature',
        name: 'New Onboarding',
        description: 'New onboarding flow',
        enabled: false,
        percentage: 0,
        rules: [],
        createdAt: '2026-07-12T00:00:00Z',
        updatedAt: '2026-07-12T00:00:00Z',
        createdBy: 'founder',
        tags: [],
      };

      registerFlag(flag);

      startGradualRollout('new-feature', 10, 100);
      let stats = getFlagStats('new-feature')!;
      expect(stats.percentage).toBe(10);

      incrementRollout('new-feature', 15);
      stats = getFlagStats('new-feature')!;
      expect(stats.percentage).toBe(25);

      incrementRollout('new-feature', 25);
      stats = getFlagStats('new-feature')!;
      expect(stats.percentage).toBe(50);

      incrementRollout('new-feature', 50);
      stats = getFlagStats('new-feature')!;
      expect(stats.percentage).toBe(100);
    });
  });

  describe('Integration: Targeted Feature Launch', () => {
    it('enables feature for specific users during beta', () => {
      const flag: FeatureFlag = {
        id: 'beta-feature',
        name: 'Beta Program',
        description: 'Beta feature for selected users',
        enabled: true,
        percentage: 0,
        rules: [
          { type: 'user', value: 'beta-user-1', enabled: true },
          { type: 'user', value: 'beta-user-2', enabled: true },
          { type: 'tag', value: 'beta-tester', enabled: true },
        ],
        createdAt: '2026-07-12T00:00:00Z',
        updatedAt: '2026-07-12T00:00:00Z',
        createdBy: 'founder',
        tags: [],
      };

      registerFlag(flag);

      const betaUser1 = evaluateFlag('beta-feature', { userId: 'beta-user-1' });
      expect(betaUser1.enabled).toBe(true);

      const betaUser2 = evaluateFlag('beta-feature', { userId: 'beta-user-2' });
      expect(betaUser2.enabled).toBe(true);

      const taggedUser = evaluateFlag('beta-feature', {
        tags: ['beta-tester'],
      });
      expect(taggedUser.enabled).toBe(true);

      const regularUser = evaluateFlag('beta-feature', {
        userId: 'regular-user',
      });
      expect(regularUser.enabled).toBe(false);
    });
  });

  describe('Integration: A/B Testing Workflow', () => {
    it('runs A/B test with consistent variant assignment', () => {
      const flag: FeatureFlag = {
        id: 'checkout-ab-test',
        name: 'Checkout Redesign',
        description: 'Testing new checkout flow',
        enabled: true,
        percentage: 100,
        rules: [],
        variants: { currentCheckout: 50, newCheckout: 50 },
        createdAt: '2026-07-12T00:00:00Z',
        updatedAt: '2026-07-12T00:00:00Z',
        createdBy: 'founder',
        tags: ['experiment'],
      };

      registerFlag(flag);

      const results = new Map<string, number>();

      for (let i = 0; i < 1000; i++) {
        const variant = getVariant('checkout-ab-test', { userId: `user-${i}` });
        const v = variant.variant || 'unknown';
        results.set(v, (results.get(v) || 0) + 1);
      }

      expect(results.get('currentCheckout')).toBeGreaterThan(400);
      expect(results.get('currentCheckout')).toBeLessThan(600);
      expect(results.get('newCheckout')).toBeGreaterThan(400);
      expect(results.get('newCheckout')).toBeLessThan(600);
    });
  });
});
