/**
 * Feature Flags — Gradual Rollout and A/B Testing
 *
 * Enable Phase 3 features progressively to reduce deployment risk.
 * Supports: rollout percentages, user targeting, workspace targeting, gradual ramping.
 *
 * Usage:
 * - Phase 3 audit logging: Gradually enable to 10% → 50% → 100% of users
 * - New dashboard: A/B test with control group
 * - Backend optimization: Feature-flag risky code paths
 */

export type FeatureFlagVariant = 'control' | 'treatment' | 'disabled';

export interface FeatureFlagDefinition {
  name: string;
  description: string;
  enabled: boolean;
  rolloutPercentage: number; // 0-100
  targetUsers?: string[]; // Specific user IDs to enable for
  targetWorkspaces?: string[]; // Specific workspace IDs to enable for
  variantGroups?: Record<string, number>; // A/B test groups with percentages
  createdAt: string;
  updatedAt: string;
}

export interface EvaluationContext {
  userId?: string;
  workspaceId?: string;
  ip?: string;
  email?: string;
  randomSeed?: number;
}

// In-memory feature flag store
const flags = new Map<string, FeatureFlagDefinition>();

// Pre-defined feature flags for Phase 3
export const PHASE_3_FLAGS = {
  AUDIT_LOGGING: 'phase-3-audit-logging',
  ADVANCED_ANALYTICS: 'phase-3-advanced-analytics',
  TEMPLATE_ITERATION: 'phase-3-template-iteration',
  EVIDENCE_LINKING: 'phase-3-evidence-linking',
  NEW_DASHBOARD_UI: 'feature-new-dashboard-ui',
  PERFORMANCE_OPTIMIZATION: 'feature-perf-optimization',
} as const;

/**
 * Initialize feature flags
 */
export function initializeFlags(definitions: FeatureFlagDefinition[]): void {
  flags.clear();
  for (const def of definitions) {
    flags.set(def.name, def);
  }
}

/**
 * Set or update a feature flag
 */
export function setFlag(definition: FeatureFlagDefinition): void {
  flags.set(definition.name, {
    ...definition,
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Evaluate if a feature is enabled for a context
 */
export function isFeatureEnabled(
  flagName: string,
  context?: EvaluationContext
): boolean {
  const flag = flags.get(flagName);
  if (!flag || !flag.enabled) {
    return false;
  }

  // Check explicit targeting
  if (context?.userId && flag.targetUsers?.includes(context.userId)) {
    return true;
  }

  if (context?.workspaceId && flag.targetWorkspaces?.includes(context.workspaceId)) {
    return true;
  }

  // Check rollout percentage
  if (flag.rolloutPercentage === 0) {
    return false;
  }

  if (flag.rolloutPercentage >= 100) {
    return true;
  }

  // Consistent hashing for stable rollout
  const hash = hashForConsistency(context?.userId || context?.ip || 'unknown', flagName);
  return (hash % 100) < flag.rolloutPercentage;
}

/**
 * Get A/B test variant for user
 */
export function getVariant(
  flagName: string,
  context?: EvaluationContext
): FeatureFlagVariant {
  const flag = flags.get(flagName);
  if (!flag || !flag.enabled) {
    return 'disabled';
  }

  if (!flag.variantGroups) {
    return isFeatureEnabled(flagName, context) ? 'treatment' : 'control';
  }

  const hash = hashForConsistency(context?.userId || context?.ip || 'unknown', flagName);
  let accumulated = 0;

  for (const [variant, percentage] of Object.entries(flag.variantGroups)) {
    accumulated += percentage;
    if ((hash % 100) < accumulated) {
      return (variant as FeatureFlagVariant) || 'control';
    }
  }

  return 'control';
}

/**
 * Consistent hashing for stable rollout decisions
 */
function hashForConsistency(seed: string, salt: string): number {
  const combined = `${seed}:${salt}`;
  let hash = 0;

  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  return Math.abs(hash);
}

/**
 * Get all flags
 */
export function getAllFlags(): FeatureFlagDefinition[] {
  return Array.from(flags.values());
}

/**
 * Get flag by name
 */
export function getFlag(name: string): FeatureFlagDefinition | undefined {
  return flags.get(name);
}

/**
 * Delete flag
 */
export function deleteFlag(name: string): boolean {
  return flags.delete(name);
}

/**
 * Get evaluation metrics for a flag
 */
export function getFlagMetrics(
  flagName: string
): {
  enabled: boolean;
  rolloutPercentage: number;
  estimatedAffectedUsers: string;
  variants: string[];
} {
  const flag = flags.get(flagName);
  if (!flag) {
    return {
      enabled: false,
      rolloutPercentage: 0,
      estimatedAffectedUsers: '0%',
      variants: [],
    };
  }

  return {
    enabled: flag.enabled,
    rolloutPercentage: flag.rolloutPercentage,
    estimatedAffectedUsers: `${flag.rolloutPercentage}%`,
    variants: flag.variantGroups ? Object.keys(flag.variantGroups) : ['control', 'treatment'],
  };
}

/**
 * Rollout helpers for phased deployments
 */
export const rolloutStrategies = {
  // 10% → 50% → 100% over 3 stages
  phased: (stage: 1 | 2 | 3) => {
    const percentages = { 1: 10, 2: 50, 3: 100 };
    return percentages[stage];
  },

  // Canary: 5% → 25% → 100%
  canary: (stage: 1 | 2 | 3) => {
    const percentages = { 1: 5, 2: 25, 3: 100 };
    return percentages[stage];
  },

  // Blue-green: 50/50 split
  blueGreen: () => ({ control: 50, treatment: 50 }),

  // Early adopters: specific users only
  earlyAdopters: (userIds: string[]) => ({ targetUsers: userIds }),
};

/**
 * Clear all flags (testing only)
 */
export function __clearFlags() {
  flags.clear();
}
