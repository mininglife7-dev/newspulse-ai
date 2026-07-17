/**
 * DNA-GOV-003: Deployment Verification
 *
 * Autonomously verifies that code pushed to main is actually deployed to production.
 * Critical gap: We push code to GitHub, Vercel builds, but we don't verify Vercel
 * actually deployed the new version. If deployment fails silently, customers get
 * 502 errors and we don't know until they report it.
 *
 * This DNA checks:
 * 1. Latest commit on main has a successful Vercel deployment
 * 2. That deployment is currently live (not pending/failed)
 * 3. The live deployment matches the committed code
 */

export interface DeploymentStatus {
  commitSha: string;
  commitMessage: string;
  deploymentState: 'success' | 'failed' | 'pending' | 'unknown';
  deploymentUrl?: string;
  deployedAt?: string;
  isLive: boolean;
}

export interface DeploymentVerificationResult {
  status: 'healthy' | 'warning' | 'critical';
  currentDeployment: DeploymentStatus | null;
  latestCommit: {
    sha: string;
    message: string;
    timestamp: string;
  } | null;
  mismatch?: boolean;
  alert?: string;
}

/**
 * Get latest commit from main branch via GitHub API
 */
export async function getLatestCommit(
  owner: string,
  repo: string,
  token: string
): Promise<{ sha: string; message: string; timestamp: string } | null> {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/commits/main`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
        },
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as {
      sha: string;
      commit: { message: string };
      created_at?: string;
    };

    return {
      sha: data.sha,
      message: data.commit.message,
      timestamp: data.created_at || new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

/**
 * Get deployment status from GitHub Deployments API
 * (Vercel creates deployments via GitHub integration)
 */
export async function getLatestDeployment(
  owner: string,
  repo: string,
  token: string
): Promise<DeploymentStatus | null> {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/deployments?environment=production&per_page=1`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
        },
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as Array<{
      id: number;
      sha: string;
      created_at: string;
      statuses_url: string;
    }>;

    if (!data || data.length === 0) {
      return null;
    }

    const deployment = data[0];

    // Get deployment status (check if it's successful)
    const statusResponse = await fetch(deployment.statuses_url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
      },
    });

    if (!statusResponse.ok) {
      return null;
    }

    const statuses = (await statusResponse.json()) as Array<{
      state: 'success' | 'failure' | 'pending' | 'error';
      created_at: string;
      target_url?: string;
      description?: string;
    }>;

    const latestStatus = statuses?.[0];
    const state =
      latestStatus?.state === 'success'
        ? 'success'
        : latestStatus?.state === 'pending'
          ? 'pending'
          : 'failed';

    return {
      commitSha: deployment.sha,
      commitMessage: '', // We'll get this separately
      deploymentState: state,
      deploymentUrl: latestStatus?.target_url,
      deployedAt: latestStatus?.created_at,
      isLive: state === 'success',
    };
  } catch {
    return null;
  }
}

/**
 * Verify that latest code is deployed and live
 */
export async function verifyDeployment(
  owner: string,
  repo: string,
  token: string
): Promise<DeploymentVerificationResult> {
  const latestCommit = await getLatestCommit(owner, repo, token);
  const latestDeployment = await getLatestDeployment(owner, repo, token);

  if (!latestCommit) {
    return {
      status: 'critical',
      currentDeployment: null,
      latestCommit: null,
      alert: 'Cannot fetch latest commit from GitHub',
    };
  }

  if (!latestDeployment) {
    return {
      status: 'critical',
      currentDeployment: null,
      latestCommit,
      alert: 'No production deployment found for latest commit',
    };
  }

  // Enrich deployment with commit message
  const enrichedDeployment: DeploymentStatus = {
    ...latestDeployment,
    commitMessage: latestCommit.message,
  };

  // Check if latest commit matches deployed commit
  const mismatch = latestCommit.sha !== latestDeployment.commitSha;

  if (mismatch) {
    return {
      status: 'warning',
      currentDeployment: enrichedDeployment,
      latestCommit,
      mismatch: true,
      alert: `Deployed commit (${latestDeployment.commitSha.slice(0, 7)}) does not match latest commit (${latestCommit.sha.slice(0, 7)})`,
    };
  }

  if (!latestDeployment.isLive) {
    return {
      status: 'warning',
      currentDeployment: enrichedDeployment,
      latestCommit,
      alert: `Latest deployment state is "${latestDeployment.deploymentState}", not "success"`,
    };
  }

  return {
    status: 'healthy',
    currentDeployment: enrichedDeployment,
    latestCommit,
  };
}

/**
 * Format deployment verification result for Founder alert
 */
export function formatDeploymentAlert(
  result: DeploymentVerificationResult
): string {
  if (result.status === 'healthy') {
    return `✅ Deployment verified: ${result.latestCommit?.sha.slice(0, 7)} is live (${result.currentDeployment?.deployedAt?.slice(0, 10)})`;
  }

  if (result.status === 'warning') {
    return `⚠️ Deployment warning: ${result.alert}`;
  }

  return `🔴 Deployment critical: ${result.alert}`;
}
