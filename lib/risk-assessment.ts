/** Risk assessment types and scoring logic for EU AI Act compliance. */

export const RISK_LEVELS = ['low', 'medium', 'high', 'unacceptable'] as const;
export type RiskLevel = (typeof RISK_LEVELS)[number];

export const ASSESSMENT_STATUSES = ['draft', 'in_review', 'finalized'] as const;
export type AssessmentStatus = (typeof ASSESSMENT_STATUSES)[number];

export const ASSESSMENT_TYPES = ['eu_ai_act', 'iso_42001', 'custom'] as const;
export type AssessmentType = (typeof ASSESSMENT_TYPES)[number];

export const QUESTION_TYPES = ['yes_no', 'multiple_choice', 'text', 'scale_1_5'] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

export interface AssessmentQuestion {
  id: string;
  category: string; // prohibited_practices, high_risk, transparency, general
  question_text: string;
  question_type: QuestionType;
  help_text?: string;
  options?: string[]; // for multiple_choice
  scoring?: Record<string, number>; // answer → score
  required: boolean;
}

export interface AssessmentResponse {
  question_id: string;
  answer: string | number | boolean;
  answered_at: string;
}

export interface RiskAssessmentData {
  assessment_type: AssessmentType;
  responses: AssessmentResponse[];
  risk_score?: number;
  risk_level?: RiskLevel;
}

/**
 * EU AI Act Risk Assessment Questionnaire
 * Based on EU AI Act Annex III (prohibited practices) and Annex II (high-risk systems)
 */
export const EU_AI_ACT_QUESTIONS: AssessmentQuestion[] = [
  // Prohibited Practices (Section 1)
  {
    id: 'prohibited_1',
    category: 'prohibited_practices',
    question_text: 'Does this AI system use subliminal or deceptive manipulation techniques?',
    question_type: 'yes_no',
    help_text: 'Subliminal = below conscious awareness; deceptive = misleading to users',
    required: true,
    scoring: { 'yes': 100, 'no': 0 },
  },
  {
    id: 'prohibited_2',
    category: 'prohibited_practices',
    question_text:
      'Does this system exploit vulnerabilities of a specific group (children, elderly, disabled)?',
    question_type: 'yes_no',
    required: true,
    scoring: { 'yes': 100, 'no': 0 },
  },
  {
    id: 'prohibited_3',
    category: 'prohibited_practices',
    question_text: 'Does this system perform social scoring based on personal conduct?',
    question_type: 'yes_no',
    help_text: 'Social scoring = rating individuals based on behavior or personal characteristics',
    required: true,
    scoring: { 'yes': 100, 'no': 0 },
  },

  // High-Risk System Indicators (Section 2)
  {
    id: 'high_risk_1',
    category: 'high_risk',
    question_text: 'Does this system make decisions affecting employment or labor conditions?',
    question_type: 'yes_no',
    help_text: 'E.g., hiring, firing, scheduling, performance monitoring',
    required: true,
    scoring: { 'yes': 75, 'no': 0 },
  },
  {
    id: 'high_risk_2',
    category: 'high_risk',
    question_text: 'Does this system process personal biometric data for identification?',
    question_type: 'yes_no',
    help_text: 'E.g., facial recognition, fingerprint scanning',
    required: true,
    scoring: { 'yes': 80, 'no': 0 },
  },
  {
    id: 'high_risk_3',
    category: 'high_risk',
    question_text: 'Does this system access personal data to evaluate creditworthiness?',
    question_type: 'yes_no',
    help_text: 'Loan decisions, insurance pricing, credit ratings',
    required: true,
    scoring: { 'yes': 75, 'no': 0 },
  },
  {
    id: 'high_risk_4',
    category: 'high_risk',
    question_text: 'Does this system access health, biometric, or genetic data?',
    question_type: 'yes_no',
    required: true,
    scoring: { 'yes': 70, 'no': 0 },
  },
  {
    id: 'high_risk_5',
    category: 'high_risk',
    question_text:
      'Does this system determine legal rights or access to essential public services?',
    question_type: 'yes_no',
    help_text: 'E.g., asylum, welfare, emergency services',
    required: true,
    scoring: { 'yes': 85, 'no': 0 },
  },

  // Transparency and Explainability (Section 3)
  {
    id: 'transparency_1',
    category: 'transparency',
    question_text: 'Can users understand how this system makes decisions?',
    question_type: 'scale_1_5',
    help_text: '1 = completely opaque; 5 = fully explainable',
    required: true,
    scoring: { '1': 80, '2': 60, '3': 40, '4': 20, '5': 0 },
  },
  {
    id: 'transparency_2',
    category: 'transparency',
    question_text: 'Are users notified when they interact with an AI system?',
    question_type: 'yes_no',
    required: true,
    scoring: { 'no': 50, 'yes': 0 },
  },

  // Data Quality and Governance (Section 4)
  {
    id: 'governance_1',
    category: 'general',
    question_text: 'What is the primary data type processed by this system?',
    question_type: 'multiple_choice',
    options: ['personal_data', 'financial_data', 'health_data', 'other_sensitive', 'public_data'],
    required: true,
    scoring: {
      personal_data: 40,
      financial_data: 50,
      health_data: 80,
      other_sensitive: 60,
      public_data: 10,
    },
  },
  {
    id: 'governance_2',
    category: 'general',
    question_text:
      'Is there a documented risk assessment and mitigation strategy for this system?',
    question_type: 'yes_no',
    required: true,
    scoring: { 'no': 30, 'yes': 0 },
  },
  {
    id: 'governance_3',
    category: 'general',
    question_text: 'Is there human oversight capability to halt or override this system?',
    question_type: 'yes_no',
    required: true,
    scoring: { 'no': 40, 'yes': 0 },
  },
];

/**
 * Calculate overall risk score from assessment responses.
 * Returns score 0-100 and corresponding risk level.
 */
export function calculateRiskScore(responses: AssessmentResponse[]): {
  score: number;
  level: RiskLevel;
} {
  let totalScore = 0;
  let responseCount = 0;

  for (const response of responses) {
    const question = EU_AI_ACT_QUESTIONS.find((q) => q.id === response.question_id);
    if (!question || !question.scoring) continue;

    const answerKey = String(response.answer);
    const score = question.scoring[answerKey] ?? 0;
    totalScore += score;
    responseCount += 1;
  }

  const avgScore = responseCount > 0 ? totalScore / responseCount : 0;

  let level: RiskLevel = 'low';
  if (avgScore >= 75) level = 'unacceptable';
  else if (avgScore >= 60) level = 'high';
  else if (avgScore >= 30) level = 'medium';
  else level = 'low';

  return { score: Math.round(avgScore), level };
}

export interface ProgressSummary {
  total_questions: number;
  answered_questions: number;
  progress_percentage: number;
  next_unanswered_question_id?: string;
}

/**
 * Get assessment progress summary.
 */
export function getProgressSummary(responses: AssessmentResponse[]): ProgressSummary {
  const answered_ids = new Set(responses.map((r) => r.question_id));
  const answered_questions = answered_ids.size;
  const total_questions = EU_AI_ACT_QUESTIONS.length;
  const progress_percentage = Math.round((answered_questions / total_questions) * 100);

  const next_unanswered = EU_AI_ACT_QUESTIONS.find((q) => !answered_ids.has(q.id));

  return {
    total_questions,
    answered_questions,
    progress_percentage,
    next_unanswered_question_id: next_unanswered?.id,
  };
}
