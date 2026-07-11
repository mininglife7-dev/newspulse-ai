interface AssessmentResponse {
  question_id: string;
  answer: string | number | boolean;
}

interface Recommendation {
  id: string;
  title: string;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  effort: 'hours' | 'days' | 'weeks';
  category: string;
  rationale: string;
  triggers: Array<{
    type: 'risk_level' | 'answer' | 'combination';
    condition: string;
  }>;
}

interface RecommendationResult {
  recommendations: Recommendation[];
  summary: string;
  timeline: string;
}

const RECOMMENDATIONS_LIBRARY: Recommendation[] = [
  // Critical: Prohibited practices
  {
    id: 'rec_001',
    title: 'Implement subliminal influence detection',
    description:
      'Add safeguards to prevent system from generating or amplifying subliminal messages, implicit biases, or manipulative content designed to circumvent human judgment.',
    priority: 'critical',
    effort: 'weeks',
    category: 'Prohibited Practices',
    rationale:
      'EU AI Act Article 5 prohibits subliminal manipulation. Mandatory for any system handling user-facing content.',
    triggers: [
      { type: 'answer', condition: 'q_subliminal_check === "yes"' },
      { type: 'risk_level', condition: 'risk_score >= 80' },
    ],
  },
  {
    id: 'rec_002',
    title: 'Vulnerable groups protection review',
    description:
      'Conduct equity audit ensuring system does not cause disproportionate harm to children, elderly, disabled persons, or other vulnerable populations.',
    priority: 'critical',
    effort: 'weeks',
    category: 'Prohibited Practices',
    rationale: 'EU AI Act Article 5(3) prohibits discrimination targeting vulnerable groups.',
    triggers: [{ type: 'answer', condition: 'q_vulnerable_groups === "yes"' }],
  },
  {
    id: 'rec_003',
    title: 'Eliminate social credit scoring',
    description:
      'If system evaluates creditworthiness or social standing, remove or replace with transparent, explainable criteria. Eliminate automated exclusion based solely on AI scoring.',
    priority: 'critical',
    effort: 'weeks',
    category: 'Prohibited Practices',
    rationale: 'EU AI Act Article 5(1)(c) prohibits social credit scoring without human oversight.',
    triggers: [{ type: 'answer', condition: 'q_social_scoring === "yes"' }],
  },

  // High-risk: Employment
  {
    id: 'rec_004',
    title: 'Employment decision transparency framework',
    description:
      'Implement clear, auditable decision paths for hiring, promotion, termination decisions. Ensure candidates/employees can understand reasons for AI-assisted decisions affecting their employment.',
    priority: 'high',
    effort: 'weeks',
    category: 'High-Risk Systems',
    rationale:
      'EU AI Act Annex III: High-risk for employment. Requires transparency and human review for significant employment decisions.',
    triggers: [
      { type: 'answer', condition: 'q_employment_decisions === "yes"' },
      { type: 'risk_level', condition: 'risk_score >= 60 && q_employment_decisions === "yes"' },
    ],
  },
  {
    id: 'rec_005',
    title: 'Bias monitoring in hiring/promotion',
    description:
      'Establish ongoing monitoring dashboard tracking disparate impact across protected characteristics (gender, race, age, disability). Set intervention thresholds and remediation workflows.',
    priority: 'high',
    effort: 'weeks',
    category: 'High-Risk Systems',
    rationale:
      'EU AI Act requires bias testing and mitigation for employment systems. Evidence of fairness is required for compliance.',
    triggers: [
      { type: 'answer', condition: 'q_employment_decisions === "yes"' },
      { type: 'risk_level', condition: 'risk_score >= 50' },
    ],
  },

  // High-risk: Biometric
  {
    id: 'rec_006',
    title: 'Biometric identification accuracy audit',
    description:
      'Conduct independent accuracy testing across demographic groups. Document false positive/negative rates, error thresholds, and mitigation for edge cases.',
    priority: 'high',
    effort: 'weeks',
    category: 'High-Risk Systems',
    rationale:
      'EU AI Act Annex III: High-risk for biometric ID. Requires documented accuracy standards and testing for demographic parity.',
    triggers: [
      { type: 'answer', condition: 'q_biometric_id === "yes"' },
      { type: 'risk_level', condition: 'risk_score >= 60' },
    ],
  },
  {
    id: 'rec_007',
    title: 'Informed consent for biometric processing',
    description:
      'Establish explicit, informed consent workflow. Users must understand what biometric data is collected, how it is used, and can revoke consent. Implement consent logs.',
    priority: 'high',
    effort: 'days',
    category: 'High-Risk Systems',
    rationale:
      'GDPR Article 7 + EUAID Annex III: Explicit consent required. Consent must be freely given, specific, informed, and unambiguous.',
    triggers: [{ type: 'answer', condition: 'q_biometric_id === "yes"' }],
  },

  // High-risk: Creditworthiness
  {
    id: 'rec_008',
    title: 'Credit decision explainability',
    description:
      'Implement explainable AI for creditworthiness decisions. Applicants denied credit must receive clear reasons tied to identifiable factors, with right to human review.',
    priority: 'high',
    effort: 'weeks',
    category: 'High-Risk Systems',
    rationale:
      'EU AI Act Annex III + GDPR Article 22: Requires explainability and right to challenge automated credit decisions.',
    triggers: [
      { type: 'answer', condition: 'q_creditworthiness === "yes"' },
      { type: 'risk_level', condition: 'risk_score >= 60' },
    ],
  },
  {
    id: 'rec_009',
    title: 'Alternative credit assessment pathways',
    description:
      'Provide mechanism for applicants with no/thin credit history to obtain credit through alternative assessment (manual review, guarantor, collateral).',
    priority: 'high',
    effort: 'days',
    category: 'High-Risk Systems',
    rationale:
      'Mitigates discriminatory impact of purely algorithmic credit decisions. Complies with fair lending principles.',
    triggers: [
      { type: 'answer', condition: 'q_creditworthiness === "yes"' },
      { type: 'risk_level', condition: 'risk_score >= 50' },
    ],
  },

  // Medium-risk: Transparency
  {
    id: 'rec_010',
    title: 'AI disclosure notices',
    description:
      'Implement clear, prominent disclosure that AI is being used. Users must know before interacting with AI systems affecting them.',
    priority: 'high',
    effort: 'days',
    category: 'Transparency & Explainability',
    rationale: 'EU AI Act Article 52: Requires disclosure when users interact with AI. Builds trust and enables informed consent.',
    triggers: [
      { type: 'risk_level', condition: 'risk_score >= 40' },
      { type: 'answer', condition: 'q_explainability === "no"' },
    ],
  },
  {
    id: 'rec_011',
    title: 'Model documentation and technical record',
    description:
      'Create comprehensive technical record: training data sources, model architecture, performance metrics, testing results, limitations, and known failure modes.',
    priority: 'high',
    effort: 'weeks',
    category: 'Governance',
    rationale:
      'EU AI Act Articles 11-13: Requires technical documentation for all high-risk systems. Enables compliance monitoring and incident investigation.',
    triggers: [
      { type: 'risk_level', condition: 'risk_score >= 50' },
      { type: 'answer', condition: 'q_documentation === "no"' },
    ],
  },

  // Medium-risk: Data governance
  {
    id: 'rec_012',
    title: 'Data quality and lineage tracking',
    description:
      'Implement data governance: document sources, quality checks, versioning, lineage tracking. Establish process for identifying and removing biased/outdated training data.',
    priority: 'high',
    effort: 'weeks',
    category: 'Governance',
    rationale:
      'High-risk AI systems require documented data quality standards. Poor data quality is root cause of most compliance failures.',
    triggers: [
      { type: 'risk_level', condition: 'risk_score >= 50' },
      { type: 'answer', condition: 'q_data_governance === "no"' },
    ],
  },
  {
    id: 'rec_013',
    title: 'Human oversight process design',
    description:
      'Establish who, when, and how humans review and override AI decisions. Document escalation criteria, review SLAs, and approval authority. Train reviewers on overrides.',
    priority: 'medium',
    effort: 'weeks',
    category: 'Governance',
    rationale:
      'EU AI Act Articles 14-15: Requires meaningful human oversight for all high-risk systems. Cannot be rubber-stamp; reviewers must have competence and authority to override.',
    triggers: [
      { type: 'risk_level', condition: 'risk_score >= 50' },
      { type: 'answer', condition: 'q_human_oversight === "no"' },
    ],
  },

  // Low-risk: General compliance
  {
    id: 'rec_014',
    title: 'AI governance structure',
    description:
      'Establish AI governance board: cross-functional team (legal, compliance, product, engineering) meeting regularly to review system performance, risks, and mitigation effectiveness.',
    priority: 'medium',
    effort: 'days',
    category: 'Governance',
    rationale:
      'EU AI Act requires clear organizational accountability. Governance structure ensures sustained compliance and continuous improvement.',
    triggers: [{ type: 'risk_level', condition: 'risk_score >= 30' }],
  },
  {
    id: 'rec_015',
    title: 'Incident and risk reporting process',
    description:
      'Create process for reporting AI incidents, near-misses, and risks. Define escalation path to leadership and regulators when required. Maintain incident log with remediation tracking.',
    priority: 'medium',
    effort: 'days',
    category: 'Governance',
    rationale:
      'EU AI Act Article 63-64: Requires incident reporting to authorities. Internal process enables rapid response and regulatory cooperation.',
    triggers: [{ type: 'risk_level', condition: 'risk_score >= 40' }],
  },

  // Transparency & Data Handling (Enhanced)
  {
    id: 'rec_016',
    title: 'Transparency logging and audit trail',
    description:
      'Implement immutable audit logs recording: model inputs, decisions, confidence scores, human overrides, and outcomes. Enable traceability for regulatory review and incident investigation.',
    priority: 'high',
    effort: 'weeks',
    category: 'Transparency & Explainability',
    rationale:
      'EU AI Act Article 13: High-risk systems must maintain records of decision-making process. Audit trails essential for accountability and regulatory compliance.',
    triggers: [{ type: 'risk_level', condition: 'risk_score >= 60' }],
  },
  {
    id: 'rec_017',
    title: 'Data retention and deletion policy',
    description:
      'Define data retention schedules by data type (training, operational, audit). Implement automated deletion after retention period. Document legal basis for retention (GDPR Article 17 right to erasure).',
    priority: 'high',
    effort: 'weeks',
    category: 'Governance',
    rationale:
      'GDPR Article 5: Data minimization principle. EU AI Act requires documented data handling. Deletion policy demonstrates compliance with retention limits.',
    triggers: [
      { type: 'risk_level', condition: 'risk_score >= 50' },
      { type: 'answer', condition: 'q_data_classification_level >= 3' },
    ],
  },
  {
    id: 'rec_018',
    title: 'Algorithmic bias testing program',
    description:
      'Establish regular testing (quarterly minimum) for bias across demographic groups, regions, and use cases. Document methodology, results, and remediation for any detected disparities.',
    priority: 'high',
    effort: 'weeks',
    category: 'High-Risk Systems',
    rationale:
      'EU AI Act Article 26: Bias testing mandatory for high-risk systems. Regular testing demonstrates proactive risk management and commitment to fairness.',
    triggers: [
      { type: 'risk_level', condition: 'risk_score >= 60' },
      { type: 'answer', condition: 'q_employment_decisions === "yes" || q_vulnerable_groups === "yes"' },
    ],
  },
  {
    id: 'rec_019',
    title: 'Model performance monitoring dashboard',
    description:
      'Build real-time monitoring of key metrics: accuracy, fairness, precision, recall, latency, error rates. Set alert thresholds for degradation. Monthly performance reviews with stakeholders.',
    priority: 'medium',
    effort: 'weeks',
    category: 'Governance',
    rationale:
      'EU AI Act requires ongoing performance monitoring. Real-time dashboards enable rapid detection and response to model drift or performance issues.',
    triggers: [{ type: 'risk_level', condition: 'risk_score >= 50' }],
  },
  {
    id: 'rec_020',
    title: 'Third-party AI component audit',
    description:
      'If using third-party AI services (API, model, library): audit their compliance approach, documentation, and SLAs. Maintain audit trail of usage. Document liability allocation in contracts.',
    priority: 'high',
    effort: 'days',
    category: 'High-Risk Systems',
    rationale:
      'EU AI Act Article 25: Liability chain remains with deployer. Audit of third-party components essential to assess combined system risk and contractual responsibilities.',
    triggers: [{ type: 'risk_level', condition: 'risk_score >= 50' }],
  },
  {
    id: 'rec_021',
    title: 'Regulatory documentation package',
    description:
      'Prepare for regulatory inspection: compilation of technical documentation, risk assessment, training data provenance, performance reports, incident history, and remediation actions. Annual refresh.',
    priority: 'medium',
    effort: 'weeks',
    category: 'Governance',
    rationale:
      'EU AI Act Articles 37, 61: Regulators may request documentation. Pre-assembled package enables rapid response and demonstrates organizational preparedness.',
    triggers: [{ type: 'risk_level', condition: 'risk_score >= 50' }],
  },
  {
    id: 'rec_022',
    title: 'User consent and opt-out mechanisms',
    description:
      'For systems interacting with end users: implement clear consent flows (GDPR Article 7), easy opt-out options, and right to human review. Log all consent decisions.',
    priority: 'high',
    effort: 'weeks',
    category: 'Transparency & Explainability',
    rationale:
      'GDPR Articles 7, 21: Users must have meaningful control. Clear opt-out and human review options demonstrate respect for user rights and regulatory compliance.',
    triggers: [
      { type: 'answer', condition: 'q_user_notification === "no"' },
      { type: 'risk_level', condition: 'risk_score >= 50' },
    ],
  },
  {
    id: 'rec_023',
    title: 'Training data documentation and governance',
    description:
      'Document training data: sources, volume, composition, potential biases, preprocessing steps. Establish data governance: versioning, lineage tracking, quality checks before training.',
    priority: 'medium',
    effort: 'weeks',
    category: 'Transparency & Explainability',
    rationale:
      'EU AI Act Article 25: Technical documentation required for training data and methodology. Governance ensures reproducibility and enables bias remediation.',
    triggers: [{ type: 'risk_level', condition: 'risk_score >= 60' }],
  },
];

export function generateRecommendations(
  riskScore: number,
  assessmentResponses?: AssessmentResponse[]
): RecommendationResult {
  const matched: Recommendation[] = [];
  const seenIds = new Set<string>();

  // Match recommendations based on risk level and assessment answers
  RECOMMENDATIONS_LIBRARY.forEach((rec) => {
    if (seenIds.has(rec.id)) return;

    let shouldInclude = false;

    rec.triggers.forEach((trigger) => {
      if (trigger.type === 'risk_level') {
        // Simple eval of risk_level conditions
        const condition = trigger.condition.replace('risk_score', String(riskScore));
        try {
          if (Function('"use strict"; return (' + condition + ')')()) {
            shouldInclude = true;
          }
        } catch (e) {
          console.error('Failed to eval trigger:', trigger.condition, e);
        }
      } else if (trigger.type === 'answer' && assessmentResponses) {
        // Find matching response
        const responseMap = new Map(assessmentResponses.map((r) => [r.question_id, r.answer]));

        // Build condition with response values
        let condition = trigger.condition;
        responseMap.forEach((value, key) => {
          const strValue = typeof value === 'string' ? `"${value}"` : String(value);
          condition = condition.replace(new RegExp(key, 'g'), strValue);
        });

        try {
          if (Function('"use strict"; return (' + condition + ')')()) {
            shouldInclude = true;
          }
        } catch (e) {
          console.error('Failed to eval trigger:', trigger.condition, e);
        }
      }
    });

    if (shouldInclude) {
      matched.push(rec);
      seenIds.add(rec.id);
    }
  });

  // Sort by priority
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  matched.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  // Generate summary
  const criticalCount = matched.filter((r) => r.priority === 'critical').length;
  const highCount = matched.filter((r) => r.priority === 'high').length;

  let summary = `${matched.length} recommendations generated. `;
  if (criticalCount > 0) {
    summary += `${criticalCount} critical items require immediate action. `;
  }
  if (highCount > 0) {
    summary += `${highCount} high-priority items needed for compliance.`;
  }

  // Estimate timeline
  const timelineMap = {
    hours: 1,
    days: 5,
    weeks: 21,
  };

  const totalDays = matched.reduce((sum, rec) => sum + timelineMap[rec.effort], 0);
  const weeks = Math.ceil(totalDays / 5);
  const timeline =
    weeks < 4 ? `${weeks} weeks` : `${Math.ceil(weeks / 4)} months (${weeks} weeks of effort)`;

  return {
    recommendations: matched,
    summary,
    timeline,
  };
}

export function getRecommendationsByCategory(
  recommendations: Recommendation[]
): Record<string, Recommendation[]> {
  const byCategory: Record<string, Recommendation[]> = {};

  recommendations.forEach((rec) => {
    if (!byCategory[rec.category]) {
      byCategory[rec.category] = [];
    }
    byCategory[rec.category].push(rec);
  });

  return byCategory;
}
