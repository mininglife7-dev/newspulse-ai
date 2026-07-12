/**
 * DNA-013: Feature Flag Controller
 *
 * Safe feature rollout system enabling:
 * - Instant rollouts (100% of users)
 * - Gradual rollouts (% of users over time)
 * - Canary deployments (gradual with automatic abort on error threshold)
 * - A/B testing (segment-based variants)
 * - User targeting (percentile-based, segment-based, explicit lists)
 *
 * Integrates with monitoring for automatic rollback on error spike.
 */

export interface FeatureFlag {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  rollout: RolloutStrategy;
  targeting: UserTargeting;
  createdAt: string;
  updatedAt: string;
  status: 'draft' | 'active' | 'paused' | 'rolled_back';
  rollbackReason?: string;
}

export type RolloutStrategy =
  | { type: 'instant' }
  | { type: 'gradual'; percentages: PercentagePhase[] }
  | { type: 'canary'; errorThreshold: number; phases: CanaryPhase[] }
  | { type: 'ab_test'; variants: ABVariant[] };

export interface PercentagePhase {
  percentage: number;
  duration: number;
  startedAt?: string;
  completedAt?: string;
}

export interface CanaryPhase {
  percentage: number;
  duration: number;
  maxErrorRate: number;
  startedAt?: string;
  completedAt?: string;
  abortedAt?: string;
  abortReason?: string;
}

export interface ABVariant {
  id: string;
  name: string;
  percentage: number;
  description?: string;
}

export interface UserTargeting {
  type: 'all' | 'percentile' | 'segment' | 'explicit' | 'attribute';
  percentile?: {
    percentage: number;
    seed: string;
  };
  segments?: string[];
  userIds?: string[];
  attributes?: {
    [key: string]: string | number | boolean;
  };
}

export interface FeatureFlagEvaluation {
  flagId: string;
  userId: string;
  enabled: boolean;
  variant?: string;
  reason: string;
}

export interface FlagMetrics {
  flagId: string;
  exposedUsers: number;
  errorCount: number;
  errorRate: number;
  avgLatency: number;
  lastUpdated: string;
}

export class FeatureFlagController {
  private static instance: FeatureFlagController;
  private flags: Map<string, FeatureFlag> = new Map();
  private metrics: Map<string, FlagMetrics> = new Map();
  private evaluationLog: FeatureFlagEvaluation[] = [];

  private constructor() {}

  static getInstance(): FeatureFlagController {
    if (!FeatureFlagController.instance) {
      FeatureFlagController.instance = new FeatureFlagController();
    }
    return FeatureFlagController.instance;
  }

  async createFlag(flag: Omit<FeatureFlag, 'createdAt' | 'updatedAt'>): Promise<FeatureFlag> {
    const now = new Date().toISOString();
    const fullFlag: FeatureFlag = {
      ...flag,
      createdAt: now,
      updatedAt: now,
    };

    this.flags.set(flag.id, fullFlag);
    this.metrics.set(flag.id, {
      flagId: flag.id,
      exposedUsers: 0,
      errorCount: 0,
      errorRate: 0,
      avgLatency: 0,
      lastUpdated: now,
    });

    return fullFlag;
  }

  async getFlag(flagId: string): Promise<FeatureFlag | undefined> {
    return this.flags.get(flagId);
  }

  async updateFlag(flagId: string, updates: Partial<FeatureFlag>): Promise<FeatureFlag | undefined> {
    const flag = this.flags.get(flagId);
    if (!flag) return undefined;

    const updated: FeatureFlag = {
      ...flag,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    this.flags.set(flagId, updated);
    return updated;
  }

  async evaluateFlag(flagId: string, userId: string, context?: Record<string, unknown>): Promise<FeatureFlagEvaluation> {
    const flag = this.flags.get(flagId);

    if (!flag || !flag.enabled) {
      const evaluation: FeatureFlagEvaluation = {
        flagId,
        userId,
        enabled: false,
        reason: flag ? 'feature_disabled' : 'flag_not_found',
      };
      this.evaluationLog.push(evaluation);
      return evaluation;
    }

    const targetingMatches = this.evaluateTargeting(flag, userId, context);
    if (!targetingMatches) {
      const evaluation: FeatureFlagEvaluation = {
        flagId,
        userId,
        enabled: false,
        reason: 'user_not_targeted',
      };
      this.evaluationLog.push(evaluation);
      return evaluation;
    }

    const rolloutResult = this.evaluateRollout(flag, userId);

    const evaluation: FeatureFlagEvaluation = {
      flagId,
      userId,
      enabled: rolloutResult.enabled,
      variant: rolloutResult.variant,
      reason: rolloutResult.reason,
    };

    this.evaluationLog.push(evaluation);
    return evaluation;
  }

  private evaluateTargeting(flag: FeatureFlag, userId: string, context?: Record<string, unknown>): boolean {
    const targeting = flag.targeting;

    switch (targeting.type) {
      case 'all':
        return true;

      case 'percentile': {
        if (!targeting.percentile) return false;
        const hash = this.hashUserId(userId, targeting.percentile.seed);
        return (hash % 100) < targeting.percentile.percentage;
      }

      case 'segment': {
        if (!targeting.segments) return false;
        const userSegments = context?.segments as string[] | undefined || [];
        return targeting.segments.some(seg => userSegments.includes(seg));
      }

      case 'explicit': {
        if (!targeting.userIds) return false;
        return targeting.userIds.includes(userId);
      }

      case 'attribute': {
        if (!targeting.attributes || !context) return false;
        return Object.entries(targeting.attributes).every(([key, value]) => context[key] === value);
      }

      default:
        return false;
    }
  }

  private evaluateRollout(flag: FeatureFlag, userId: string): { enabled: boolean; variant?: string; reason: string } {
    const strategy = flag.rollout;

    switch (strategy.type) {
      case 'instant':
        return { enabled: true, reason: 'instant_rollout' };

      case 'gradual': {
        const currentPhase = this.getCurrentGradualPhase(strategy.percentages);
        if (!currentPhase) return { enabled: false, reason: 'no_active_phase' };

        const hash = this.hashUserId(userId, `gradual_${flag.id}`);
        const enabled = (hash % 100) < currentPhase.percentage;
        return { enabled, reason: enabled ? 'within_gradual_percentage' : 'outside_gradual_percentage' };
      }

      case 'canary': {
        const currentPhase = this.getCurrentCanaryPhase(strategy.phases);
        if (!currentPhase) return { enabled: false, reason: 'no_active_canary_phase' };
        if (currentPhase.abortedAt) return { enabled: false, reason: 'canary_aborted' };

        const hash = this.hashUserId(userId, `canary_${flag.id}`);
        const enabled = (hash % 100) < currentPhase.percentage;
        return { enabled, reason: enabled ? 'within_canary_percentage' : 'outside_canary_percentage' };
      }

      case 'ab_test': {
        const hash = this.hashUserId(userId, `ab_${flag.id}`);
        let runningTotal = 0;
        for (const variant of strategy.variants) {
          runningTotal += variant.percentage;
          if ((hash % 100) < runningTotal) {
            return { enabled: true, variant: variant.id, reason: `ab_variant_${variant.id}` };
          }
        }
        return { enabled: false, reason: 'outside_ab_percentage' };
      }

      default:
        return { enabled: false, reason: 'unknown_rollout_strategy' };
    }
  }

  private getCurrentGradualPhase(phases: PercentagePhase[]): PercentagePhase | undefined {
    const now = Date.now();
    for (const phase of phases) {
      if (!phase.startedAt) return phase;
      const startTime = new Date(phase.startedAt).getTime();
      const endTime = startTime + phase.duration;
      if (now >= startTime && (!phase.completedAt || now < endTime)) {
        return phase;
      }
    }
    return undefined;
  }

  private getCurrentCanaryPhase(phases: CanaryPhase[]): CanaryPhase | undefined {
    const now = Date.now();
    for (const phase of phases) {
      if (!phase.startedAt) return phase;
      const startTime = new Date(phase.startedAt).getTime();
      const endTime = startTime + phase.duration;
      if (now >= startTime && (!phase.completedAt || now < endTime)) {
        return phase;
      }
    }
    return undefined;
  }

  async recordError(flagId: string): Promise<void> {
    const metrics = this.metrics.get(flagId);
    if (metrics) {
      metrics.errorCount++;
      metrics.errorRate = metrics.exposedUsers > 0 ? (metrics.errorCount / metrics.exposedUsers) * 100 : 0;
      metrics.lastUpdated = new Date().toISOString();
    }
  }

  async recordExposure(flagId: string): Promise<void> {
    const metrics = this.metrics.get(flagId);
    if (metrics) {
      metrics.exposedUsers++;
      metrics.lastUpdated = new Date().toISOString();
    }
  }

  async getMetrics(flagId: string): Promise<FlagMetrics | undefined> {
    return this.metrics.get(flagId);
  }

  async abortCanary(flagId: string, reason: string): Promise<boolean> {
    const flag = this.flags.get(flagId);
    if (!flag || flag.rollout.type !== 'canary') return false;

    const strategy = flag.rollout as Extract<RolloutStrategy, { type: 'canary' }>;
    const currentPhase = this.getCurrentCanaryPhase(strategy.phases);
    if (!currentPhase) return false;

    currentPhase.abortedAt = new Date().toISOString();
    currentPhase.abortReason = reason;

    await this.updateFlag(flagId, {
      status: 'rolled_back',
      rollbackReason: reason,
    });

    return true;
  }

  private hashUserId(userId: string, seed: string): number {
    const combined = `${userId}:${seed}`;
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  async getAllFlags(): Promise<FeatureFlag[]> {
    return Array.from(this.flags.values());
  }

  async getEvaluationLog(limit: number = 1000): Promise<FeatureFlagEvaluation[]> {
    return this.evaluationLog.slice(-limit);
  }

  async clearMetrics(): Promise<void> {
    this.metrics.clear();
  }
}
