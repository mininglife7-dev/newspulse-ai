import { describe, it, expect, beforeEach } from 'vitest';
import {
  isFeatureEnabled,
  getVariant,
  setFlag,
  getAllFlags,
  getFlag,
  deleteFlag,
  initializeFlags,
  getFlagMetrics,
  rolloutStrategies,
  PHASE_3_FLAGS,
  __clearFlags,
} from '@/lib/feature-flags';

describe('feature-flags', () => {
  beforeEach(() => {
    __clearFlags();
  });

  it('returns false for disabled/nonexistent flags', () => {
    expect(isFeatureEnabled('nonexistent')).toBe(false);
    expect(isFeatureEnabled(PHASE_3_FLAGS.AUDIT_LOGGING)).toBe(false);
  });

  it('enables flags when set to 100%', () => {
    setFlag({
      name: PHASE_3_FLAGS.AUDIT_LOGGING,
      description: 'Enable audit logging',
      enabled: true,
      rolloutPercentage: 100,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    expect(isFeatureEnabled(PHASE_3_FLAGS.AUDIT_LOGGING)).toBe(true);
  });

  it('respects rollout percentage for consistent hashing', () => {
    setFlag({
      name: 'test-rollout',
      description: 'Test rollout',
      enabled: true,
      rolloutPercentage: 10, // Only 10% of users
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Generate many unique users and verify approximately 10% are enabled
    let enabledCount = 0;
    for (let i = 0; i < 1000; i++) {
      if (
        isFeatureEnabled('test-rollout', {
          userId: `user-${i}`,
        })
      ) {
        enabledCount++;
      }
    }

    // Expect roughly 10%, with some tolerance for randomness (8-12%)
    const percentage = enabledCount / 10; // Convert to percentage
    expect(percentage).toBeGreaterThanOrEqual(8);
    expect(percentage).toBeLessThanOrEqual(12);
  });

  it('enables flag for explicitly targeted users', () => {
    setFlag({
      name: 'test-targeted',
      description: 'Targeted rollout',
      enabled: true,
      rolloutPercentage: 0, // 0% general rollout
      targetUsers: ['user-123', 'user-456'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    expect(
      isFeatureEnabled('test-targeted', { userId: 'user-123' })
    ).toBe(true);
    expect(
      isFeatureEnabled('test-targeted', { userId: 'user-999' })
    ).toBe(false);
  });

  it('enables flag for explicitly targeted workspaces', () => {
    setFlag({
      name: 'test-workspace',
      description: 'Workspace-targeted flag',
      enabled: true,
      rolloutPercentage: 0,
      targetWorkspaces: ['ws-alpha', 'ws-beta'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    expect(
      isFeatureEnabled('test-workspace', { workspaceId: 'ws-alpha' })
    ).toBe(true);
    expect(
      isFeatureEnabled('test-workspace', { workspaceId: 'ws-gamma' })
    ).toBe(false);
  });

  it('returns control variant by default', () => {
    setFlag({
      name: 'test-ab',
      description: 'A/B test',
      enabled: true,
      rolloutPercentage: 100,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Without variantGroups, should return treatment or control
    const variant = getVariant('test-ab', { userId: 'user-123' });
    expect(['control', 'treatment']).toContain(variant);
  });

  it('distributes A/B test variants correctly', () => {
    setFlag({
      name: 'test-variants',
      description: 'A/B test variants',
      enabled: true,
      rolloutPercentage: 100,
      variantGroups: {
        control: 50,
        treatment: 50,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const controlCount = Array.from({ length: 1000 }, (_, i) => i)
      .filter((i) => getVariant('test-variants', { userId: `user-${i}` }) === 'control').length;

    // Expect roughly 50%, with tolerance for randomness
    const percentage = controlCount / 10;
    expect(percentage).toBeGreaterThanOrEqual(45);
    expect(percentage).toBeLessThanOrEqual(55);
  });

  it('stores and retrieves flags', () => {
    const flag = {
      name: 'test-flag',
      description: 'Test flag',
      enabled: true,
      rolloutPercentage: 50,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setFlag(flag);

    const retrieved = getFlag('test-flag');
    expect(retrieved?.name).toBe('test-flag');
    expect(retrieved?.rolloutPercentage).toBe(50);
  });

  it('deletes flags', () => {
    setFlag({
      name: 'to-delete',
      description: 'Delete me',
      enabled: true,
      rolloutPercentage: 100,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    expect(getFlag('to-delete')).toBeDefined();
    const deleted = deleteFlag('to-delete');
    expect(deleted).toBe(true);
    expect(getFlag('to-delete')).toBeUndefined();
  });

  it('initializes bulk flags', () => {
    const flags = [
      {
        name: 'flag-1',
        description: 'First',
        enabled: true,
        rolloutPercentage: 100,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        name: 'flag-2',
        description: 'Second',
        enabled: false,
        rolloutPercentage: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    initializeFlags(flags);

    expect(getAllFlags().length).toBe(2);
    expect(getFlag('flag-1')?.enabled).toBe(true);
    expect(getFlag('flag-2')?.enabled).toBe(false);
  });

  it('gets flag metrics', () => {
    setFlag({
      name: 'metric-test',
      description: 'Metrics test',
      enabled: true,
      rolloutPercentage: 25,
      variantGroups: {
        control: 50,
        treatment: 50,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const metrics = getFlagMetrics('metric-test');
    expect(metrics.enabled).toBe(true);
    expect(metrics.rolloutPercentage).toBe(25);
    expect(metrics.estimatedAffectedUsers).toBe('25%');
    expect(metrics.variants).toContain('control');
    expect(metrics.variants).toContain('treatment');
  });

  it('supports phased rollout strategy (10→50→100%)', () => {
    expect(rolloutStrategies.phased(1)).toBe(10);
    expect(rolloutStrategies.phased(2)).toBe(50);
    expect(rolloutStrategies.phased(3)).toBe(100);
  });

  it('supports canary rollout strategy (5→25→100%)', () => {
    expect(rolloutStrategies.canary(1)).toBe(5);
    expect(rolloutStrategies.canary(2)).toBe(25);
    expect(rolloutStrategies.canary(3)).toBe(100);
  });

  it('supports blue-green A/B split (50/50)', () => {
    const blueGreen = rolloutStrategies.blueGreen();
    expect(blueGreen).toEqual({ control: 50, treatment: 50 });
  });

  it('supports early adopter targeting', () => {
    const strategy = rolloutStrategies.earlyAdopters(['user-1', 'user-2']);
    expect(strategy.targetUsers).toEqual(['user-1', 'user-2']);
  });

  it('stable hashing produces same result for same user', () => {
    setFlag({
      name: 'stability-test',
      description: 'Stable hashing',
      enabled: true,
      rolloutPercentage: 50,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const context = { userId: 'stable-user' };
    const result1 = isFeatureEnabled('stability-test', context);
    const result2 = isFeatureEnabled('stability-test', context);

    expect(result1).toBe(result2);
  });

  it('disabled flag always returns false regardless of percentage', () => {
    setFlag({
      name: 'disabled-flag',
      description: 'Disabled',
      enabled: false,
      rolloutPercentage: 100,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    expect(
      isFeatureEnabled('disabled-flag', { userId: 'any-user' })
    ).toBe(false);
  });
});
