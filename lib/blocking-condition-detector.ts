/**
 * DNA-GOV-001: Blocking Condition Detector
 *
 * Autonomously detects external blockers (GitHub Actions outages, Supabase unavailable,
 * console access required, etc.) and surfaces them so the Founder is alerted immediately
 * instead of discovering them during handoff.
 *
 * Evidence: GitHub Actions was down for 4+ hours undetected. This DNA would have surfaced
 * it within 30 minutes.
 */

export interface BlockingCondition {
  type:
    | 'actions_outage'
    | 'actions_no_recent_runs'
    | 'supabase_unavailable'
    | 'vercel_deployment_failed'
    | 'console_access_required'
    | 'unknown';
  severity: 'critical' | 'high' | 'medium';
  description: string;
  evidence: string[];
  discoveredAt: string;
  recommendedAction: string;
  estimatedImpact: string;
}

/**
 * Check GitHub Actions status by examining recent workflow runs.
 * Returns null if healthy, BlockingCondition if issues detected.
 */
export async function detectActionsOutage(
  owner: string,
  repo: string,
  token: string
): Promise<BlockingCondition | null> {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/actions/runs?per_page=10`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
        },
      }
    );

    if (!response.ok) {
      return {
        type: 'actions_outage',
        severity: 'critical',
        description: 'GitHub Actions API unreachable or returning errors',
        evidence: [`GitHub API returned ${response.status}`],
        discoveredAt: new Date().toISOString(),
        recommendedAction:
          'Check GitHub status page. If API is down, all merges are blocked.',
        estimatedImpact: 'Cannot run CI on new PRs; all code changes blocked.',
      };
    }

    const data = (await response.json()) as {
      workflow_runs: Array<{ created_at: string; conclusion: string }>;
    };
    const runs = data.workflow_runs || [];

    if (runs.length === 0) {
      return {
        type: 'actions_no_recent_runs',
        severity: 'high',
        description: 'No workflow runs in the last check',
        evidence: ['Zero workflow runs returned from API'],
        discoveredAt: new Date().toISOString(),
        recommendedAction:
          'Verify GitHub Actions is enabled. If outage: check status.github.com',
        estimatedImpact:
          'Cannot verify code quality or run CI. Merges proceed without automated verification.',
      };
    }

    // Check if any run succeeded recently (within last 2 hours)
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const recentSuccessfulRun = runs.find(
      (run) =>
        new Date(run.created_at) > twoHoursAgo && run.conclusion === 'success'
    );

    if (!recentSuccessfulRun && runs.length > 0) {
      // The GitHub runs API returns runs newest-first, so runs[0] is the most
      // recent run (previously mislabeled "oldestRun", which made the evidence
      // self-contradictory — it called the same timestamp both "Oldest run"
      // and "Most recent run").
      const mostRecentRun = new Date(runs[0].created_at);
      return {
        type: 'actions_no_recent_runs',
        severity: 'critical',
        description: `No successful workflow runs in the last 2 hours. Most recent run: ${mostRecentRun.toISOString()}`,
        evidence: [
          `Last 10 runs examined`,
          `None succeeded after ${twoHoursAgo.toISOString()}`,
          `Most recent run at ${mostRecentRun.toISOString()}`,
        ],
        discoveredAt: new Date().toISOString(),
        recommendedAction:
          'Check GitHub Actions settings. Verify billing limits not exceeded. Check Actions tab for error details.',
        estimatedImpact:
          'All PRs are stuck. Code changes cannot be verified or merged safely. Production deploys blocked.',
      };
    }

    return null; // Healthy
  } catch (error) {
    return {
      type: 'actions_outage',
      severity: 'high',
      description: `Could not check GitHub Actions: ${error instanceof Error ? error.message : 'Unknown error'}`,
      evidence: [`Exception during Actions check`],
      discoveredAt: new Date().toISOString(),
      recommendedAction:
        'Retry the check. If persistent, verify network access.',
      estimatedImpact: 'Cannot verify Actions health status.',
    };
  }
}

/**
 * Aggregate all known blocking conditions into a single assessment.
 */
export async function detectAllBlockingConditions(
  owner: string,
  repo: string,
  actionsToken: string
): Promise<BlockingCondition[]> {
  const conditions: BlockingCondition[] = [];

  // Check GitHub Actions
  const actionsCondition = await detectActionsOutage(owner, repo, actionsToken);
  if (actionsCondition) {
    conditions.push(actionsCondition);
  }

  // Future: Check Supabase, Vercel, etc.

  return conditions;
}

/**
 * Format a blocking condition for Founder visibility (e.g., in an issue or PR comment).
 */
export function formatBlockingConditionAlert(
  condition: BlockingCondition
): string {
  return `
⚠️ **${condition.severity.toUpperCase()}: ${condition.description}**

**Evidence:**
${condition.evidence.map((e) => `- ${e}`).join('\n')}

**Recommended action:** ${condition.recommendedAction}

**Estimated impact:** ${condition.estimatedImpact}

**Discovered:** ${condition.discoveredAt}
`.trim();
}
