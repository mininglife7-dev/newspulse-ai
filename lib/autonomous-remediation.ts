/**
 * DNA-GOV-011: Autonomous Remediation
 *
 * Detect failures and autonomously apply fixes without human intervention:
 * - Deployment failures → auto-rollback to last stable version
 * - Performance degradation → scale resources, clear caches
 * - Error rate spikes → circuit breaker, graceful degradation
 * - Database connection failures → retry with exponential backoff
 * - Memory leaks → restart process, alert Founder
 *
 * Goal: 99.95% uptime through autonomous healing, Founder only intervenes on novel failures.
 */

export type RemediationAction = 'rollback' | 'restart' | 'scale' | 'cache-clear' | 'circuit-break' | 'alert-only';
export type FailureCategory = 'deployment' | 'performance' | 'error-rate' | 'database' | 'memory' | 'availability';

export interface DetectedFailure {
  category: FailureCategory;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  affectedService: string;
  detectedAt: string;
  evidence: string[];
  suggestedActions: RemediationAction[];
}

export interface RemediationAttempt {
  failureId: string;
  action: RemediationAction;
  startedAt: string;
  completedAt?: string;
  success: boolean;
  result: string;
  error?: string;
}

export interface RemediationResult {
  timestamp: string;
  detectedFailures: DetectedFailure[];
  attempts: RemediationAttempt[];
  successRate: number;
  outageAvoided: boolean;
  summary: string;
}

export interface RemediationPolicy {
  category: FailureCategory;
  detectionThreshold: {
    metric: string;
    condition: 'greater-than' | 'less-than' | 'equals';
    value: number;
  };
  autoRemediateOn: RemediationAction[];
  escalateToFounderOn: RemediationAction[];
  maxAttempts: number;
  backoffMultiplier: number;
}

// Default remediation policies
const DEFAULT_REMEDIATION_POLICIES: RemediationPolicy[] = [
  {
    category: 'error-rate',
    detectionThreshold: {
      metric: 'error_rate_percent',
      condition: 'greater-than',
      value: 5, // Alert if error rate > 5%
    },
    autoRemediateOn: ['circuit-break'],
    escalateToFounderOn: ['rollback'],
    maxAttempts: 3,
    backoffMultiplier: 2,
  },
  {
    category: 'performance',
    detectionThreshold: {
      metric: 'response_time_p99_ms',
      condition: 'greater-than',
      value: 5000, // Alert if P99 response time > 5s
    },
    autoRemediateOn: ['cache-clear', 'scale'],
    escalateToFounderOn: ['scale'],
    maxAttempts: 2,
    backoffMultiplier: 1.5,
  },
  {
    category: 'deployment',
    detectionThreshold: {
      metric: 'deployment_health_percent',
      condition: 'less-than',
      value: 95, // Alert if deployment health < 95%
    },
    autoRemediateOn: ['rollback'],
    escalateToFounderOn: ['rollback'],
    maxAttempts: 1,
    backoffMultiplier: 1,
  },
  {
    category: 'database',
    detectionThreshold: {
      metric: 'db_connection_pool_exhausted',
      condition: 'equals',
      value: 1,
    },
    autoRemediateOn: ['restart'],
    escalateToFounderOn: ['alert-only'],
    maxAttempts: 2,
    backoffMultiplier: 2,
  },
  {
    category: 'memory',
    detectionThreshold: {
      metric: 'memory_usage_percent',
      condition: 'greater-than',
      value: 90,
    },
    autoRemediateOn: ['cache-clear', 'restart'],
    escalateToFounderOn: ['restart', 'alert-only'],
    maxAttempts: 1,
    backoffMultiplier: 1,
  },
];

/**
 * Detect failures based on monitoring data
 */
export function detectFailures(metrics: Record<string, number>): DetectedFailure[] {
  const failures: DetectedFailure[] = [];

  // Check error rate
  if ((metrics.error_rate_percent || 0) > 5) {
    failures.push({
      category: 'error-rate',
      severity: metrics.error_rate_percent > 10 ? 'critical' : 'high',
      description: `Error rate elevated to ${metrics.error_rate_percent}% (threshold: 5%)`,
      affectedService: 'api',
      detectedAt: new Date().toISOString(),
      evidence: [`error_rate_percent: ${metrics.error_rate_percent}%`],
      suggestedActions: ['circuit-break', 'alert-only'],
    });
  }

  // Check response time
  if ((metrics.response_time_p99_ms || 0) > 5000) {
    failures.push({
      category: 'performance',
      severity: metrics.response_time_p99_ms > 10000 ? 'critical' : 'high',
      description: `Response time P99 is ${metrics.response_time_p99_ms}ms (threshold: 5000ms)`,
      affectedService: 'api',
      detectedAt: new Date().toISOString(),
      evidence: [`response_time_p99_ms: ${metrics.response_time_p99_ms}ms`],
      suggestedActions: ['cache-clear', 'scale'],
    });
  }

  // Check deployment health
  if ((metrics.deployment_health_percent || 100) < 95) {
    failures.push({
      category: 'deployment',
      severity: metrics.deployment_health_percent < 90 ? 'critical' : 'high',
      description: `Deployment health ${metrics.deployment_health_percent}% (threshold: 95%)`,
      affectedService: 'deployment',
      detectedAt: new Date().toISOString(),
      evidence: [`deployment_health_percent: ${metrics.deployment_health_percent}%`],
      suggestedActions: ['rollback'],
    });
  }

  // Check memory usage
  if ((metrics.memory_usage_percent || 0) > 90) {
    failures.push({
      category: 'memory',
      severity: metrics.memory_usage_percent >= 95 ? 'critical' : 'medium',
      description: `Memory usage at ${metrics.memory_usage_percent}% (threshold: 90%)`,
      affectedService: 'application',
      detectedAt: new Date().toISOString(),
      evidence: [`memory_usage_percent: ${metrics.memory_usage_percent}%`],
      suggestedActions: ['cache-clear', 'restart'],
    });
  }

  return failures;
}

/**
 * Determine remediation actions based on detected failures
 */
export function determineRemediationActions(failures: DetectedFailure[]): RemediationAction[] {
  const actions: Set<RemediationAction> = new Set();

  for (const failure of failures) {
    failure.suggestedActions.forEach(action => actions.add(action));
  }

  return Array.from(actions);
}

/**
 * Execute remediation action (simulated)
 */
export async function executeRemediationAction(action: RemediationAction, service: string): Promise<RemediationAttempt> {
  const startedAt = new Date().toISOString();
  let success = false;
  let result = '';
  let error: string | undefined;

  try {
    switch (action) {
      case 'rollback':
        result = `rolled back ${service} to previous stable version`;
        success = true;
        break;

      case 'restart':
        result = `Restarted ${service} process`;
        success = true;
        break;

      case 'scale':
        result = `Scaled ${service} from 2 to 4 instances`;
        success = true;
        break;

      case 'cache-clear':
        result = `Cleared cache for ${service}`;
        success = true;
        break;

      case 'circuit-break':
        result = `Enabled circuit breaker for ${service} (graceful degradation active)`;
        success = true;
        break;

      case 'alert-only':
        result = `Alert-only: No automatic remediation; Founder notified`;
        success = true;
        break;

      default:
        error = `Unknown remediation action: ${action}`;
    }
  } catch (e) {
    error = e instanceof Error ? e.message : 'Unknown error';
    success = false;
  }

  return {
    failureId: `failure-${Date.now()}`,
    action,
    startedAt,
    completedAt: new Date().toISOString(),
    success,
    result,
    error,
  };
}

/**
 * Generate autonomous remediation report
 */
export function generateRemediationReport(
  failures: DetectedFailure[],
  attempts: RemediationAttempt[]
): RemediationResult {
  const successfulAttempts = attempts.filter(a => a.success).length;
  const successRate = attempts.length > 0 ? (successfulAttempts / attempts.length) * 100 : 100;
  const outageAvoided = failures.every(f => f.severity !== 'critical' || attempts.some(a => a.success));

  let summary = '';
  if (failures.length === 0) {
    summary = '✅ All systems healthy; no remediation needed';
  } else if (successRate === 100) {
    summary = `✅ ${failures.length} issue(s) detected and autonomously resolved`;
  } else if (successRate >= 50) {
    summary = `⚠️  ${failures.length} issue(s) detected; ${successfulAttempts}/${attempts.length} remediation attempts succeeded`;
  } else {
    summary = `🔴 ${failures.length} issue(s) detected; remediation failed; Founder intervention required`;
  }

  return {
    timestamp: new Date().toISOString(),
    detectedFailures: failures,
    attempts,
    successRate,
    outageAvoided,
    summary,
  };
}

/**
 * Format remediation report for Founder visibility
 */
export function formatRemediationAlert(report: RemediationResult): string {
  let output = `Autonomous Remediation Report\n`;
  output += `${report.summary}\n\n`;

  if (report.detectedFailures.length > 0) {
    output += `Detected Failures (${report.detectedFailures.length}):\n`;
    report.detectedFailures.forEach(f => {
      const icon = f.severity === 'critical' ? '🔴' : f.severity === 'high' ? '🟠' : '🟡';
      output += `  ${icon} ${f.category}: ${f.description}\n`;
    });
    output += '\n';
  }

  if (report.attempts.length > 0) {
    output += `Remediation Attempts (${report.successRate.toFixed(0)}% success):\n`;
    report.attempts.forEach(a => {
      const icon = a.success ? '✅' : '❌';
      output += `  ${icon} ${a.action}: ${a.result}\n`;
    });
  }

  if (!report.outageAvoided && report.detectedFailures.some(f => f.severity === 'critical')) {
    output += '\n⚠️  CRITICAL: Outage not avoided. Manual intervention required.\n';
  }

  return output;
}

/**
 * Autonomous remediation orchestrator
 */
export class AutonomousRemediationEngine {
  private policies = DEFAULT_REMEDIATION_POLICIES;
  private attemptHistory: RemediationAttempt[] = [];

  async runRemediationCycle(metrics: Record<string, number>): Promise<RemediationResult> {
    // Detect failures
    const failures = detectFailures(metrics);

    // Determine actions
    const actions = determineRemediationActions(failures);

    // Execute remediation
    const attempts: RemediationAttempt[] = [];
    for (const action of actions) {
      const attempt = await executeRemediationAction(action, 'api');
      attempts.push(attempt);
      this.attemptHistory.push(attempt);
    }

    // Generate report
    return generateRemediationReport(failures, attempts);
  }

  getAttemptHistory(): RemediationAttempt[] {
    return this.attemptHistory;
  }

  resetHistory(): void {
    this.attemptHistory = [];
  }
}
