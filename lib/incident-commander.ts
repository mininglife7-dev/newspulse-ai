import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface IncidentTrigger {
  type: 'error_rate' | 'latency' | 'availability' | 'cost_spike';
  severity: 'warning' | 'critical';
  metric: string;
  threshold: number;
  current: number;
  message: string;
}

export interface RollbackCandidate {
  commit: string;
  message: string;
  timestamp: string;
  duration: string;
  estimatedImpact: 'low' | 'medium' | 'high';
}

export interface IncidentCommand {
  id: string;
  trigger: IncidentTrigger;
  decision: 'autorollback' | 'manual_review' | 'no_action';
  rollbackTarget: RollbackCandidate | null;
  reason: string;
  executedAt: string | null;
  status: 'pending' | 'executed' | 'failed' | 'cancelled';
}

const AUTOROLLBACK_THRESHOLDS = {
  error_rate: {
    critical: 0.15, // > 15% error rate
    warning: 0.05, // > 5% error rate (manual review)
  },
  latency: {
    critical: 5000, // > 5 seconds P95
    warning: 2000, // > 2 seconds P95 (manual review)
  },
  availability: {
    critical: 0.95, // < 95% uptime
    warning: 0.98, // < 98% uptime (manual review)
  },
  cost_spike: {
    critical: 4.0, // > 4x baseline (from DNA-011)
    warning: 2.0, // > 2x baseline (from DNA-011)
  },
};

/**
 * Fetch git history to identify safe rollback targets
 * Returns last N commits that are at least 30 minutes old (to avoid rolling back too recent changes)
 */
async function findRollbackCandidates(limit: number = 5): Promise<RollbackCandidate[]> {
  try {
    const { stdout } = await execAsync(
      `git log --oneline --decorate -${limit} --format='%H|%s|%ai|%ar'`
    );

    const lines = stdout.trim().split('\n');
    const candidates: RollbackCandidate[] = [];

    for (const line of lines) {
      const [commit, message, timestamp, duration] = line.split('|');
      if (!commit || !message) continue;

      // Parse duration to check if commit is old enough (avoid rolling back too recent changes)
      const minutesAgo = parseFloat(duration);
      if (minutesAgo < 30) {
        // Commit is too recent, skip it
        continue;
      }

      candidates.push({
        commit,
        message,
        timestamp,
        duration,
        estimatedImpact: calculateImpact(minutesAgo, message),
      });
    }

    return candidates;
  } catch (error) {
    console.error('[incident-commander] Failed to find rollback candidates:', error);
    return [];
  }
}

/**
 * Estimate the impact of rolling back to this commit
 * - Recent commits are low impact (easy to revert)
 * - Older commits are higher impact (more affected code)
 * - Schema/migration changes are high impact
 */
function calculateImpact(minutesAgo: number, message: string): 'low' | 'medium' | 'high' {
  const schemaKeywords = ['schema', 'migration', 'database', 'breaking'];
  const isSchemaChange = schemaKeywords.some((kw) =>
    message.toLowerCase().includes(kw)
  );

  if (isSchemaChange) return 'high';
  if (minutesAgo > 24 * 60) return 'high'; // > 1 day old
  if (minutesAgo > 4 * 60) return 'medium'; // > 4 hours old
  return 'low'; // < 4 hours, safe to roll back
}

/**
 * Determine if an incident trigger warrants automatic rollback
 * Only auto-rollback on CRITICAL severity with LOW/MEDIUM impact candidates
 */
export function evaluateAutoRollback(
  trigger: IncidentTrigger,
  candidates: RollbackCandidate[]
): { shouldRollback: boolean; target: RollbackCandidate | null; reason: string } {
  // Only auto-rollback on critical severity
  if (trigger.severity !== 'critical') {
    return {
      shouldRollback: false,
      target: null,
      reason: `Severity is ${trigger.severity}, not critical. Requires manual review.`,
    };
  }

  // Find best low-impact candidate
  const lowImpactCandidate = candidates.find((c) => c.estimatedImpact === 'low');
  if (!lowImpactCandidate) {
    return {
      shouldRollback: false,
      target: null,
      reason:
        'No low-impact rollback candidate found. Safest option is manual review by engineer.',
    };
  }

  // Threshold check (logic varies by type)
  const thresholds = AUTOROLLBACK_THRESHOLDS[trigger.type];
  const isBelowThreshold =
    trigger.type === 'availability'
      ? trigger.current < thresholds.critical // Lower is worse for availability
      : trigger.current > thresholds.critical; // Higher is worse for error_rate/latency/cost_spike

  if (!isBelowThreshold) {
    return {
      shouldRollback: false,
      target: null,
      reason: `Current value (${trigger.current}) not critical enough (threshold: ${thresholds.critical}). No action needed.`,
    };
  }

  return {
    shouldRollback: true,
    target: lowImpactCandidate,
    reason: `Critical ${trigger.type} spike (${trigger.current} > ${thresholds.critical}). Auto-rollback to ${lowImpactCandidate.commit.slice(0, 7)} is safe (${lowImpactCandidate.estimatedImpact} impact, ${lowImpactCandidate.duration} old).`,
  };
}

/**
 * Execute an automated rollback by checking out a previous commit and pushing to production
 * IMPORTANT: This is a destructive operation. In production, this should require additional safeguards:
 * - Approval from on-call engineer
 * - Canary deployment to staging first
 * - Gradual rollout (not instant push to all)
 */
async function executeRollback(target: RollbackCandidate): Promise<{
  success: boolean;
  message: string;
  duration: string;
}> {
  const startTime = Date.now();

  try {
    // Verify we're on main branch
    const { stdout: currentBranch } = await execAsync(
      'git symbolic-ref --short HEAD'
    );
    if (currentBranch.trim() !== 'main') {
      throw new Error(
        `Not on main branch (currently on ${currentBranch.trim()}). Aborting rollback.`
      );
    }

    // Create rollback commit
    await execAsync(
      `git revert --no-edit ${target.commit} -m 1`,
    );

    // Push to production (triggers Vercel deployment)
    await execAsync('git push origin main');

    const duration = `${Math.round((Date.now() - startTime) / 1000)}s`;
    return {
      success: true,
      message: `✅ Rollback executed: reverted ${target.commit.slice(0, 7)} (${target.message})`,
      duration,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    const duration = `${Math.round((Date.now() - startTime) / 1000)}s`;

    // Cleanup: reset if rollback failed partway through
    try {
      await execAsync('git reset --hard HEAD');
    } catch {}

    return {
      success: false,
      message: `❌ Rollback failed: ${errorMsg}`,
      duration,
    };
  }
}

/**
 * Main incident commander: evaluate trigger, decide on action, execute if safe
 */
export async function commandIncident(
  trigger: IncidentTrigger
): Promise<IncidentCommand> {
  const id = `incident-${Date.now()}`;
  const timestamp = new Date().toISOString();

  console.log(`[incident-commander] 🚨 Incident detected: ${trigger.type} (${trigger.severity})`);
  console.log(`  Metric: ${trigger.metric}`);
  console.log(`  Current: ${trigger.current} | Threshold: ${trigger.threshold}`);
  console.log(`  Message: ${trigger.message}`);

  try {
    // Find rollback candidates
    const candidates = await findRollbackCandidates(5);
    console.log(`[incident-commander] Found ${candidates.length} rollback candidates`);

    // Evaluate if auto-rollback is safe
    const { shouldRollback, target, reason } = evaluateAutoRollback(trigger, candidates);

    if (!shouldRollback) {
      console.log(`[incident-commander] ⚠️ No auto-rollback: ${reason}`);
      return {
        id,
        trigger,
        decision: 'manual_review',
        rollbackTarget: null,
        reason,
        executedAt: null,
        status: 'pending',
      };
    }

    if (!target) {
      return {
        id,
        trigger,
        decision: 'manual_review',
        rollbackTarget: null,
        reason: 'No safe rollback target found',
        executedAt: null,
        status: 'pending',
      };
    }

    console.log(`[incident-commander] ✅ Auto-rollback approved: ${reason}`);

    // Execute rollback
    const result = await executeRollback(target);
    console.log(`[incident-commander] ${result.message}`);

    return {
      id,
      trigger,
      decision: 'autorollback',
      rollbackTarget: target,
      reason,
      executedAt: result.success ? timestamp : null,
      status: result.success ? 'executed' : 'failed',
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[incident-commander] Unexpected error:`, errorMsg);

    return {
      id,
      trigger,
      decision: 'manual_review',
      rollbackTarget: null,
      reason: `Error during evaluation: ${errorMsg}`,
      executedAt: null,
      status: 'failed',
    };
  }
}

/**
 * Convert incident command to alert format (for DNA-005 integration)
 */
export function commandToAlert(command: IncidentCommand): {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  category: string;
  title: string;
  message: string;
  timestamp: string;
  source: string;
} {
  const baseMessage = command.trigger.message;
  const actionMessage =
    command.decision === 'autorollback'
      ? `Auto-rollback executed to ${command.rollbackTarget?.commit.slice(0, 7)}`
      : command.decision === 'manual_review'
        ? 'Manual review required'
        : 'No action taken';

  return {
    id: command.id,
    severity: command.trigger.severity === 'critical' ? 'critical' : 'warning',
    category: 'incident',
    title: `Incident: ${command.trigger.type}`,
    message: `${baseMessage} | ${actionMessage}`,
    timestamp: command.executedAt || new Date().toISOString(),
    source: 'DNA-GOV-014',
  };
}
