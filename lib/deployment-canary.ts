/**
 * DNA-GOV-015: Deployment Canary
 *
 * Autonomously manage gradual code deployments with continuous health monitoring
 * and automatic abort if metrics spike. Deploy to 10% of traffic, measure impact,
 * then increment safely. Kill-switch available at any stage.
 *
 * Problem: Large deployments are risky. If a bug slips through tests, it affects
 * 100% of customers immediately. We need: gradual rollout strategy, continuous
 * health monitoring, automatic abort when metrics degrade, and manual kill-switch.
 */

export type CanaryStage = 'planning' | 'staged' | 'active' | 'aborted' | 'complete';
export type CanaryMetric = 'error_rate' | 'latency' | 'availability' | 'memory' | 'cpu';

export interface CanaryThreshold {
  metric: CanaryMetric;
  criticalMax: number; // Abort if exceeded
  warningMax: number; // Alert if exceeded
}

export interface CanaryStageConfig {
  stage: number; // 1, 2, 3, etc.
  percentage: number; // 10%, 25%, 50%, 100%
  duration: number; // How long to observe at this stage (minutes)
  thresholds: CanaryThreshold[];
}

export interface CanaryDeployment {
  id: string;
  name: string;
  description: string;
  commit: string;
  version: string;
  // Deployment strategy
  stages: CanaryStageConfig[];
  currentStage: number;
  currentPercentage: number;
  // Health tracking
  status: CanaryStage;
  startedAt: string;
  lastCheckedAt: string;
  completedAt?: string;
  abortedAt?: string;
  abortReason?: string;
  // Metrics snapshot
  metrics: Record<CanaryMetric, { current: number; baseline: number; status: 'ok' | 'warning' | 'critical' }>;
  // History
  stageHistory: Array<{
    stage: number;
    percentage: number;
    startedAt: string;
    completedAt?: string;
    abortedAt?: string;
    status: 'running' | 'completed' | 'aborted';
  }>;
}

export interface CanaryHealthSnapshot {
  timestamp: string;
  deploymentId: string;
  stage: number;
  percentage: number;
  metrics: Record<CanaryMetric, number>;
  allHealthy: boolean;
  warnings: string[];
  criticalIssues: string[];
}

// In-memory canary store (would be persisted to database in production)
const deployments = new Map<string, CanaryDeployment>();
const healthSnapshots = new Map<string, CanaryHealthSnapshot[]>();

/**
 * Create a new canary deployment plan
 */
export function planCanaryDeployment(
  name: string,
  commit: string,
  version: string,
  description: string,
  stages: CanaryStageConfig[]
): CanaryDeployment {
  const id = `canary-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const deployment: CanaryDeployment = {
    id,
    name,
    description,
    commit,
    version,
    stages,
    currentStage: 0,
    currentPercentage: 0,
    status: 'planning',
    startedAt: new Date().toISOString(),
    lastCheckedAt: new Date().toISOString(),
    metrics: {
      error_rate: { current: 0, baseline: 0, status: 'ok' },
      latency: { current: 0, baseline: 0, status: 'ok' },
      availability: { current: 100, baseline: 100, status: 'ok' },
      memory: { current: 0, baseline: 0, status: 'ok' },
      cpu: { current: 0, baseline: 0, status: 'ok' },
    },
    stageHistory: [],
  };

  deployments.set(id, deployment);
  healthSnapshots.set(id, []);

  return deployment;
}

/**
 * Get a canary deployment
 */
export function getCanaryDeployment(deploymentId: string): CanaryDeployment | undefined {
  return deployments.get(deploymentId);
}

/**
 * Start the canary deployment at the first stage
 */
export function startCanaryDeployment(deploymentId: string): CanaryDeployment | undefined {
  const deployment = deployments.get(deploymentId);
  if (!deployment) return undefined;

  if (deployment.status !== 'planning') {
    throw new Error('Can only start deployments in planning status');
  }

  deployment.status = 'staged';
  deployment.currentStage = 1;
  deployment.currentPercentage = deployment.stages[0]?.percentage || 0;
  deployment.startedAt = new Date().toISOString();

  deployment.stageHistory.push({
    stage: 1,
    percentage: deployment.currentPercentage,
    startedAt: new Date().toISOString(),
    status: 'running',
  });

  deployments.set(deploymentId, deployment);
  return deployment;
}

/**
 * Record health metrics for a deployment stage
 */
export function recordCanaryMetrics(
  deploymentId: string,
  metrics: Record<CanaryMetric, number>
): CanaryHealthSnapshot {
  const deployment = deployments.get(deploymentId);
  if (!deployment) {
    throw new Error(`Deployment ${deploymentId} not found`);
  }

  const snapshot: CanaryHealthSnapshot = {
    timestamp: new Date().toISOString(),
    deploymentId,
    stage: deployment.currentStage,
    percentage: deployment.currentPercentage,
    metrics,
    allHealthy: true,
    warnings: [],
    criticalIssues: [],
  };

  // Get current stage config
  const stageConfig = deployment.stages[deployment.currentStage - 1];
  if (stageConfig) {
    for (const threshold of stageConfig.thresholds) {
      const currentValue = metrics[threshold.metric];

      // Check for critical
      if (currentValue > threshold.criticalMax) {
        snapshot.allHealthy = false;
        snapshot.criticalIssues.push(
          `${threshold.metric}: ${currentValue} exceeds critical threshold ${threshold.criticalMax}`
        );
      }
      // Check for warning
      else if (currentValue > threshold.warningMax) {
        snapshot.warnings.push(
          `${threshold.metric}: ${currentValue} exceeds warning threshold ${threshold.warningMax}`
        );
      }

      // Update deployment metrics
      deployment.metrics[threshold.metric] = {
        current: currentValue,
        baseline: deployment.metrics[threshold.metric]?.baseline || 0,
        status: snapshot.criticalIssues.length > 0 ? 'critical' : snapshot.warnings.length > 0 ? 'warning' : 'ok',
      };
    }
  }

  deployment.lastCheckedAt = new Date().toISOString();

  // Store snapshot
  const snapshots = healthSnapshots.get(deploymentId) || [];
  snapshots.push(snapshot);
  healthSnapshots.set(deploymentId, snapshots);

  // If critical issues found, abort
  if (snapshot.criticalIssues.length > 0) {
    abortCanaryDeployment(deploymentId, `Critical metrics exceeded: ${snapshot.criticalIssues.join('; ')}`);
  }

  deployments.set(deploymentId, deployment);
  return snapshot;
}

/**
 * Increment to next stage if current stage is healthy
 */
export function incrementCanaryStage(deploymentId: string): CanaryDeployment | undefined {
  const deployment = deployments.get(deploymentId);
  if (!deployment) return undefined;

  if (deployment.status !== 'staged' && deployment.status !== 'active') {
    throw new Error('Can only increment active canary deployments');
  }

  if (deployment.currentStage >= deployment.stages.length) {
    throw new Error('Already at final stage');
  }

  // Mark current stage as completed
  if (deployment.stageHistory.length > 0) {
    const lastStage = deployment.stageHistory[deployment.stageHistory.length - 1];
    lastStage.completedAt = new Date().toISOString();
    lastStage.status = 'completed';
  }

  // Move to next stage
  deployment.currentStage++;
  deployment.status = 'active';
  deployment.currentPercentage = deployment.stages[deployment.currentStage - 1]?.percentage || 100;

  deployment.stageHistory.push({
    stage: deployment.currentStage,
    percentage: deployment.currentPercentage,
    startedAt: new Date().toISOString(),
    status: 'running',
  });

  // Check if we reached 100%
  if (deployment.currentPercentage === 100 && deployment.currentStage === deployment.stages.length) {
    completeCanaryDeployment(deploymentId);
  }

  deployments.set(deploymentId, deployment);
  return deployment;
}

/**
 * Mark deployment as complete
 */
export function completeCanaryDeployment(deploymentId: string): CanaryDeployment | undefined {
  const deployment = deployments.get(deploymentId);
  if (!deployment) return undefined;

  if (deployment.stageHistory.length > 0) {
    const lastStage = deployment.stageHistory[deployment.stageHistory.length - 1];
    lastStage.completedAt = new Date().toISOString();
    lastStage.status = 'completed';
  }

  deployment.status = 'complete';
  deployment.completedAt = new Date().toISOString();

  deployments.set(deploymentId, deployment);
  return deployment;
}

/**
 * Abort canary deployment with reason
 */
export function abortCanaryDeployment(deploymentId: string, reason: string): CanaryDeployment | undefined {
  const deployment = deployments.get(deploymentId);
  if (!deployment) return undefined;

  if (deployment.status === 'complete' || deployment.status === 'aborted') {
    throw new Error(`Cannot abort ${deployment.status} deployment`);
  }

  if (deployment.stageHistory.length > 0) {
    const lastStage = deployment.stageHistory[deployment.stageHistory.length - 1];
    lastStage.abortedAt = new Date().toISOString();
    lastStage.status = 'aborted';
  }

  deployment.status = 'aborted';
  deployment.abortedAt = new Date().toISOString();
  deployment.abortReason = reason;

  deployments.set(deploymentId, deployment);
  return deployment;
}

/**
 * Get health snapshots for a deployment
 */
export function getCanaryHealthSnapshots(deploymentId: string): CanaryHealthSnapshot[] {
  return healthSnapshots.get(deploymentId) || [];
}

/**
 * Get latest health snapshot
 */
export function getLatestCanarySnapshot(deploymentId: string): CanaryHealthSnapshot | undefined {
  const snapshots = healthSnapshots.get(deploymentId) || [];
  return snapshots[snapshots.length - 1];
}

/**
 * Get canary deployment summary
 */
export function getCanarySummary(deploymentId: string): {
  id: string;
  name: string;
  version: string;
  status: CanaryStage;
  progress: string; // "Stage 2 of 3 (25%)"
  health: string; // "✅ Healthy", "⚠️ Warnings", "🔴 Critical"
  elapsedTime: string; // "2 hours 30 minutes"
  expectedCompletion: string; // Estimated time to 100%
  lastMetrics: Record<CanaryMetric, number>;
} | undefined {
  const deployment = deployments.get(deploymentId);
  if (!deployment) return undefined;

  const snapshots = healthSnapshots.get(deploymentId) || [];
  const lastSnapshot = snapshots[snapshots.length - 1];

  // Calculate elapsed time
  const elapsed = new Date(deployment.lastCheckedAt).getTime() - new Date(deployment.startedAt).getTime();
  const hours = Math.floor(elapsed / 3600000);
  const minutes = Math.floor((elapsed % 3600000) / 60000);
  const elapsedStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

  // Health status
  let healthStatus = '✅ Healthy';
  if (lastSnapshot?.criticalIssues.length) {
    healthStatus = '🔴 Critical';
  } else if (lastSnapshot?.warnings.length) {
    healthStatus = '⚠️ Warnings';
  }

  // Progress
  const progressStr = `Stage ${deployment.currentStage} of ${deployment.stages.length} (${deployment.currentPercentage}%)`;

  // Estimate time to completion
  const completionEstimate = calculateCompletionEstimate(deployment);

  return {
    id: deploymentId,
    name: deployment.name,
    version: deployment.version,
    status: deployment.status,
    progress: progressStr,
    health: healthStatus,
    elapsedTime: elapsedStr,
    expectedCompletion: completionEstimate,
    lastMetrics: lastSnapshot?.metrics || {},
  };
}

/**
 * Estimate time to completion based on stage durations
 */
function calculateCompletionEstimate(deployment: CanaryDeployment): string {
  let totalMinutes = 0;
  for (let i = deployment.currentStage; i < deployment.stages.length; i++) {
    totalMinutes += deployment.stages[i]?.duration || 15;
  }

  if (totalMinutes === 0) return 'Immediate (at 100%)';
  if (totalMinutes < 60) return `~${totalMinutes} minutes`;

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `~${hours}h ${minutes}m`;
}

/**
 * Format deployment status for display
 */
export function formatCanaryStatus(deployment: CanaryDeployment): string {
  const statusIcon = {
    planning: '📋',
    staged: '🚀',
    active: '🔄',
    complete: '✅',
    aborted: '⛔',
  }[deployment.status];

  const progressStr =
    deployment.currentPercentage > 0
      ? ` (${deployment.currentPercentage}% → ${deployment.currentStage}/${deployment.stages.length} stages)`
      : '';

  const reason = deployment.abortReason ? `\n  ⚠️  Reason: ${deployment.abortReason}` : '';

  return `${statusIcon} [${deployment.status}] ${deployment.name} v${deployment.version}${progressStr}${reason}`;
}

/**
 * Reset canary store (testing)
 */
export function resetCanaryHub(): void {
  deployments.clear();
  healthSnapshots.clear();
}
