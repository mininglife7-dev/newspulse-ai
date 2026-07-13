/**
 * DNA-015: Deployment Canary
 *
 * Gradual production rollout with automatic abort on anomalies:
 * - Health checks during deployment phases
 * - Error rate, latency, and availability monitoring
 * - Automatic rollback on threshold breaches
 * - Traffic shifting (% of production traffic)
 * - Manual override capability
 * - Comprehensive deployment state tracking
 *
 * Ensures safe, reversible deployments with minimal blast radius.
 */

export interface DeploymentCanary {
  id: string;
  version: string;
  description: string;
  status: 'pending' | 'in_progress' | 'paused' | 'completed' | 'rolled_back' | 'failed';
  phases: CanaryPhase[];
  currentPhaseIndex: number;
  healthChecks: HealthCheck[];
  rollbackThresholds: RollbackThresholds;
  startedAt?: string;
  completedAt?: string;
  rolledBackAt?: string;
  rollbackReason?: string;
}

export interface CanaryPhase {
  id: string;
  name: string;
  percentage: number;
  duration: number;
  healthCheckInterval: number;
  startedAt?: string;
  completedAt?: string;
  paused: boolean;
  pausedAt?: string;
  resumedAt?: string;
}

export interface HealthCheck {
  id: string;
  timestamp: string;
  phase: string;
  metrics: HealthMetrics;
  status: 'healthy' | 'degraded' | 'critical' | 'unknown';
  issues: HealthIssue[];
}

export interface HealthMetrics {
  errorRate: number;
  p95Latency: number;
  availabilityPercentage: number;
  deploymentSuccessRate: number;
  cpuUsage: number;
  memoryUsage: number;
}

export interface HealthIssue {
  type: 'error_rate' | 'latency' | 'availability' | 'memory' | 'cpu' | 'deployment_failure';
  severity: 'warning' | 'critical';
  message: string;
  value: number;
  threshold: number;
}

export interface RollbackThresholds {
  maxErrorRate: number;
  maxP95Latency: number;
  minAvailability: number;
  maxConsecutiveFailedChecks: number;
}

export interface DeploymentMetrics {
  canaryId: string;
  phase: string;
  exposedSessions: number;
  errorCount: number;
  errorRate: number;
  p50Latency: number;
  p95Latency: number;
  p99Latency: number;
  availability: number;
  lastUpdated: string;
}

export class DeploymentCanaryController {
  private static instance: DeploymentCanaryController;
  private canaries: Map<string, DeploymentCanary> = new Map();
  private metrics: Map<string, DeploymentMetrics> = new Map();
  private healthHistory: Map<string, HealthCheck[]> = new Map();
  private consecutiveFailureCount: Map<string, number> = new Map();

  private constructor() {}

  static getInstance(): DeploymentCanaryController {
    if (!DeploymentCanaryController.instance) {
      DeploymentCanaryController.instance = new DeploymentCanaryController();
    }
    return DeploymentCanaryController.instance;
  }

  async createCanary(canary: Omit<DeploymentCanary, 'startedAt'>): Promise<DeploymentCanary> {
    const fullCanary: DeploymentCanary = {
      ...canary,
      startedAt: new Date().toISOString(),
    };

    this.canaries.set(canary.id, fullCanary);
    this.healthHistory.set(canary.id, []);
    this.consecutiveFailureCount.set(canary.id, 0);

    return fullCanary;
  }

  async getCanary(canaryId: string): Promise<DeploymentCanary | undefined> {
    return this.canaries.get(canaryId);
  }

  async recordHealthCheck(canaryId: string, metrics: HealthMetrics): Promise<HealthCheck | null> {
    const canary = this.canaries.get(canaryId);
    if (!canary) return null;

    if (canary.currentPhaseIndex >= canary.phases.length) {
      return null;
    }

    const phase = canary.phases[canary.currentPhaseIndex];
    const issues: HealthIssue[] = [];

    if (metrics.errorRate > canary.rollbackThresholds.maxErrorRate) {
      issues.push({
        type: 'error_rate',
        severity: 'critical',
        message: `Error rate ${metrics.errorRate}% exceeds threshold ${canary.rollbackThresholds.maxErrorRate}%`,
        value: metrics.errorRate,
        threshold: canary.rollbackThresholds.maxErrorRate,
      });
    }

    if (metrics.p95Latency > canary.rollbackThresholds.maxP95Latency) {
      issues.push({
        type: 'latency',
        severity: 'warning',
        message: `P95 latency ${metrics.p95Latency}ms exceeds threshold ${canary.rollbackThresholds.maxP95Latency}ms`,
        value: metrics.p95Latency,
        threshold: canary.rollbackThresholds.maxP95Latency,
      });
    }

    if (metrics.availabilityPercentage < canary.rollbackThresholds.minAvailability) {
      issues.push({
        type: 'availability',
        severity: 'critical',
        message: `Availability ${metrics.availabilityPercentage}% below threshold ${canary.rollbackThresholds.minAvailability}%`,
        value: metrics.availabilityPercentage,
        threshold: canary.rollbackThresholds.minAvailability,
      });
    }

    const status = this.calculateHealthStatus(issues);

    const healthCheck: HealthCheck = {
      id: `health-${canaryId}-${Date.now()}`,
      timestamp: new Date().toISOString(),
      phase: phase.id,
      metrics,
      status,
      issues,
    };

    const history = this.healthHistory.get(canaryId) || [];
    history.push(healthCheck);
    this.healthHistory.set(canaryId, history);

    if (status === 'critical') {
      const failureCount = (this.consecutiveFailureCount.get(canaryId) || 0) + 1;
      this.consecutiveFailureCount.set(canaryId, failureCount);

      if (failureCount >= canary.rollbackThresholds.maxConsecutiveFailedChecks) {
        await this.rollback(canaryId, `Consecutive critical checks: ${failureCount}`);
      }
    } else {
      this.consecutiveFailureCount.set(canaryId, 0);
    }

    return healthCheck;
  }

  async advancePhase(canaryId: string): Promise<boolean> {
    const canary = this.canaries.get(canaryId);
    if (!canary) return false;

    const currentPhase = canary.phases[canary.currentPhaseIndex];
    if (currentPhase) {
      currentPhase.completedAt = new Date().toISOString();
    }

    canary.currentPhaseIndex++;

    if (canary.currentPhaseIndex >= canary.phases.length) {
      canary.status = 'completed';
      canary.completedAt = new Date().toISOString();
      return true;
    }

    const nextPhase = canary.phases[canary.currentPhaseIndex];
    nextPhase.startedAt = new Date().toISOString();
    nextPhase.paused = false;

    return true;
  }

  async pausePhase(canaryId: string): Promise<boolean> {
    const canary = this.canaries.get(canaryId);
    if (!canary) return false;

    const phase = canary.phases[canary.currentPhaseIndex];
    if (!phase) return false;

    phase.paused = true;
    phase.pausedAt = new Date().toISOString();
    canary.status = 'paused';

    return true;
  }

  async resumePhase(canaryId: string): Promise<boolean> {
    const canary = this.canaries.get(canaryId);
    if (!canary) return false;

    const phase = canary.phases[canary.currentPhaseIndex];
    if (!phase) return false;

    phase.paused = false;
    phase.resumedAt = new Date().toISOString();
    canary.status = 'in_progress';

    return true;
  }

  async rollback(canaryId: string, reason: string): Promise<boolean> {
    const canary = this.canaries.get(canaryId);
    if (!canary) return false;

    canary.status = 'rolled_back';
    canary.rolledBackAt = new Date().toISOString();
    canary.rollbackReason = reason;

    return true;
  }

  async getHealthHistory(canaryId: string, limit: number = 100): Promise<HealthCheck[]> {
    const history = this.healthHistory.get(canaryId) || [];
    return history.slice(-limit);
  }

  async recordMetrics(canaryId: string, metrics: Partial<DeploymentMetrics>): Promise<DeploymentMetrics> {
    const existing = this.metrics.get(canaryId);
    const canary = this.canaries.get(canaryId);

    const fullMetrics: DeploymentMetrics = {
      canaryId,
      phase: canary?.phases[canary.currentPhaseIndex]?.id || 'unknown',
      exposedSessions: metrics.exposedSessions || existing?.exposedSessions || 0,
      errorCount: metrics.errorCount || existing?.errorCount || 0,
      errorRate: metrics.errorRate || existing?.errorRate || 0,
      p50Latency: metrics.p50Latency || existing?.p50Latency || 0,
      p95Latency: metrics.p95Latency || existing?.p95Latency || 0,
      p99Latency: metrics.p99Latency || existing?.p99Latency || 0,
      availability: metrics.availability || existing?.availability || 100,
      lastUpdated: new Date().toISOString(),
    };

    this.metrics.set(canaryId, fullMetrics);
    return fullMetrics;
  }

  async getMetrics(canaryId: string): Promise<DeploymentMetrics | undefined> {
    return this.metrics.get(canaryId);
  }

  async getCurrentPhase(canaryId: string): Promise<CanaryPhase | undefined> {
    const canary = this.canaries.get(canaryId);
    if (!canary) return undefined;

    return canary.phases[canary.currentPhaseIndex];
  }

  async getDeploymentStatus(canaryId: string): Promise<{
    canary: DeploymentCanary | undefined;
    currentPhase: CanaryPhase | undefined;
    metrics: DeploymentMetrics | undefined;
    recentHealth: HealthCheck[];
  }> {
    const canary = this.canaries.get(canaryId);
    const currentPhase = canary ? canary.phases[canary.currentPhaseIndex] : undefined;
    const metrics = this.metrics.get(canaryId);
    const recentHealth = (this.healthHistory.get(canaryId) || []).slice(-10);

    return { canary, currentPhase, metrics, recentHealth };
  }

  private calculateHealthStatus(issues: HealthIssue[]): 'healthy' | 'degraded' | 'critical' | 'unknown' {
    if (issues.length === 0) return 'healthy';

    const hasCritical = issues.some(i => i.severity === 'critical');
    if (hasCritical) return 'critical';

    const hasWarning = issues.some(i => i.severity === 'warning');
    if (hasWarning) return 'degraded';

    return 'healthy';
  }

  async getAllCanaries(): Promise<DeploymentCanary[]> {
    return Array.from(this.canaries.values());
  }

  async clearMetrics(): Promise<void> {
    this.metrics.clear();
    this.healthHistory.clear();
    this.consecutiveFailureCount.clear();
  }
}
