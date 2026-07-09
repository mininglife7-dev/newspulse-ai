/**
 * Canonical governance state model — single source of truth for all dashboard metrics.
 * Every UI component reads from this; no hardcoded values exist in the UI layer.
 */

export type BlockerStatus = 'resolved' | 'open' | 'blocked' | 'in_progress';
export type MissionStatus = 'completed' | 'in_progress' | 'open' | 'deferred';
export type GoNoGoState = 'go' | 'conditional_go' | 'no_go';
export type HealthStatus = 'healthy' | 'degraded' | 'critical';

export interface CategoryScore {
  name: string;
  mainScore: number;
  currentScore: number;
  targetScore: number;
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  owner: string;
  evidence: string;
}

export interface LaunchBlocker {
  id: string; // M-01, M-02, etc.
  title: string;
  status: BlockerStatus;
  problem: string;
  impact: string;
  solution: string;
  evidence: string[];
  riskLevel: 'low' | 'medium' | 'high';
  rollbackPath: string;
}

export interface Mission {
  id: string; // V2-1, V2-2, etc.
  title: string;
  status: MissionStatus;
  impactScore: number; // 0-10: launch impact
  effortEstimate: string; // e.g., "30 min", "1 d", "founder decision"
  owner: string; // "Founder", "Code", "Founder+Code", "Founder+Legal"
}

export interface DashboardState {
  // Timestamps
  lastUpdated: string; // ISO 8601
  dataSource: string; // "Canonical Backend" — never "Hardcoded"

  // Overall readiness
  launchReadiness: {
    percentage: number;
    state: GoNoGoState;
    reasoning: string;
    conditions?: string[]; // conditional GO conditions
  };

  // Aggregated metrics
  missionProgress: {
    completed: number;
    inProgress: number;
    open: number;
    deferred: number;
    percentComplete: number;
  };

  infraHealth: HealthStatus;

  customerReadiness: {
    percentage: number;
    blockers: string[];
  };

  pilotReadiness: {
    percentage: number;
    blockers: string[];
  };

  engineeringReadiness: {
    percentage: number;
    blockers: string[];
  };

  securityStatus: HealthStatus;
  deploymentStatus: HealthStatus;

  // Detailed blockers and missions
  blockers: LaunchBlocker[];
  missions: Mission[];

  // Category breakdown (from GO-NO-GO report)
  categories: CategoryScore[];

  // Critical gates — any red/unknown forces NO-GO
  criticalGates: {
    buildStatus: 'pass' | 'fail' | 'unknown';
    ciStatus: 'pass' | 'fail' | 'unknown';
    deploymentStatus: 'deployed' | 'failed' | 'unknown';
    securityAudit: 'pass' | 'warning' | 'fail' | 'unknown';
  };

  // Consistency check results
  inconsistencies: {
    found: boolean;
    issues: string[];
    lastCheckedAt: string;
  };
}

export interface DashboardError {
  ok: false;
  error: string;
  timestamp: string;
}

export type DashboardResponse =
  | (DashboardState & { ok?: true })
  | DashboardError;
