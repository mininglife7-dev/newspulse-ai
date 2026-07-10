/** Compliance obligations and remediation recommendations based on risk level and assessment responses. */

import { type RiskLevel, type AssessmentResponse, EU_AI_ACT_QUESTIONS } from './risk-assessment';

export interface Obligation {
  id: string;
  category: 'prohibited' | 'high_risk' | 'transparency' | 'governance';
  title: string;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  effort_estimate: 'hours' | 'days' | 'weeks';
  trigger_questions: string[]; // question IDs that trigger this obligation
  compliance_framework: 'eu_ai_act'; // extensible for other frameworks
}

export interface RemediationPlan {
  risk_level: RiskLevel;
  risk_score: number;
  obligations: Obligation[];
  summary: string;
  timeline_weeks: number;
}

/** Obligation definitions based on EU AI Act compliance requirements */
export const COMPLIANCE_OBLIGATIONS: Obligation[] = [
  // PROHIBITED PRACTICES — immediate action required
  {
    id: 'prohibited_ban_subliminal',
    category: 'prohibited',
    title: 'Remove subliminal/deceptive techniques',
    description:
      'Subliminal or deceptive manipulation techniques are prohibited. Remove any techniques designed to operate below conscious awareness or mislead users.',
    priority: 'critical',
    effort_estimate: 'hours',
    trigger_questions: ['prohibited_1'],
    compliance_framework: 'eu_ai_act',
  },
  {
    id: 'prohibited_protect_vulnerable',
    category: 'prohibited',
    title: 'Eliminate vulnerable group exploitation',
    description:
      'Do not exploit vulnerabilities of children, elderly, or disabled persons. Add safeguards and restrictions for protected groups.',
    priority: 'critical',
    effort_estimate: 'days',
    trigger_questions: ['prohibited_2'],
    compliance_framework: 'eu_ai_act',
  },
  {
    id: 'prohibited_ban_social_scoring',
    category: 'prohibited',
    title: 'Ban social scoring for personal conduct',
    description:
      'Social scoring systems based solely on personal conduct or characteristics are prohibited. Remove or redesign any such rating mechanisms.',
    priority: 'critical',
    effort_estimate: 'weeks',
    trigger_questions: ['prohibited_3'],
    compliance_framework: 'eu_ai_act',
  },

  // HIGH-RISK MITIGATIONS
  {
    id: 'highrisk_employment_impact_assessment',
    category: 'high_risk',
    title: 'Conduct employment impact assessment',
    description:
      'Perform a detailed impact assessment for employment decisions. Document how the system affects hiring, firing, and performance management. Implement human oversight.',
    priority: 'high',
    effort_estimate: 'weeks',
    trigger_questions: ['high_risk_1'],
    compliance_framework: 'eu_ai_act',
  },
  {
    id: 'highrisk_biometric_governance',
    category: 'high_risk',
    title: 'Implement biometric data governance',
    description:
      'Establish strict controls for biometric identification. Document data retention, access controls, and error rate testing. Implement audit trails for all biometric processing.',
    priority: 'critical',
    effort_estimate: 'weeks',
    trigger_questions: ['high_risk_2'],
    compliance_framework: 'eu_ai_act',
  },
  {
    id: 'highrisk_credit_fairness_audit',
    category: 'high_risk',
    title: 'Audit credit/financial decision fairness',
    description:
      'Conduct fairness audit for creditworthiness decisions. Test for discrimination across protected characteristics. Document bias testing and mitigation measures.',
    priority: 'high',
    effort_estimate: 'weeks',
    trigger_questions: ['high_risk_3'],
    compliance_framework: 'eu_ai_act',
  },
  {
    id: 'highrisk_health_data_security',
    category: 'high_risk',
    title: 'Strengthen health/genetic data protection',
    description:
      'Implement enhanced security for health and genetic data. Ensure GDPR compliance for sensitive personal data. Document data minimization practices.',
    priority: 'high',
    effort_estimate: 'days',
    trigger_questions: ['high_risk_4'],
    compliance_framework: 'eu_ai_act',
  },
  {
    id: 'highrisk_legal_rights_safeguards',
    category: 'high_risk',
    title: 'Establish legal rights protection mechanism',
    description:
      'Create a right to human review for decisions affecting legal rights or essential services. Document appeal procedures. Implement notification of decisions.',
    priority: 'critical',
    effort_estimate: 'weeks',
    trigger_questions: ['high_risk_5'],
    compliance_framework: 'eu_ai_act',
  },

  // TRANSPARENCY REQUIREMENTS
  {
    id: 'transparency_explainability_system',
    category: 'transparency',
    title: 'Implement explainability mechanism',
    description:
      'Make AI decisions understandable to users and stakeholders. Document feature importance, decision drivers, and edge cases. Consider using interpretable models or explainable AI techniques.',
    priority: 'high',
    effort_estimate: 'weeks',
    trigger_questions: ['transparency_1'],
    compliance_framework: 'eu_ai_act',
  },
  {
    id: 'transparency_user_notification',
    category: 'transparency',
    title: 'Implement AI system notification',
    description:
      'Clearly notify users when they are interacting with an AI system. Use prominent, clear language at the point of interaction. Provide opt-out options where feasible.',
    priority: 'high',
    effort_estimate: 'hours',
    trigger_questions: ['transparency_2'],
    compliance_framework: 'eu_ai_act',
  },

  // GOVERNANCE & DOCUMENTATION
  {
    id: 'governance_data_quality_plan',
    category: 'governance',
    title: 'Establish data quality assurance',
    description:
      'Document data governance practices. Implement quality checks, bias testing, and regular audits. Track data lineage and retention policies.',
    priority: 'medium',
    effort_estimate: 'days',
    trigger_questions: ['governance_1'],
    compliance_framework: 'eu_ai_act',
  },
  {
    id: 'governance_risk_documentation',
    category: 'governance',
    title: 'Document risk assessment and mitigation',
    description:
      'Create comprehensive documentation of identified risks and mitigation strategies. Update quarterly based on operational experience. Share with stakeholders.',
    priority: 'high',
    effort_estimate: 'days',
    trigger_questions: ['governance_2'],
    compliance_framework: 'eu_ai_act',
  },
  {
    id: 'governance_human_oversight',
    category: 'governance',
    title: 'Implement human oversight capability',
    description:
      'Establish procedures for human review and override of AI decisions. Train staff on when to intervene. Maintain audit log of interventions.',
    priority: 'high',
    effort_estimate: 'weeks',
    trigger_questions: ['governance_3'],
    compliance_framework: 'eu_ai_act',
  },
];

/**
 * Generate remediation plan based on risk level and specific answers.
 * Returns obligations that apply to the system, prioritized by criticality.
 */
export function generateRemediationPlan(
  riskScore: number,
  riskLevel: RiskLevel,
  responses: AssessmentResponse[]
): RemediationPlan {
  const respondedQuestionIds = new Set(responses.map((r) => r.question_id));

  // Find all obligations triggered by "yes" or high-risk answers
  const applicableObligations = COMPLIANCE_OBLIGATIONS.filter((obligation) => {
    for (const questionId of obligation.trigger_questions) {
      const response = responses.find((r) => r.question_id === questionId);
      if (!response) continue;

      const question = EU_AI_ACT_QUESTIONS.find((q) => q.id === questionId);
      if (!question) continue;

      // Obligation applies if:
      // - For yes_no questions: answer is "yes"
      // - For scale questions: score is high (1-3 = more risk)
      // - For multiple_choice: certain high-risk data types
      if (question.question_type === 'yes_no' && response.answer === 'yes') {
        return true;
      }
      if (question.question_type === 'scale_1_5' && [1, 2, 3].includes(Number(response.answer))) {
        return true;
      }
      if (
        question.question_type === 'multiple_choice' &&
        ['health_data', 'financial_data', 'other_sensitive'].includes(String(response.answer))
      ) {
        return true;
      }
    }
    return false;
  });

  // Sort by priority (critical → high → medium → low)
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  applicableObligations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  // Estimate timeline based on highest effort obligation
  const effortOrder = { hours: 1, days: 7, weeks: 30 };
  const maxEffortDays =
    applicableObligations.length > 0
      ? Math.max(...applicableObligations.map((o) => effortOrder[o.effort_estimate]))
      : 0;
  const timelineWeeks = Math.ceil(maxEffortDays / 7);

  // Generate summary based on risk level
  let summary = '';
  if (riskLevel === 'unacceptable') {
    summary = `CRITICAL: This system contains prohibited practices (${applicableObligations.filter((o) => o.category === 'prohibited').length} issues). Immediate action required to achieve legal compliance.`;
  } else if (riskLevel === 'high') {
    summary = `HIGH RISK: ${applicableObligations.length} compliance obligations identified. Implement mitigations within 4 weeks to reduce risk to acceptable levels.`;
  } else if (riskLevel === 'medium') {
    summary = `MEDIUM RISK: ${applicableObligations.length} compliance improvements recommended. Plan implementation over the next 8 weeks.`;
  } else {
    summary = `LOW RISK: System appears compliant with ${applicableObligations.length} general governance recommendations to maintain compliance.`;
  }

  return {
    risk_level: riskLevel,
    risk_score: riskScore,
    obligations: applicableObligations,
    summary,
    timeline_weeks: timelineWeeks,
  };
}

/**
 * Get a human-readable timeline estimate for an obligation.
 */
export function getTimelineEstimate(effort: 'hours' | 'days' | 'weeks'): string {
  const estimates = {
    hours: '1 business day',
    days: '2-5 business days',
    weeks: '2-4 weeks',
  };
  return estimates[effort];
}

/**
 * Get Tailwind color class for priority level.
 */
export function getPriorityColor(priority: 'critical' | 'high' | 'medium' | 'low'): string {
  const colors = {
    critical: 'text-red-300 bg-red-950/50 border-red-800/60',
    high: 'text-orange-300 bg-orange-950/50 border-orange-800/60',
    medium: 'text-amber-300 bg-amber-950/50 border-amber-800/60',
    low: 'text-green-300 bg-green-950/50 border-green-800/60',
  };
  return colors[priority];
}
