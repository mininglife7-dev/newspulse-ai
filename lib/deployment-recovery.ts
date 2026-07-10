/**
 * DNA-GOV-012: Deployment Recovery
 *
 * Automatically detects and retries failed Vercel deployments with exponential backoff.
 * Monitors deployment status via Vercel API; retries transient failures (network, timeout).
 *
 * Purpose: Reduce deployment flakiness; improve production availability.
 */

export interface DeploymentStatus {
  deploymentId: string;
  state: 'BUILDING' | 'ERROR' | 'READY' | 'QUEUED' | 'INITIALIZING';
  url?: string;
  errorMessage?: string;
  createdAt: string;
  completedAt?: string;
}

export interface RetryAttempt {
  attempt: number;
  timestamp: string;
  reason: string;
  success: boolean;
  nextRetryIn?: number; // milliseconds
}

export interface DeploymentRecoveryReport {
  deploymentId: string;
  initialStatus: DeploymentStatus;
  retryAttempts: RetryAttempt[];
  finalStatus: DeploymentStatus;
  recovered: boolean;
  totalRetries: number;
  timeToRecovery?: number; // milliseconds
}

const MAX_RETRIES = 5;
const RETRY_DELAYS = [2000, 5000, 10000, 30000, 60000]; // exponential backoff

/**
 * Check Vercel deployment status via API
 */
export async function checkDeploymentStatus(deploymentId: string): Promise<DeploymentStatus> {
  try {
    const response = await fetch(
      `https://api.vercel.com/v13/deployments/${deploymentId}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.VERCEL_TOKEN}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Vercel API error: ${response.status}`);
    }

    const data = (await response.json()) as any;

    return {
      deploymentId: data.id,
      state: data.state || 'ERROR',
      url: data.url,
      errorMessage: data.errorMessage,
      createdAt: data.createdAt,
      completedAt: data.completedAt,
    };
  } catch (err) {
    return {
      deploymentId,
      state: 'ERROR',
      errorMessage: (err as any).message || 'Failed to check deployment status',
      createdAt: new Date().toISOString(),
    };
  }
}

/**
 * Determine if deployment error is transient (retryable)
 */
export function isTransientError(status: DeploymentStatus): boolean {
  if (!status.errorMessage) return false;

  const msg = status.errorMessage.toLowerCase();

  // Transient errors: timeouts, connection issues, resource exhaustion
  const transientPatterns = [
    'timeout',
    'econnrefused',
    'econnreset',
    'etimedout',
    'ehostunreach',
    'enetunreach',
    'epipe',
    'broken pipe',
    'connection reset',
    'too many requests',
    '429', // Rate limit
    '503', // Service unavailable
    '504', // Gateway timeout
    'resource limit',
    'out of memory',
    'insufficient resources',
  ];

  return transientPatterns.some((pattern) => msg.includes(pattern));
}

/**
 * Wait before retry with exponential backoff
 */
export async function waitBeforeRetry(attemptNumber: number): Promise<void> {
  const delayMs = RETRY_DELAYS[Math.min(attemptNumber, RETRY_DELAYS.length - 1)];
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

/**
 * Trigger Vercel deployment retry via GitHub
 */
export async function triggerDeploymentRetry(
  owner: string,
  repo: string,
  branchName: string
): Promise<boolean> {
  try {
    // Push empty commit to trigger redeploy
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${branchName}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sha: process.env.GIT_COMMIT_SHA || 'HEAD',
          force: false,
        }),
      }
    );

    return response.ok;
  } catch (err) {
    console.error('[deployment-recovery] Failed to trigger retry:', err);
    return false;
  }
}

/**
 * Attempt recovery with retries
 */
export async function attemptRecovery(
  deploymentId: string,
  owner?: string,
  repo?: string,
  branchName?: string
): Promise<DeploymentRecoveryReport> {
  const startTime = Date.now();
  const initialStatus = await checkDeploymentStatus(deploymentId);
  const attempts: RetryAttempt[] = [];

  // If not an error or not transient, return immediately
  if (initialStatus.state !== 'ERROR' || !isTransientError(initialStatus)) {
    return {
      deploymentId,
      initialStatus,
      retryAttempts: [],
      finalStatus: initialStatus,
      recovered: initialStatus.state === 'READY',
      totalRetries: 0,
    };
  }

  let currentStatus = initialStatus;

  for (let i = 0; i < MAX_RETRIES; i++) {
    await waitBeforeRetry(i);

    // Try to trigger retry via GitHub if credentials available
    if (owner && repo && branchName) {
      await triggerDeploymentRetry(owner, repo, branchName);
    }

    // Check deployment status
    const newStatus = await checkDeploymentStatus(deploymentId);

    attempts.push({
      attempt: i + 1,
      timestamp: new Date().toISOString(),
      reason: `Retry after transient error: ${currentStatus.errorMessage}`,
      success: newStatus.state === 'READY',
      nextRetryIn: i < MAX_RETRIES - 1 ? RETRY_DELAYS[i + 1] : undefined,
    });

    currentStatus = newStatus;

    // Exit if deployment succeeded
    if (currentStatus.state === 'READY') {
      return {
        deploymentId,
        initialStatus,
        retryAttempts: attempts,
        finalStatus: currentStatus,
        recovered: true,
        totalRetries: i + 1,
        timeToRecovery: Date.now() - startTime,
      };
    }

    // Exit if error is no longer transient
    if (!isTransientError(currentStatus)) {
      return {
        deploymentId,
        initialStatus,
        retryAttempts: attempts,
        finalStatus: currentStatus,
        recovered: false,
        totalRetries: i + 1,
        timeToRecovery: Date.now() - startTime,
      };
    }
  }

  // Max retries exhausted
  return {
    deploymentId,
    initialStatus,
    retryAttempts: attempts,
    finalStatus: currentStatus,
    recovered: false,
    totalRetries: MAX_RETRIES,
    timeToRecovery: Date.now() - startTime,
  };
}

/**
 * Format recovery report for logging
 */
export function formatRecoveryReport(report: DeploymentRecoveryReport): string {
  const lines = ['Deployment Recovery Report', '='.repeat(40)];
  lines.push(`Deployment ID: ${report.deploymentId}`);
  lines.push(`Initial State: ${report.initialStatus.state}`);
  lines.push(`Final State: ${report.finalStatus.state}`);
  lines.push(`Total Retries: ${report.totalRetries}`);
  lines.push('');

  if (report.recovered) {
    const seconds = ((report.timeToRecovery || 0) / 1000).toFixed(1);
    lines.push(`✅ Recovered in ${seconds}s after ${report.totalRetries} attempt(s)`);
    lines.push(`   URL: ${report.finalStatus.url || 'N/A'}`);
  } else {
    lines.push(`❌ Failed to recover after ${report.totalRetries} attempt(s)`);
    lines.push(`   Error: ${report.finalStatus.errorMessage || 'Unknown error'}`);
  }

  if (report.retryAttempts.length > 0) {
    lines.push('');
    lines.push('Retry Attempts:');
    report.retryAttempts.forEach((attempt) => {
      const status = attempt.success ? '✅' : '⏳';
      lines.push(`${status} Attempt ${attempt.attempt} - ${attempt.timestamp}`);
    });
  }

  return lines.join('\n');
}
