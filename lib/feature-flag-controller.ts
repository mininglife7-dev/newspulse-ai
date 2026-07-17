/**
 * DNA-GOV-013: Feature Flag Controller
 *
 * Autonomously manage feature flags for A/B testing, gradual rollouts,
 * and safe feature launches. Enable controlled customer access to new features
 * without code deployment.
 *
 * Problem: Without feature flags, new features are all-or-nothing. Once deployed,
 * they're visible to all customers. A bug in a new feature affects everyone.
 * We need the ability to: enable for specific users, gradual percentage rollouts,
 * A/B test variants, and instant kill-switches for bugs.
 */

export type FlagTargetingRule =
  'percentage' | 'user' | 'company' | 'email' | 'tag' | 'all';

export interface FeatureFlag {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  // Percentage rollout: 0-100
  percentage: number;
  // Targeting rules for advanced control
  rules: Array<{
    type: FlagTargetingRule;
    value: string | number;
    enabled: boolean;
  }>;
  // Variants for A/B testing: { variantA: 50, variantB: 50 }
  variants?: Record<string, number>;
  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  tags: string[];
}

export interface FlagEvaluation {
  flagId: string;
  flagName: string;
  enabled: boolean;
  variant?: string;
  reason: string;
  evaluatedAt: string;
}

export interface FlagContext {
  userId?: string;
  userEmail?: string;
  companyId?: string;
  tags?: string[];
  // Custom attributes for targeting
  attributes?: Record<string, string | number | boolean>;
}

// In-memory flag store (would be persisted to database in production)
const flags = new Map<string, FeatureFlag>();

// Deterministic hash for consistent variant assignment
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * Register a feature flag
 */
export function registerFlag(flag: FeatureFlag): void {
  flags.set(flag.id, {
    ...flag,
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Get a flag definition
 */
export function getFlag(flagId: string): FeatureFlag | undefined {
  return flags.get(flagId);
}

/**
 * List all registered flags
 */
export function listFlags(): FeatureFlag[] {
  return Array.from(flags.values());
}

/**
 * Update a flag
 */
export function updateFlag(
  flagId: string,
  updates: Partial<FeatureFlag>
): FeatureFlag | undefined {
  const flag = flags.get(flagId);
  if (!flag) return undefined;

  const updated = {
    ...flag,
    ...updates,
    id: flag.id, // Never change the ID
    createdAt: flag.createdAt, // Never change creation time
    updatedAt: new Date().toISOString(),
  };

  flags.set(flagId, updated);
  return updated;
}

/**
 * Evaluate if a flag is enabled for a given context
 */
export function evaluateFlag(
  flagId: string,
  context: FlagContext
): FlagEvaluation {
  const flag = flags.get(flagId);
  const now = new Date().toISOString();

  if (!flag) {
    return {
      flagId,
      flagName: 'unknown',
      enabled: false,
      reason: 'Flag not found',
      evaluatedAt: now,
    };
  }

  // Flag must be globally enabled first
  if (!flag.enabled) {
    return {
      flagId,
      flagName: flag.name,
      enabled: false,
      reason: 'Flag is globally disabled',
      evaluatedAt: now,
    };
  }

  // Check explicit disabling rules
  for (const rule of flag.rules) {
    if (!rule.enabled) {
      // Rule is disabled, skip it
      continue;
    }

    switch (rule.type) {
      case 'all':
        return {
          flagId,
          flagName: flag.name,
          enabled: true,
          reason: 'Matched rule: all',
          evaluatedAt: now,
        };

      case 'percentage':
        // Use user ID for consistent percentage assignment
        if (context.userId) {
          const hash = hashCode(`${flag.id}:${context.userId}`);
          const userPercentile = (hash % 100) + 1;
          if (userPercentile <= flag.percentage) {
            return {
              flagId,
              flagName: flag.name,
              enabled: true,
              reason: `Matched percentage rule (${userPercentile}% <= ${flag.percentage}%)`,
              evaluatedAt: now,
            };
          }
        }
        break;

      case 'user':
        if (context.userId === rule.value) {
          return {
            flagId,
            flagName: flag.name,
            enabled: true,
            reason: `Matched user rule: ${rule.value}`,
            evaluatedAt: now,
          };
        }
        break;

      case 'email':
        if (context.userEmail === rule.value) {
          return {
            flagId,
            flagName: flag.name,
            enabled: true,
            reason: `Matched email rule: ${rule.value}`,
            evaluatedAt: now,
          };
        }
        break;

      case 'company':
        if (context.companyId === rule.value) {
          return {
            flagId,
            flagName: flag.name,
            enabled: true,
            reason: `Matched company rule: ${rule.value}`,
            evaluatedAt: now,
          };
        }
        break;

      case 'tag':
        if (context.tags?.includes(rule.value as string)) {
          return {
            flagId,
            flagName: flag.name,
            enabled: true,
            reason: `Matched tag rule: ${rule.value}`,
            evaluatedAt: now,
          };
        }
        break;
    }
  }

  // No rules matched, fall back to percentage rollout
  if (flag.percentage > 0 && context.userId) {
    const hash = hashCode(`${flag.id}:${context.userId}`);
    const userPercentile = (hash % 100) + 1;
    if (userPercentile <= flag.percentage) {
      return {
        flagId,
        flagName: flag.name,
        enabled: true,
        reason: `Fallback percentage rollout (${userPercentile}% <= ${flag.percentage}%)`,
        evaluatedAt: now,
      };
    }
  }

  return {
    flagId,
    flagName: flag.name,
    enabled: false,
    reason: 'No matching rules and not in percentage rollout',
    evaluatedAt: now,
  };
}

/**
 * Get variant for A/B testing
 */
export function getVariant(
  flagId: string,
  context: FlagContext
): FlagEvaluation & { variant?: string } {
  const evaluation = evaluateFlag(flagId, context);
  const flag = flags.get(flagId);

  if (!evaluation.enabled || !flag?.variants || !context.userId) {
    return evaluation;
  }

  // Deterministically assign variant based on user ID
  const variantNames = Object.keys(flag.variants);
  if (variantNames.length === 0) {
    return evaluation;
  }

  const hash = hashCode(`${flagId}:variant:${context.userId}`);
  let selectedVariant: string | undefined;
  let accumulator = 0;
  const userPercentile = (hash % 100) + 1;

  for (const [variant, percentage] of Object.entries(flag.variants)) {
    accumulator += percentage;
    if (userPercentile <= accumulator) {
      selectedVariant = variant;
      break;
    }
  }

  return {
    ...evaluation,
    variant: selectedVariant || variantNames[0],
    reason: `${evaluation.reason}; variant: ${selectedVariant}`,
  };
}

/**
 * Enable a flag for gradual rollout
 */
export function startGradualRollout(
  flagId: string,
  startPercentage: number,
  targetPercentage: number
): FeatureFlag | undefined {
  if (
    startPercentage < 0 ||
    startPercentage > 100 ||
    targetPercentage < 0 ||
    targetPercentage > 100
  ) {
    throw new Error('Percentages must be between 0 and 100');
  }

  return updateFlag(flagId, {
    enabled: true,
    percentage: startPercentage,
    tags: [
      ...(flags.get(flagId)?.tags || []),
      `rollout-target-${targetPercentage}%`,
    ],
  });
}

/**
 * Increment rollout percentage
 */
export function incrementRollout(
  flagId: string,
  increment: number
): FeatureFlag | undefined {
  const flag = flags.get(flagId);
  if (!flag) return undefined;

  const newPercentage = Math.min(100, flag.percentage + increment);
  return updateFlag(flagId, { percentage: newPercentage });
}

/**
 * Format flag for display
 */
export function formatFlagStatus(flag: FeatureFlag): string {
  const status = flag.enabled ? '✅ ENABLED' : '❌ DISABLED';
  const rollout = flag.percentage > 0 ? ` (${flag.percentage}% rollout)` : '';
  const ruleCount =
    flag.rules.length > 0 ? ` [${flag.rules.length} rules]` : '';

  return `${status}${rollout}${ruleCount}`;
}

/**
 * Get flag statistics
 */
export function getFlagStats(flagId: string):
  | {
      flagName: string;
      enabled: boolean;
      percentage: number;
      ruleCount: number;
      variants: string[];
      tags: string[];
    }
  | undefined {
  const flag = flags.get(flagId);
  if (!flag) return undefined;

  return {
    flagName: flag.name,
    enabled: flag.enabled,
    percentage: flag.percentage,
    ruleCount: flag.rules.length,
    variants: flag.variants ? Object.keys(flag.variants) : [],
    tags: flag.tags,
  };
}

/**
 * Reset flag store (testing/manual reset)
 */
export function resetFlagHub(): void {
  flags.clear();
}
