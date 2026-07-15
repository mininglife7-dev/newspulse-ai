/**
 * DNS-GOV-013: Feature Flag Controller
 *
 * Enables A/B testing and gradual feature rollouts without code deployment.
 * Supports boolean, percentage-based, and user-specific flag types.
 */

export type FlagType = 'boolean' | 'percentage' | 'user_list'

export interface FeatureFlag {
  name: string
  type: FlagType
  enabled: boolean
  percentage?: number // 0-100 for gradual rollout
  allowedUsers?: string[] // Whitelist for user_list type
  blockedUsers?: string[] // Blacklist
  description?: string
  createdAt: string
  updatedAt: string
}

export interface FlagEvaluationContext {
  userId?: string
  userSegment?: string
  timestamp?: number
  sessionId?: string
}

/**
 * Feature Flag Store - In-memory implementation with Supabase persistence path defined
 */
export class FeatureFlagStore {
  private flags: Map<string, FeatureFlag> = new Map()

  constructor(initialFlags?: FeatureFlag[]) {
    if (initialFlags) {
      for (const flag of initialFlags) {
        this.flags.set(flag.name, flag)
      }
    }
  }

  /**
   * Create or update a feature flag
   */
  createFlag(flag: FeatureFlag): FeatureFlag {
    const now = new Date().toISOString()
    const storedFlag: FeatureFlag = {
      ...flag,
      createdAt: flag.createdAt || now,
      updatedAt: now,
    }
    this.flags.set(flag.name, storedFlag)
    return storedFlag
  }

  /**
   * Get a specific flag
   */
  getFlag(name: string): FeatureFlag | undefined {
    return this.flags.get(name)
  }

  /**
   * List all flags
   */
  getAllFlags(): FeatureFlag[] {
    return Array.from(this.flags.values())
  }

  /**
   * Enable a flag (set to 100% rollout)
   */
  enableFlag(name: string): FeatureFlag | undefined {
    const flag = this.flags.get(name)
    if (!flag) return undefined

    const updated: FeatureFlag = {
      ...flag,
      enabled: true,
      percentage: 100,
      updatedAt: new Date().toISOString(),
    }
    this.flags.set(name, updated)
    return updated
  }

  /**
   * Disable a flag
   */
  disableFlag(name: string): FeatureFlag | undefined {
    const flag = this.flags.get(name)
    if (!flag) return undefined

    const updated: FeatureFlag = {
      ...flag,
      enabled: false,
      percentage: 0,
      updatedAt: new Date().toISOString(),
    }
    this.flags.set(name, updated)
    return updated
  }

  /**
   * Set rollout percentage (0-100)
   */
  setRolloutPercentage(name: string, percentage: number): FeatureFlag | undefined {
    if (percentage < 0 || percentage > 100) {
      throw new Error('Percentage must be between 0 and 100')
    }

    const flag = this.flags.get(name)
    if (!flag) return undefined

    const updated: FeatureFlag = {
      ...flag,
      percentage,
      enabled: percentage > 0,
      updatedAt: new Date().toISOString(),
    }
    this.flags.set(name, updated)
    return updated
  }

  /**
   * Add user to allowlist
   */
  allowUser(flagName: string, userId: string): FeatureFlag | undefined {
    const flag = this.flags.get(flagName)
    if (!flag) return undefined

    const allowedUsers = flag.allowedUsers || []
    if (!allowedUsers.includes(userId)) {
      allowedUsers.push(userId)
    }

    const updated: FeatureFlag = {
      ...flag,
      allowedUsers,
      updatedAt: new Date().toISOString(),
    }
    this.flags.set(flagName, updated)
    return updated
  }

  /**
   * Add user to blocklist
   */
  blockUser(flagName: string, userId: string): FeatureFlag | undefined {
    const flag = this.flags.get(flagName)
    if (!flag) return undefined

    const blockedUsers = flag.blockedUsers || []
    if (!blockedUsers.includes(userId)) {
      blockedUsers.push(userId)
    }

    const updated: FeatureFlag = {
      ...flag,
      blockedUsers,
      updatedAt: new Date().toISOString(),
    }
    this.flags.set(flagName, updated)
    return updated
  }

  /**
   * Delete a flag
   */
  deleteFlag(name: string): boolean {
    return this.flags.delete(name)
  }

  /**
   * Clear all flags
   */
  clear(): void {
    this.flags.clear()
  }
}

/**
 * Feature Flag Evaluator - Determines if a flag is enabled for a given context
 */
export class FeatureFlagEvaluator {
  constructor(private store: FeatureFlagStore) {}

  /**
   * Evaluate if a feature is enabled for the given context
   */
  isEnabled(flagName: string, context: FlagEvaluationContext = {}): boolean {
    const flag = this.store.getFlag(flagName)
    if (!flag || !flag.enabled) {
      return false
    }

    // Check blocklist first (highest priority)
    if (flag.blockedUsers && context.userId && flag.blockedUsers.includes(context.userId)) {
      return false
    }

    // Check allowlist (whitelist takes precedence)
    if (flag.allowedUsers && flag.allowedUsers.length > 0) {
      return context.userId ? flag.allowedUsers.includes(context.userId) : false
    }

    // For boolean flags, if enabled then enabled
    if (flag.type === 'boolean') {
      return true
    }

    // For percentage-based rollout
    if (flag.type === 'percentage' && flag.percentage !== undefined) {
      if (flag.percentage === 100) return true
      if (flag.percentage === 0) return false

      // Consistent rollout based on userId hash
      if (!context.userId) {
        return Math.random() * 100 < flag.percentage
      }

      // Deterministic: same user always gets same result
      const hash = this.hashUserId(context.userId)
      return hash < flag.percentage
    }

    // For user_list flags (already checked allowlist above)
    if (flag.type === 'user_list') {
      return false
    }

    return false
  }

  /**
   * Get all enabled flags for a context
   */
  getEnabledFlags(context: FlagEvaluationContext = {}): string[] {
    return this.store
      .getAllFlags()
      .filter((flag) => this.isEnabled(flag.name, context))
      .map((flag) => flag.name)
  }

  /**
   * Hash userId to percentage (0-100) for consistent rollouts
   * Uses simple modulo-based hash to spread users evenly
   */
  private hashUserId(userId: string): number {
    let hash = 0
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash // Convert to 32bit integer
    }
    return Math.abs(hash) % 100
  }
}

/**
 * Global singleton instance
 */
let globalStore: FeatureFlagStore | null = null
let globalEvaluator: FeatureFlagEvaluator | null = null

export function getGlobalStore(): FeatureFlagStore {
  if (!globalStore) {
    globalStore = new FeatureFlagStore()
  }
  return globalStore
}

export function getGlobalEvaluator(): FeatureFlagEvaluator {
  if (!globalEvaluator) {
    globalEvaluator = new FeatureFlagEvaluator(getGlobalStore())
  }
  return globalEvaluator
}

/**
 * Helper: Check if feature is enabled (convenience function)
 */
export function isFeatureEnabled(flagName: string, context: FlagEvaluationContext = {}): boolean {
  return getGlobalEvaluator().isEnabled(flagName, context)
}

/**
 * Helper: Get all enabled features for a user
 */
export function getEnabledFeatures(context: FlagEvaluationContext = {}): string[] {
  return getGlobalEvaluator().getEnabledFlags(context)
}
