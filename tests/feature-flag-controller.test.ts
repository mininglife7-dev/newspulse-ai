import { describe, it, expect, beforeEach } from 'vitest'
import {
  FeatureFlagStore,
  FeatureFlagEvaluator,
  FeatureFlag,
  isFeatureEnabled,
  getEnabledFeatures,
  getGlobalStore,
  getGlobalEvaluator,
} from '@/lib/feature-flag-controller'

describe('DNS-GOV-013: Feature Flag Controller', () => {
  let store: FeatureFlagStore
  let evaluator: FeatureFlagEvaluator

  beforeEach(() => {
    store = new FeatureFlagStore()
    evaluator = new FeatureFlagEvaluator(store)
  })

  describe('FeatureFlagStore', () => {
    it('should create a feature flag', () => {
      const flag: FeatureFlag = {
        name: 'new_dashboard',
        type: 'boolean',
        enabled: true,
        description: 'New dashboard UI',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      const created = store.createFlag(flag)
      expect(created.name).toBe('new_dashboard')
      expect(created.enabled).toBe(true)
      expect(created.updatedAt).toBeDefined()
    })

    it('should retrieve a flag by name', () => {
      const flag: FeatureFlag = {
        name: 'test_flag',
        type: 'boolean',
        enabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      store.createFlag(flag)

      const retrieved = store.getFlag('test_flag')
      expect(retrieved).toBeDefined()
      expect(retrieved?.name).toBe('test_flag')
    })

    it('should return undefined for non-existent flag', () => {
      const retrieved = store.getFlag('nonexistent')
      expect(retrieved).toBeUndefined()
    })

    it('should list all flags', () => {
      store.createFlag({
        name: 'flag1',
        type: 'boolean',
        enabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      store.createFlag({
        name: 'flag2',
        type: 'percentage',
        enabled: true,
        percentage: 50,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })

      const all = store.getAllFlags()
      expect(all.length).toBe(2)
      expect(all.map((f) => f.name)).toContain('flag1')
      expect(all.map((f) => f.name)).toContain('flag2')
    })

    it('should enable a flag (set to 100%)', () => {
      store.createFlag({
        name: 'test',
        type: 'percentage',
        enabled: false,
        percentage: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })

      const enabled = store.enableFlag('test')
      expect(enabled?.enabled).toBe(true)
      expect(enabled?.percentage).toBe(100)
    })

    it('should disable a flag', () => {
      store.createFlag({
        name: 'test',
        type: 'boolean',
        enabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })

      const disabled = store.disableFlag('test')
      expect(disabled?.enabled).toBe(false)
    })

    it('should set rollout percentage', () => {
      store.createFlag({
        name: 'test',
        type: 'percentage',
        enabled: false,
        percentage: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })

      const updated = store.setRolloutPercentage('test', 25)
      expect(updated?.percentage).toBe(25)
      expect(updated?.enabled).toBe(true)
    })

    it('should reject invalid percentage values', () => {
      store.createFlag({
        name: 'test',
        type: 'percentage',
        enabled: false,
        percentage: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })

      expect(() => store.setRolloutPercentage('test', 101)).toThrow()
      expect(() => store.setRolloutPercentage('test', -1)).toThrow()
    })

    it('should add user to allowlist', () => {
      store.createFlag({
        name: 'test',
        type: 'user_list',
        enabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })

      const updated = store.allowUser('test', 'user123')
      expect(updated?.allowedUsers).toContain('user123')
    })

    it('should not add duplicate users to allowlist', () => {
      store.createFlag({
        name: 'test',
        type: 'user_list',
        enabled: true,
        allowedUsers: ['user123'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })

      store.allowUser('test', 'user123')
      const flag = store.getFlag('test')
      expect(flag?.allowedUsers?.filter((u) => u === 'user123').length).toBe(1)
    })

    it('should add user to blocklist', () => {
      store.createFlag({
        name: 'test',
        type: 'boolean',
        enabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })

      const updated = store.blockUser('test', 'user456')
      expect(updated?.blockedUsers).toContain('user456')
    })

    it('should delete a flag', () => {
      store.createFlag({
        name: 'test',
        type: 'boolean',
        enabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })

      const deleted = store.deleteFlag('test')
      expect(deleted).toBe(true)
      expect(store.getFlag('test')).toBeUndefined()
    })

    it('should clear all flags', () => {
      store.createFlag({
        name: 'flag1',
        type: 'boolean',
        enabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      store.createFlag({
        name: 'flag2',
        type: 'boolean',
        enabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })

      store.clear()
      expect(store.getAllFlags().length).toBe(0)
    })
  })

  describe('FeatureFlagEvaluator', () => {
    it('should return false for disabled flag', () => {
      store.createFlag({
        name: 'disabled',
        type: 'boolean',
        enabled: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })

      expect(evaluator.isEnabled('disabled')).toBe(false)
    })

    it('should return true for enabled boolean flag', () => {
      store.createFlag({
        name: 'enabled',
        type: 'boolean',
        enabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })

      expect(evaluator.isEnabled('enabled')).toBe(true)
    })

    it('should evaluate percentage-based rollout (0%)', () => {
      store.createFlag({
        name: 'rollout_0',
        type: 'percentage',
        enabled: true,
        percentage: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })

      expect(evaluator.isEnabled('rollout_0', { userId: 'user123' })).toBe(false)
    })

    it('should evaluate percentage-based rollout (100%)', () => {
      store.createFlag({
        name: 'rollout_100',
        type: 'percentage',
        enabled: true,
        percentage: 100,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })

      expect(evaluator.isEnabled('rollout_100', { userId: 'user123' })).toBe(true)
    })

    it('should provide consistent rollout for same user', () => {
      store.createFlag({
        name: 'rollout_50',
        type: 'percentage',
        enabled: true,
        percentage: 50,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })

      const result1 = evaluator.isEnabled('rollout_50', { userId: 'consistent_user' })
      const result2 = evaluator.isEnabled('rollout_50', { userId: 'consistent_user' })

      expect(result1).toBe(result2)
    })

    it('should respect allowlist (whitelist)', () => {
      store.createFlag({
        name: 'whitelist',
        type: 'user_list',
        enabled: true,
        allowedUsers: ['user1', 'user2'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })

      expect(evaluator.isEnabled('whitelist', { userId: 'user1' })).toBe(true)
      expect(evaluator.isEnabled('whitelist', { userId: 'user3' })).toBe(false)
    })

    it('should respect blocklist (takes precedence over percentage)', () => {
      store.createFlag({
        name: 'blocked',
        type: 'percentage',
        enabled: true,
        percentage: 100,
        blockedUsers: ['blocked_user'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })

      expect(evaluator.isEnabled('blocked', { userId: 'blocked_user' })).toBe(false)
      expect(evaluator.isEnabled('blocked', { userId: 'other_user' })).toBe(true)
    })

    it('should return empty list for non-existent flag', () => {
      expect(evaluator.isEnabled('nonexistent')).toBe(false)
    })

    it('should get all enabled flags for context', () => {
      store.createFlag({
        name: 'flag1',
        type: 'boolean',
        enabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      store.createFlag({
        name: 'flag2',
        type: 'boolean',
        enabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      store.createFlag({
        name: 'flag3',
        type: 'boolean',
        enabled: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })

      const enabled = evaluator.getEnabledFlags()
      expect(enabled.length).toBe(2)
      expect(enabled).toContain('flag1')
      expect(enabled).toContain('flag2')
      expect(enabled).not.toContain('flag3')
    })
  })

  describe('Global singleton', () => {
    it('should provide global store instance', () => {
      const store1 = getGlobalStore()
      const store2 = getGlobalStore()
      expect(store1).toBe(store2)
    })

    it('should provide global evaluator instance', () => {
      const eval1 = getGlobalEvaluator()
      const eval2 = getGlobalEvaluator()
      expect(eval1).toBe(eval2)
    })

    it('should evaluate via global helper function', () => {
      const globalStore = getGlobalStore()
      globalStore.createFlag({
        name: 'global_flag',
        type: 'boolean',
        enabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })

      expect(isFeatureEnabled('global_flag')).toBe(true)
    })

    it('should get enabled features via global helper', () => {
      const globalStore = getGlobalStore()
      globalStore.clear()
      globalStore.createFlag({
        name: 'enabled1',
        type: 'boolean',
        enabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })

      const enabled = getEnabledFeatures()
      expect(enabled).toContain('enabled1')
    })
  })
})
