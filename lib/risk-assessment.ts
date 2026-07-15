/**
 * Risk Assessment Logic — EU AI Act Compliance
 *
 * Classifies AI systems into risk categories based on:
 * 1. System type (LLM, biometric, classification, etc.)
 * 2. Data sensitivity (personal data, special categories, etc.)
 * 3. Use case (employment, law enforcement, education, etc.)
 * 4. Impact scope (individual, group, systemic)
 */

export type RiskLevel = 'unacceptable' | 'high' | 'medium' | 'low';

export interface RiskAssessmentInput {
  systemType: string;
  dataCategories: string[];
  useCases: string[];
  autonomyLevel: 'high' | 'medium' | 'low';
  affectsRights: boolean;
  publicFacing: boolean;
}

export interface RiskAssessmentResult {
  riskLevel: RiskLevel;
  riskScore: number;
  reasoning: string[];
  obligations: string[];
}

/**
 * Prohibited use cases (automatic unacceptable risk)
 */
const UNACCEPTABLE_USE_CASES = [
  'real_time_biometric_identification_public',
  'emotion_recognition_employment',
  'social_credit_scoring',
  'psychological_manipulation',
  'mass_surveillance_targeting',
];

/**
 * High-risk use cases (weight: 3)
 */
const HIGH_RISK_USE_CASES = [
  'employment_decisions',
  'law_enforcement',
  'criminal_justice',
  'healthcare_diagnosis',
  'education_grading',
  'financial_credit',
  'immigration_decisions',
  'biometric_identification',
];

/**
 * Sensitive data categories (weight: 2 per category)
 */
const SENSITIVE_DATA = [
  'racial_ethnic_origin',
  'political_opinions',
  'religious_beliefs',
  'trade_union_membership',
  'genetic_data',
  'biometric_data',
  'health_data',
  'sex_life_data',
];

/**
 * Calculate risk score (0-100)
 * Score >= 70: high risk
 * Score >= 40: limited risk
 * Score < 40: minimal risk
 */
export function assessRisk(input: RiskAssessmentInput): RiskAssessmentResult {
  let score = 0;
  const reasoning: string[] = [];
  const obligations: string[] = [];

  // 1. Check for unacceptable use cases (automatic fail)
  const hasUnacceptable = input.useCases.some(use =>
    UNACCEPTABLE_USE_CASES.includes(use)
  );

  if (hasUnacceptable) {
    return {
      riskLevel: 'unacceptable',
      riskScore: 100,
      reasoning: [
        'System use case is prohibited under EU AI Act',
        'Implementation or deployment of this use case is not permitted',
      ],
      obligations: [
        'HALT deployment immediately',
        'Consult with legal/compliance team',
        'Review EU AI Act prohibited practices (Article 5)',
      ],
    };
  }

  // 2. Check high-risk use cases (base: 50 points)
  const hasHighRiskUseCase = input.useCases.some(use =>
    HIGH_RISK_USE_CASES.includes(use)
  );

  if (hasHighRiskUseCase) {
    score += 50;
    reasoning.push('System is deployed in a high-risk use case');
  }

  // 3. Sensitive data categories (5 points each)
  const sensitiveCount = input.dataCategories.filter(cat =>
    SENSITIVE_DATA.includes(cat)
  ).length;

  if (sensitiveCount > 0) {
    score += sensitiveCount * 5;
    reasoning.push(
      `Processes ${sensitiveCount} sensitive data categories (GDPR special categories)`
    );
  }

  // 4. Affects fundamental rights (10 points)
  if (input.affectsRights) {
    score += 10;
    reasoning.push('System significantly affects individuals\' fundamental rights');
  }

  // 5. High autonomy (10 points)
  if (input.autonomyLevel === 'high') {
    score += 10;
    reasoning.push('System operates with high autonomy (limited human oversight)');
  }

  // 6. Public-facing (5 points)
  if (input.publicFacing) {
    score += 5;
    reasoning.push('System is deployed in public-facing context');
  }

  // 7. LLM or generative AI (5 points for transparency risk)
  if (['large_language_model', 'generative_ai'].includes(input.systemType)) {
    score += 5;
    reasoning.push('Large Language Model / Generative AI requires transparency measures');
  }

  // Clamp score to 0-100
  score = Math.min(100, Math.max(0, score));

  // Determine risk level
  let riskLevel: RiskLevel;
  if (score >= 70) {
    riskLevel = 'high';
  } else if (score >= 40) {
    riskLevel = 'medium';
  } else {
    riskLevel = 'low';
  }

  // Generate obligations based on risk level
  if (riskLevel === 'high') {
    obligations.push(
      'Conduct detailed impact assessment (DPIA)',
      'Implement risk mitigation measures',
      'Maintain detailed audit logs',
      'Establish human oversight mechanisms',
      'Regular bias and performance monitoring',
      'Transparency statements to affected individuals',
      'Third-party audit recommended'
    );
  } else if (riskLevel === 'medium') {
    obligations.push(
      'Implement transparency measures',
      'Document AI system capabilities and limitations',
      'Establish complaint handling mechanism',
      'Monitor for performance degradation',
      'Maintain operation logs'
    );
  } else {
    obligations.push(
      'General compliance monitoring',
      'Document system purpose and performance',
      'Be prepared to explain decisions if questioned'
    );
  }

  return {
    riskLevel,
    riskScore: score,
    reasoning,
    obligations,
  };
}

/**
 * Get system type options for UI
 */
export const SYSTEM_TYPE_OPTIONS = [
  { value: 'large_language_model', label: 'Large Language Model (e.g., ChatGPT)' },
  { value: 'generative_ai', label: 'Generative AI (image, code, etc.)' },
  { value: 'classification_system', label: 'Classification System (risk scoring, categorization)' },
  { value: 'recommendation_system', label: 'Recommendation System' },
  { value: 'computer_vision', label: 'Computer Vision (image/video analysis)' },
  { value: 'biometric_system', label: 'Biometric System (facial recognition, etc.)' },
  { value: 'decision_support', label: 'Decision Support System' },
  { value: 'other', label: 'Other' },
];

/**
 * Get use case options for UI
 */
export const USE_CASE_OPTIONS = [
  { value: 'customer_service', label: 'Customer Service / Support' },
  { value: 'content_moderation', label: 'Content Moderation' },
  { value: 'employment_decisions', label: 'Employment (Hiring, Evaluation, Termination)' },
  { value: 'law_enforcement', label: 'Law Enforcement' },
  { value: 'criminal_justice', label: 'Criminal Justice / Sentencing' },
  { value: 'healthcare_diagnosis', label: 'Healthcare (Diagnosis, Treatment)' },
  { value: 'education_grading', label: 'Education (Assessment, Grading)' },
  { value: 'financial_credit', label: 'Financial (Credit Decisions, Fraud Detection)' },
  { value: 'immigration_decisions', label: 'Immigration / Border Control' },
  { value: 'biometric_identification', label: 'Biometric Identification / Verification' },
  { value: 'marketing_personalization', label: 'Marketing / Personalization' },
  { value: 'research', label: 'Research / Academic' },
  { value: 'internal_operations', label: 'Internal Operations (Efficiency, Analytics)' },
  { value: 'other', label: 'Other' },
];

/**
 * Get data category options for UI
 */
export const DATA_CATEGORY_OPTIONS = [
  { value: 'personal_data', label: 'Personal Data (name, ID, contact)' },
  { value: 'racial_ethnic_origin', label: 'Racial / Ethnic Origin' },
  { value: 'political_opinions', label: 'Political Opinions' },
  { value: 'religious_beliefs', label: 'Religious Beliefs' },
  { value: 'trade_union_membership', label: 'Trade Union Membership' },
  { value: 'genetic_data', label: 'Genetic Data' },
  { value: 'biometric_data', label: 'Biometric Data (facial recognition, fingerprints)' },
  { value: 'health_data', label: 'Health Data' },
  { value: 'sex_life_data', label: 'Sex Life / Sexual Orientation Data' },
  { value: 'financial_data', label: 'Financial Data (transactions, credit)' },
  { value: 'behavioral_data', label: 'Behavioral Data (tracking, profiling)' },
  { value: 'location_data', label: 'Location Data' },
];

/**
 * Get autonomy level options
 */
export const AUTONOMY_LEVEL_OPTIONS = [
  {
    value: 'high',
    label: 'High Autonomy',
    description: 'System makes decisions with minimal human oversight',
  },
  {
    value: 'medium',
    label: 'Medium Autonomy',
    description: 'Human reviews system recommendations before decision',
  },
  {
    value: 'low',
    label: 'Low Autonomy',
    description: 'System provides information only; human makes final decision',
  },
];

export function getRiskLevelLabel(riskLevel: RiskLevel): string {
  const labels: Record<RiskLevel, string> = {
    unacceptable: 'Prohibited',
    high: 'High Risk',
    medium: 'Medium Risk',
    low: 'Low Risk',
  };
  return labels[riskLevel] || 'Unknown';
}

export function getRiskLevelColor(riskLevel: RiskLevel): string {
  const colors: Record<RiskLevel, string> = {
    unacceptable: '#dc2626',
    high: '#f97316',
    medium: '#eab308',
    low: '#22c55e',
  };
  return colors[riskLevel] || '#6b7280';
}

export interface AssessmentQuestion {
  id: string;
  category: string;
  question: string;
  description: string;
  risk_indicator: RiskLevel;
}

export function getAssessmentQuestions(): AssessmentQuestion[] {
  return [
    {
      id: 'q1-prohibited-biometric',
      category: 'Fundamental Rights',
      question: 'Does your system perform real-time remote biometric identification?',
      description: 'Real-time identification in public spaces',
      risk_indicator: 'unacceptable',
    },
    {
      id: 'q2-emotion-recognition',
      category: 'Fundamental Rights',
      question: 'Does your system recognize or infer emotions or intentions?',
      description: 'Emotion or psychological analysis',
      risk_indicator: 'high',
    },
    {
      id: 'q3-social-scoring',
      category: 'Fundamental Rights',
      question: 'Does your system create social credit scores or rankings?',
      description: 'Systematic social or behavioral scoring',
      risk_indicator: 'unacceptable',
    },
    {
      id: 'q4-credit-decision',
      category: 'High-Risk Use Cases',
      question: 'Is the system used for credit or financial decisions?',
      description: 'Loan approval, insurance pricing, or financial eligibility',
      risk_indicator: 'high',
    },
    {
      id: 'q5-recruitment',
      category: 'High-Risk Use Cases',
      question: 'Is the system used for employment decisions?',
      description: 'Hiring, promotion, or termination decisions',
      risk_indicator: 'high',
    },
    {
      id: 'q6-education',
      category: 'High-Risk Use Cases',
      question: 'Is the system used for education or training assessment?',
      description: 'Student grading, educational assessment, or school admission',
      risk_indicator: 'high',
    },
    {
      id: 'q7-law-enforcement',
      category: 'High-Risk Use Cases',
      question: 'Is the system used by law enforcement or criminal justice?',
      description: 'Policing, crime prediction, or court decisions',
      risk_indicator: 'high',
    },
    {
      id: 'q8-sensitive-data',
      category: 'Data Sensitivity',
      question: 'Does your system process special category (sensitive) data?',
      description: 'Race, ethnicity, political views, religious beliefs, health, sex life, etc.',
      risk_indicator: 'high',
    },
    {
      id: 'q9-autonomy-high',
      category: 'System Autonomy',
      question: 'Does the system make decisions with minimal human involvement?',
      description: 'Fully autonomous decision-making without human review',
      risk_indicator: 'high',
    },
    {
      id: 'q10-rights-impact',
      category: 'Impact Scope',
      question: 'Can the system significantly affect fundamental rights?',
      description: 'Impact on privacy, freedoms, or legal status',
      risk_indicator: 'high',
    },
    {
      id: 'q11-personal-data',
      category: 'Data Sensitivity',
      question: 'Does your system process personal data?',
      description: 'Any identifiable personal information',
      risk_indicator: 'medium',
    },
    {
      id: 'q12-public-facing',
      category: 'Deployment Context',
      question: 'Is the system deployed in public-facing context?',
      description: 'Directly accessible to citizens or affected individuals',
      risk_indicator: 'medium',
    },
    {
      id: 'q13-llm-generative',
      category: 'System Type',
      question: 'Is the system a Large Language Model or Generative AI?',
      description: 'ChatGPT-like, code generation, image generation, etc.',
      risk_indicator: 'medium',
    },
    {
      id: 'q14-recommendations',
      category: 'System Type',
      question: 'Does your system provide personalized recommendations?',
      description: 'Content, product, or service recommendations to individuals',
      risk_indicator: 'low',
    },
    {
      id: 'q15-transparency',
      category: 'Mitigating Factors',
      question: 'Does your system provide transparency to affected individuals?',
      description: 'Users are informed they interact with AI and can understand decisions',
      risk_indicator: 'low',
    },
    {
      id: 'q16-oversight',
      category: 'Mitigating Factors',
      question: 'Is there human review or override capability?',
      description: 'Human decision-makers can review and override system decisions',
      risk_indicator: 'low',
    },
  ];
}
