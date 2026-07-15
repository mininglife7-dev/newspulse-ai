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
