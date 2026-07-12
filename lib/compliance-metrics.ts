/**
 * Compliance Metrics Calculator
 * Calculates coverage, gap analysis, and compliance status across obligations and evidence
 */

export interface ComplianceMetrics {
  totalObligations: number;
  identifiedObligations: number;
  inProgressObligations: number;
  completedObligations: number;
  notApplicableObligations: number;
  compliancePercentage: number;
  urgentObligations: number;
  overallStatus: 'compliant' | 'partial' | 'non_compliant' | 'unknown';
}

export interface ObligationMetrics {
  obligationId: string;
  obligationTitle: string;
  status: 'identified' | 'in_progress' | 'completed' | 'not_applicable';
  priority: 'critical' | 'high' | 'medium' | 'low';
  evidenceCount: number;
  approvedEvidenceCount: number;
  evidenceCoveragePercentage: number;
  daysOverdue: number | null;
  complianceStatus: 'compliant' | 'partial' | 'non_compliant' | 'unknown';
}

export interface ComplianceGap {
  obligationId: string;
  obligationTitle: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  gapDescription: string;
  requiredEvidence: string[];
  dueDate: string | null;
  recommendedActions: string[];
}

/**
 * Calculate overall compliance metrics for a company
 */
export function calculateComplianceMetrics(obligations: Array<{
  id: string;
  status: string;
  priority: string;
  due_date: string | null;
}>): ComplianceMetrics {
  const total = obligations.length;

  if (total === 0) {
    return {
      totalObligations: 0,
      identifiedObligations: 0,
      inProgressObligations: 0,
      completedObligations: 0,
      notApplicableObligations: 0,
      compliancePercentage: 100,
      urgentObligations: 0,
      overallStatus: 'unknown',
    };
  }

  const identified = obligations.filter(o => o.status === 'identified').length;
  const inProgress = obligations.filter(o => o.status === 'in_progress').length;
  const completed = obligations.filter(o => o.status === 'completed').length;
  const notApplicable = obligations.filter(o => o.status === 'not_applicable').length;

  // Compliance percentage: (completed + notApplicable) / total
  const compliantCount = completed + notApplicable;
  const compliancePercentage = Math.round((compliantCount / total) * 100);

  // Urgent: critical or high priority obligations not completed
  const urgent = obligations.filter(
    o => ['critical', 'high'].includes(o.priority) && o.status !== 'completed'
  ).length;

  // Determine overall status
  let overallStatus: 'compliant' | 'partial' | 'non_compliant' | 'unknown' = 'unknown';
  if (compliancePercentage === 100) {
    overallStatus = 'compliant';
  } else if (compliancePercentage >= 50) {
    overallStatus = 'partial';
  } else if (compliancePercentage > 0) {
    overallStatus = 'partial';
  } else {
    overallStatus = 'non_compliant';
  }

  return {
    totalObligations: total,
    identifiedObligations: identified,
    inProgressObligations: inProgress,
    completedObligations: completed,
    notApplicableObligations: notApplicable,
    compliancePercentage,
    urgentObligations: urgent,
    overallStatus,
  };
}

/**
 * Calculate metrics for a specific obligation
 */
export function calculateObligationMetrics(
  obligation: {
    id: string;
    title: string;
    status: string;
    priority: string;
    due_date: string | null;
  },
  evidence: Array<{
    id: string;
    obligation_id: string;
    status: string;
  }>
): ObligationMetrics {
  const obligationEvidence = evidence.filter(e => e.obligation_id === obligation.id);
  const approvedEvidence = obligationEvidence.filter(e => e.status === 'approved').length;
  const totalEvidence = obligationEvidence.length;

  const evidenceCoveragePercentage = totalEvidence === 0 ? 0 : Math.round((approvedEvidence / totalEvidence) * 100);

  // Calculate days overdue
  let daysOverdue: number | null = null;
  if (obligation.due_date && obligation.status !== 'completed' && obligation.status !== 'not_applicable') {
    const dueDate = new Date(obligation.due_date);
    const today = new Date();
    const diffTime = today.getTime() - dueDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays > 0) {
      daysOverdue = diffDays;
    }
  }

  // Determine compliance status for this obligation
  let complianceStatus: 'compliant' | 'partial' | 'non_compliant' | 'unknown' = 'unknown';
  if (obligation.status === 'completed') {
    complianceStatus = 'compliant';
  } else if (obligation.status === 'not_applicable') {
    complianceStatus = 'compliant';
  } else if (approvedEvidence > 0) {
    complianceStatus = 'partial';
  } else if (obligation.status === 'in_progress') {
    complianceStatus = 'partial';
  } else {
    complianceStatus = 'non_compliant';
  }

  return {
    obligationId: obligation.id,
    obligationTitle: obligation.title,
    status: obligation.status as 'identified' | 'in_progress' | 'completed' | 'not_applicable',
    priority: obligation.priority as 'critical' | 'high' | 'medium' | 'low',
    evidenceCount: totalEvidence,
    approvedEvidenceCount: approvedEvidence,
    evidenceCoveragePercentage,
    daysOverdue,
    complianceStatus,
  };
}

/**
 * Identify compliance gaps for a company
 */
export function identifyComplianceGaps(
  obligations: Array<{
    id: string;
    title: string;
    status: string;
    priority: string;
    due_date: string | null;
    description?: string;
  }>,
  evidence: Array<{
    id: string;
    obligation_id: string;
    status: string;
  }>
): ComplianceGap[] {
  const gaps: ComplianceGap[] = [];

  for (const obligation of obligations) {
    // Skip completed and not applicable obligations
    if (obligation.status === 'completed' || obligation.status === 'not_applicable') {
      continue;
    }

    const obligationEvidence = evidence.filter(e => e.obligation_id === obligation.id);
    const approvedEvidence = obligationEvidence.filter(e => e.status === 'approved').length;

    // Gap exists if no approved evidence or still identified
    if (approvedEvidence === 0 || obligation.status === 'identified') {
      const gap: ComplianceGap = {
        obligationId: obligation.id,
        obligationTitle: obligation.title,
        priority: obligation.priority as 'critical' | 'high' | 'medium' | 'low',
        gapDescription: obligation.description || `No evidence submitted for ${obligation.title}`,
        requiredEvidence: [
          'Policy documentation',
          'Implementation evidence',
          'Testing/validation results',
          'Audit trail',
        ],
        dueDate: obligation.due_date,
        recommendedActions: generateRecommendations(obligation, approvedEvidence),
      };
      gaps.push(gap);
    }
  }

  return gaps;
}

/**
 * Generate recommendations for addressing compliance gaps
 */
function generateRecommendations(
  obligation: { status: string; priority: string },
  approvedEvidenceCount: number
): string[] {
  const recommendations: string[] = [];

  if (obligation.status === 'identified') {
    recommendations.push('Start compliance activities for this obligation');
  }

  if (approvedEvidenceCount === 0) {
    recommendations.push('Submit evidence documentation to demonstrate compliance');
  } else {
    recommendations.push('Submit additional evidence to complete compliance review');
  }

  if (['critical', 'high'].includes(obligation.priority)) {
    recommendations.push('Prioritize this obligation due to its criticality');
  }

  recommendations.push('Schedule compliance review with stakeholders');

  return recommendations;
}

/**
 * Calculate time to compliance if all in-progress obligations are completed
 */
export function estimateComplianceTimeline(
  obligations: Array<{
    id: string;
    status: string;
    due_date: string | null;
  }>
): {
  projectedComplianceDate: string | null;
  weeksToCompliance: number | null;
  criticalDeadlines: string[];
} {
  const inProgressWithDueDate = obligations
    .filter(o => o.status === 'in_progress' && o.due_date)
    .map(o => new Date(o.due_date!));

  if (inProgressWithDueDate.length === 0) {
    return {
      projectedComplianceDate: null,
      weeksToCompliance: null,
      criticalDeadlines: [],
    };
  }

  // Find the latest due date among in-progress items
  const projectedDate = new Date(Math.max(...inProgressWithDueDate.map(d => d.getTime())));
  const today = new Date();
  const weeksDiff = Math.ceil((projectedDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24 * 7));

  // Find upcoming deadlines (within 30 days)
  const upcoming = obligations
    .filter(o => o.due_date)
    .map(o => new Date(o.due_date!))
    .filter(d => {
      const diffTime = d.getTime() - today.getTime();
      const diffDays = diffTime / (1000 * 60 * 60 * 24);
      return diffDays <= 30 && diffDays > 0;
    })
    .sort((a, b) => a.getTime() - b.getTime())
    .map(d => d.toISOString().split('T')[0]);

  return {
    projectedComplianceDate: projectedDate.toISOString().split('T')[0],
    weeksToCompliance: weeksDiff,
    criticalDeadlines: upcoming,
  };
}

/**
 * Calculate compliance score (0-100) based on multiple factors
 */
export function calculateComplianceScore(
  metrics: ComplianceMetrics,
  gaps: ComplianceGap[],
  evidence: Array<{ status: string }>
): number {
  let score = 0;

  // Completion score (40%)
  score += (metrics.compliancePercentage / 100) * 40;

  // Evidence quality (30%)
  const approvedEvidence = evidence.filter(e => e.status === 'approved').length;
  const evidenceQuality = evidence.length === 0 ? 0 : (approvedEvidence / evidence.length) * 100;
  score += (evidenceQuality / 100) * 30;

  // Gap management (20%)
  const gapScore = Math.max(0, 100 - (gaps.length * 5));
  score += (gapScore / 100) * 20;

  // Urgency management (10%)
  const urgencyScore = Math.max(0, 100 - (metrics.urgentObligations * 10));
  score += (urgencyScore / 100) * 10;

  return Math.round(score);
}
