/**
 * Compliance Report Generation
 * Aggregates assessment, obligation, plan, and evidence data for executive reporting
 */

export interface RiskDistribution {
  unacceptable: number;
  high: number;
  limited: number;
  minimal: number;
}

export interface ComplianceMetrics {
  totalSystems: number;
  assessedSystems: number;
  assessmentCompletion: number; // percentage
  riskDistribution: RiskDistribution;
}

export interface ObligationMetrics {
  totalObligations: number;
  byStatus: {
    identified: number;
    in_progress: number;
    completed: number;
    not_applicable: number;
  };
  completionRate: number; // percentage
}

export interface RemediationMetrics {
  totalPlans: number;
  byStatus: {
    planned: number;
    in_progress: number;
    completed: number;
    on_hold: number;
  };
  completionRate: number; // percentage
  overdue: number;
}

export interface EvidenceMetrics {
  totalEvidence: number;
  byStatus: {
    submitted: number;
    under_review: number;
    approved: number;
    rejected: number;
  };
  approvalRate: number; // percentage
}

export interface ComplianceReportData {
  generatedAt: string;
  workspaceName: string;
  metrics: {
    compliance: ComplianceMetrics;
    obligations: ObligationMetrics;
    remediation: RemediationMetrics;
    evidence: EvidenceMetrics;
  };
  summary: {
    overallStatus: 'compliant' | 'at_risk' | 'non_compliant';
    keyRisks: string[];
    nextSteps: string[];
  };
}

/**
 * Calculate overall compliance status based on metrics
 */
export function calculateOverallStatus(
  assessmentCompletion: number,
  obligationCompletion: number,
  remediationCompletion: number,
  evidenceApproval: number
): 'compliant' | 'at_risk' | 'non_compliant' {
  const avgCompletion = (assessmentCompletion + obligationCompletion + remediationCompletion + evidenceApproval) / 4;

  if (avgCompletion >= 80) return 'compliant';
  if (avgCompletion >= 50) return 'at_risk';
  return 'non_compliant';
}

/**
 * Identify key risks from assessment data
 */
export function identifyKeyRisks(riskDistribution: RiskDistribution): string[] {
  const risks: string[] = [];

  if (riskDistribution.unacceptable > 0) {
    risks.push(`${riskDistribution.unacceptable} unacceptable-risk system(s) require immediate remediation`);
  }
  if (riskDistribution.high > 0) {
    risks.push(`${riskDistribution.high} high-risk system(s) need enhanced governance controls`);
  }

  return risks;
}

/**
 * Generate recommended next steps
 */
export function generateNextSteps(
  assessmentCompletion: number,
  obligationCompletion: number,
  remediationCompletion: number,
  overdueCount: number
): string[] {
  const steps: string[] = [];

  if (assessmentCompletion < 100) {
    steps.push(`Complete risk assessment for remaining ${100 - assessmentCompletion}% of AI systems`);
  }

  if (obligationCompletion < 100) {
    steps.push(`Address ${100 - obligationCompletion}% of outstanding compliance obligations`);
  }

  if (remediationCompletion < 50) {
    steps.push('Prioritize high-impact remediation plans to accelerate compliance progress');
  }

  if (overdueCount > 0) {
    steps.push(`Address ${overdueCount} overdue remediation plan(s)`);
  }

  return steps.length > 0
    ? steps
    : ['Continue monitoring compliance status and evidence submissions'];
}
