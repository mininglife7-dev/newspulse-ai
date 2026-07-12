/**
 * Audit Package Generator
 * Creates exportable compliance reports from assessments, obligations, and evidence
 */

export interface AuditPackageRequest {
  companyId: string;
  format: 'json' | 'pdf'; // PDF support via external service
  includeEvidence: boolean;
  includeObligations: boolean;
  includeTechnicalDetails: boolean;
}

export interface AuditPackageSummary {
  companyName: string;
  generatedAt: string;
  complianceScore: number;
  overallStatus: 'compliant' | 'partial' | 'non_compliant';
  riskLevel: 'prohibited' | 'high' | 'limited' | 'minimal';
  totalObligations: number;
  completedObligations: number;
  pendingObligations: number;
  evidenceSubmitted: number;
  evidenceApproved: number;
}

export interface AuditPackageContent {
  summary: AuditPackageSummary;
  executiveSummary: string;
  riskAssessments: Array<{
    aiSystemId: string;
    aiSystemName: string;
    riskLevel: string;
    riskScore: number;
    assessedAt: string;
  }>;
  obligations: Array<{
    id: string;
    title: string;
    source: string;
    status: string;
    priority: string;
    dueDate?: string;
    evidence: Array<{
      id: string;
      title: string;
      fileType: string;
      status: string;
      uploadedAt: string;
    }>;
  }>;
  gaps: Array<{
    obligationId: string;
    obligationTitle: string;
    priority: string;
    gapDescription: string;
    requiredEvidence: string[];
    recommendedActions: string[];
  }>;
  recommendations: string[];
  appendix: {
    assessmentDetails: boolean;
    evidenceDetails: boolean;
    timelineDetails: boolean;
  };
}

/**
 * Generate audit package summary
 */
export function generateAuditPackageSummary(
  companyName: string,
  complianceScore: number,
  overallStatus: 'compliant' | 'partial' | 'non_compliant',
  riskLevel: string,
  metrics: {
    totalObligations: number;
    completedObligations: number;
  },
  evidence: Array<{ status: string }>
): AuditPackageSummary {
  const approvedEvidence = evidence.filter(e => e.status === 'approved').length;

  return {
    companyName,
    generatedAt: new Date().toISOString(),
    complianceScore,
    overallStatus,
    riskLevel: riskLevel as 'prohibited' | 'high' | 'limited' | 'minimal',
    totalObligations: metrics.totalObligations,
    completedObligations: metrics.completedObligations,
    pendingObligations: metrics.totalObligations - metrics.completedObligations,
    evidenceSubmitted: evidence.length,
    evidenceApproved: approvedEvidence,
  };
}

/**
 * Generate executive summary narrative
 */
export function generateExecutiveSummary(
  summary: AuditPackageSummary,
  gaps: Array<{ priority: string }>
): string {
  const criticalGaps = gaps.filter(g => g.priority === 'critical').length;
  const compliancePercentage = Math.round(
    (summary.completedObligations / summary.totalObligations) * 100
  ) || 0;

  let narrative = `This audit package summarizes ${summary.companyName}'s compliance status with EU AI Act requirements as of ${new Date(summary.generatedAt).toLocaleDateString()}.\n\n`;

  narrative += `**Compliance Score:** ${summary.complianceScore}/100 (${summary.overallStatus.toUpperCase()})\n`;
  narrative += `**Overall Status:** ${summary.overallStatus === 'compliant' ? '✅ Compliant' : summary.overallStatus === 'partial' ? '⚠️ Partial Compliance' : '❌ Non-Compliant'}\n\n`;

  narrative += `**Obligation Progress:** ${summary.completedObligations}/${summary.totalObligations} obligations completed (${compliancePercentage}%)\n`;
  narrative += `**Evidence Submitted:** ${summary.evidenceApproved}/${summary.evidenceSubmitted} pieces approved\n\n`;

  if (criticalGaps > 0) {
    narrative += `**⚠️ CRITICAL:** ${criticalGaps} critical compliance gaps identified. Immediate action required.\n\n`;
  }

  narrative += `**Recommendation:** ${getRecommendationNarrative(summary.overallStatus, criticalGaps)}\n`;

  return narrative;
}

/**
 * Get recommendation narrative based on status
 */
function getRecommendationNarrative(status: string, criticalGaps: number): string {
  if (status === 'compliant') {
    return 'Continue monitoring and maintain evidence records. Schedule annual compliance review.';
  } else if (status === 'partial') {
    if (criticalGaps > 0) {
      return 'Address critical gaps immediately. Prioritize evidence submission for compliance obligations. Schedule weekly check-ins.';
    }
    return 'Accelerate evidence submission to achieve full compliance. Establish timeline for completing remaining obligations.';
  } else {
    return 'Develop comprehensive remediation plan. Engage with compliance team to address all identified gaps. Schedule emergency compliance review.';
  }
}

/**
 * Format obligation with evidence for audit report
 */
export function formatObligationForAudit(
  obligation: {
    id: string;
    title: string;
    source: string;
    status: string;
    priority: string;
    due_date?: string;
  },
  evidence: Array<{
    id: string;
    title: string;
    file_type: string;
    status: string;
    created_at: string;
  }>
) {
  return {
    id: obligation.id,
    title: obligation.title,
    source: obligation.source,
    status: obligation.status,
    priority: obligation.priority,
    dueDate: obligation.due_date,
    evidence: evidence.map(e => ({
      id: e.id,
      title: e.title,
      fileType: e.file_type,
      status: e.status,
      uploadedAt: e.created_at,
    })),
  };
}

/**
 * Calculate audit package metadata
 */
export function calculateAuditPackageMetadata(
  content: AuditPackageContent
): {
  pageCount: number;
  sectionCount: number;
  evidenceCount: number;
  generationTime: string;
} {
  const pageCount = 5 + Math.ceil(content.obligations.length / 2) + Math.ceil(content.gaps.length / 3);
  const sectionCount = 6 + (content.riskAssessments.length > 0 ? 1 : 0) + (content.gaps.length > 0 ? 1 : 0);
  const evidenceCount = content.obligations.reduce((sum, o) => sum + o.evidence.length, 0);

  return {
    pageCount,
    sectionCount,
    evidenceCount,
    generationTime: new Date().toISOString(),
  };
}

/**
 * Generate audit package content structure
 */
export function generateAuditPackageContent(
  summary: AuditPackageSummary,
  riskAssessments: any[],
  obligations: any[],
  gaps: any[],
  recommendations: string[]
): AuditPackageContent {
  return {
    summary,
    executiveSummary: generateExecutiveSummary(summary, gaps),
    riskAssessments: riskAssessments.map(r => ({
      aiSystemId: r.id,
      aiSystemName: r.name,
      riskLevel: r.risk_level,
      riskScore: r.risk_score,
      assessedAt: r.created_at,
    })),
    obligations: obligations.map(o => ({
      id: o.id,
      title: o.title,
      source: o.source,
      status: o.status,
      priority: o.priority,
      dueDate: o.due_date,
      evidence: o.evidence || [],
    })),
    gaps,
    recommendations,
    appendix: {
      assessmentDetails: true,
      evidenceDetails: true,
      timelineDetails: true,
    },
  };
}

/**
 * Validate audit package can be generated
 */
export function validateAuditPackageRequest(
  companyId: string,
  metrics: { totalObligations: number }
): { valid: boolean; reason?: string } {
  if (!companyId) {
    return { valid: false, reason: 'Company ID is required' };
  }

  if (metrics.totalObligations === 0) {
    return { valid: false, reason: 'No obligations found. Complete risk assessment first.' };
  }

  return { valid: true };
}
