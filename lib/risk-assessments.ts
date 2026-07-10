/** Shared vocabulary for EU AI Act risk assessments. */

export const RISK_LEVELS = ['low', 'medium', 'high', 'unacceptable'] as const;
export type RiskLevel = (typeof RISK_LEVELS)[number];

export const ASSESSMENT_STATUSES = ['draft', 'in_review', 'finalized'] as const;
export type AssessmentStatus = (typeof ASSESSMENT_STATUSES)[number];

/** EU AI Act risk classification questionnaire. */
export interface RiskQuestion {
  id: string;
  category: 'fundamental_rights' | 'safety' | 'bias_discrimination' | 'transparency' | 'accountability';
  question: string;
  description?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export const EU_AI_ACT_QUESTIONS: RiskQuestion[] = [
  {
    id: 'fr-1',
    category: 'fundamental_rights',
    question: 'Does this system process personal data of EU residents?',
    severity: 'high',
  },
  {
    id: 'fr-2',
    category: 'fundamental_rights',
    question: 'Could this system impact fundamental rights (privacy, freedom of expression, non-discrimination)?',
    severity: 'critical',
  },
  {
    id: 'fr-3',
    category: 'fundamental_rights',
    question: 'Is there a legal basis for processing personal data under GDPR?',
    severity: 'high',
  },
  {
    id: 'safety-1',
    category: 'safety',
    question: 'Could the system cause physical harm to humans?',
    severity: 'critical',
  },
  {
    id: 'safety-2',
    category: 'safety',
    question: 'Is the system used for safety-critical decisions (e.g., healthcare, autonomous vehicles)?',
    severity: 'critical',
  },
  {
    id: 'safety-3',
    category: 'safety',
    question: 'Does the system have failsafes and human oversight mechanisms?',
    severity: 'high',
  },
  {
    id: 'bias-1',
    category: 'bias_discrimination',
    question: 'Could the system discriminate against protected groups?',
    severity: 'critical',
  },
  {
    id: 'bias-2',
    category: 'bias_discrimination',
    question: 'Has the system been tested for bias across demographic groups?',
    severity: 'high',
  },
  {
    id: 'bias-3',
    category: 'bias_discrimination',
    question: 'Are training data and model decisions documented for bias audit?',
    severity: 'high',
  },
  {
    id: 'transparency-1',
    category: 'transparency',
    question: 'Is it disclosed to users that they are interacting with an AI system?',
    severity: 'high',
  },
  {
    id: 'transparency-2',
    category: 'transparency',
    question: 'Can you explain how the system makes decisions affecting individuals?',
    severity: 'high',
  },
  {
    id: 'accountability-1',
    category: 'accountability',
    question: 'Is there documented ownership and responsibility for the system?',
    severity: 'medium',
  },
  {
    id: 'accountability-2',
    category: 'accountability',
    question: 'Is there a process for individuals to challenge AI decisions?',
    severity: 'high',
  },
  {
    id: 'accountability-3',
    category: 'accountability',
    question: 'Is there a documented impact assessment or audit trail?',
    severity: 'medium',
  },
];

/** Calculate risk level from questionnaire answers. */
export function calculateRiskLevel(answers: Record<string, boolean>): {
  level: RiskLevel;
  score: number;
  reasoning: string[];
} {
  const criticalYes = EU_AI_ACT_QUESTIONS.filter(
    (q) => q.severity === 'critical' && answers[q.id]
  ).length;
  const highYes = EU_AI_ACT_QUESTIONS.filter(
    (q) => q.severity === 'high' && answers[q.id]
  ).length;

  const reasoning: string[] = [];
  let level: RiskLevel = 'low';
  let score = 0;

  if (criticalYes >= 1) {
    level = 'unacceptable';
    score = 100;
    reasoning.push(`${criticalYes} critical risk factor(s) identified`);
  } else if (highYes >= 4) {
    level = 'high';
    score = 75;
    reasoning.push(`${highYes} high-severity risk factor(s) identified`);
  } else if (highYes >= 2) {
    level = 'medium';
    score = 50;
    reasoning.push(`${highYes} medium-to-high risk factor(s) identified`);
  } else if (highYes >= 1) {
    level = 'medium';
    score = 40;
    reasoning.push('At least one significant risk factor identified');
  } else {
    level = 'low';
    score = 20;
    reasoning.push('Low-risk profile based on questionnaire responses');
  }

  return { level, score, reasoning };
}
