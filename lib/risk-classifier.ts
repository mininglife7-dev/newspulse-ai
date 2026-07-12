/**
 * EU AI Act Risk Classification Engine
 * Deterministic classification of AI systems based on use case and characteristics
 *
 * Risk levels:
 * - prohibited: System use is banned under EU AI Act
 * - high: Mandatory documentation, testing, monitoring, human oversight
 * - limited: Transparency requirements, user disclosure
 * - minimal: General compliance, documentation
 */

export type RiskLevel = 'prohibited' | 'high' | 'limited' | 'minimal';

export interface RiskClassificationQuestion {
  id: string;
  question: string;
  hint: string;
  type: 'yes_no' | 'select';
  options?: string[];
}

export interface ClassificationResult {
  riskLevel: RiskLevel;
  riskScore: number; // 0-100
  rationale: string;
  applicableArticles: string[];
  obligations: string[];
  controlsRequired: string[];
  reviewSchedule: 'annual' | 'biannual' | 'quarterly' | 'monthly';
}

export interface RiskAssessmentAnswers {
  // Use case questions
  useCaseCategory: string;
  isHighRiskUseCase: boolean;

  // Data & bias questions
  processesPersonalData: boolean;
  includesBiometricData: boolean;
  hasBiasMitigation: boolean;

  // Human oversight
  hasHumanOversight: boolean;
  humanCanOverride: boolean;

  // Transparency
  usersAreInformed: boolean;
  systemIsExplainable: boolean;

  // Scope & impact
  affectsLargePopulation: boolean;
  makesAutonomousDecisions: boolean;
  affectsVulnerableGroups: boolean;
}

/**
 * High-Risk AI Act Use Cases (Annex III of EU AI Act)
 * Systems in these categories require mandatory compliance measures
 */
const HIGH_RISK_USE_CASES = [
  'biometric_identification',
  'emotion_recognition',
  'employment_recruitment',
  'employment_evaluation',
  'creditworthiness_assessment',
  'criminal_risk_assessment',
  'law_enforcement',
  'border_control',
  'critical_infrastructure',
  'essential_services_management',
];

/**
 * Prohibited use cases under EU AI Act
 */
const PROHIBITED_USE_CASES = [
  'social_credit_scoring',
  'mass_surveillance_targeting',
  'non_consensual_biometric_extraction',
  'real_time_biometric_identification',
  'subliminal_manipulation',
  'exploitation_of_vulnerabilities',
];

/**
 * EU AI Act Articles mapping to risk levels
 */
const ARTICLES_BY_RISK: Record<RiskLevel, string[]> = {
  prohibited: [
    'Article 5 - Prohibited AI Practices',
  ],
  high: [
    'Article 6 - High-Risk AI Systems',
    'Article 8 - Risk assessment',
    'Article 9 - Risk management system',
    'Article 10 - Data governance',
    'Article 11 - Data quality requirements',
    'Article 12 - Human oversight',
    'Article 13 - Accuracy, robustness, cybersecurity',
    'Article 14 - Logging and documentation',
    'Article 15 - Transparency and information',
    'Article 17 - Record keeping',
    'Article 22 - Conformity assessment',
  ],
  limited: [
    'Article 52 - Transparency obligations',
    'Article 53 - AI-generated content disclosure',
  ],
  minimal: [
    'Article 6(2) - General compliance requirements',
  ],
};

/**
 * Default obligations for each risk level
 */
const OBLIGATIONS_BY_RISK: Record<RiskLevel, string[]> = {
  prohibited: [
    'System must not be deployed',
    'Review use case against Article 5 prohibited practices',
    'Implement alternative non-AI solution',
  ],
  high: [
    'Conduct and document risk assessment',
    'Implement risk management system',
    'Implement data governance procedures',
    'Conduct bias and fairness testing',
    'Implement human oversight procedures',
    'Maintain audit logs of all decisions',
    'Conduct conformity assessment before deployment',
    'Register system in EU database',
    'Implement cybersecurity measures',
    'Train staff on system operation and risks',
    'Establish incident reporting procedures',
    'Schedule quarterly compliance reviews',
  ],
  limited: [
    'Document transparency requirements',
    'Implement user disclosure of AI use',
    'Maintain records of AI use cases',
    'Train staff on transparency obligations',
    'Schedule annual compliance review',
  ],
  minimal: [
    'Document AI system purpose and scope',
    'Maintain basic compliance records',
    'Perform annual self-assessment',
  ],
};

const CONTROLS_BY_RISK: Record<RiskLevel, string[]> = {
  prohibited: [],
  high: [
    'Risk management system',
    'Data quality controls',
    'Model validation testing',
    'Bias detection and mitigation',
    'Human oversight workflow',
    'Audit logging system',
    'Incident response procedures',
    'Staff training program',
    'Documentation repository',
    'Monitoring dashboard',
  ],
  limited: [
    'Transparency notices',
    'User disclosure procedures',
    'Documentation of AI logic',
    'User feedback mechanism',
  ],
  minimal: [
    'Purpose documentation',
    'Basic record keeping',
  ],
};

/**
 * Classify an AI system based on assessment answers
 * Returns deterministic, traceable classification
 */
export function classifyRiskLevel(
  answers: RiskAssessmentAnswers
): ClassificationResult {
  let riskScore = 0;
  const riskFactors: string[] = [];

  // Check for prohibited use cases first
  if (PROHIBITED_USE_CASES.includes(answers.useCaseCategory)) {
    return {
      riskLevel: 'prohibited',
      riskScore: 100,
      rationale: `Use case "${answers.useCaseCategory}" is explicitly prohibited under Article 5 of the EU AI Act.`,
      applicableArticles: ARTICLES_BY_RISK.prohibited,
      obligations: OBLIGATIONS_BY_RISK.prohibited,
      controlsRequired: CONTROLS_BY_RISK.prohibited,
      reviewSchedule: 'monthly',
    };
  }

  // Check for high-risk use cases (highest weight factor - ensures minimum high risk)
  let isHighRiskUseCase = false;
  if (HIGH_RISK_USE_CASES.includes(answers.useCaseCategory) || answers.isHighRiskUseCase) {
    riskScore = 65; // Start at high-risk baseline
    isHighRiskUseCase = true;
    riskFactors.push('High-risk use case category');
  }

  // Assess data sensitivity
  if (answers.processesPersonalData) {
    riskScore += 10;
    riskFactors.push('Processes personal data');
  }
  if (answers.includesBiometricData) {
    riskScore += 20;
    riskFactors.push('Includes biometric data');
  }

  // Assess decision impact
  if (answers.makesAutonomousDecisions) {
    riskScore += 15;
    riskFactors.push('Makes autonomous decisions');
  }
  if (answers.affectsLargePopulation) {
    riskScore += 10;
    riskFactors.push('Affects large population');
  }
  if (answers.affectsVulnerableGroups) {
    riskScore += 15;
    riskFactors.push('Affects vulnerable groups');
  }

  // Assess mitigations (apply controlled bonuses)
  if (!answers.hasHumanOversight) {
    riskScore += 15;
    riskFactors.push('No human oversight mechanism');
  } else if (!answers.humanCanOverride) {
    riskScore += 7;
    riskFactors.push('Human oversight present but cannot override');
  } else {
    riskScore -= 5; // Moderate mitigation bonus (not too strong for high-risk)
    riskFactors.push('Human oversight with override capability');
  }

  if (!answers.systemIsExplainable) {
    riskScore += 12;
    riskFactors.push('System decisions are not explainable');
  } else {
    riskScore -= 4; // Moderate mitigation bonus
    riskFactors.push('System provides explanations');
  }

  if (!answers.usersAreInformed) {
    riskScore += 8;
    riskFactors.push('Users not informed of AI use');
  } else {
    riskScore -= 3; // Moderate mitigation bonus
    riskFactors.push('Users informed of AI use');
  }

  if (!answers.hasBiasMitigation) {
    riskScore += 12;
    riskFactors.push('No documented bias mitigation');
  } else {
    riskScore -= 4; // Moderate mitigation bonus
    riskFactors.push('Bias mitigation measures in place');
  }

  // For high-risk use cases, ensure they don't drop below high-risk threshold
  if (isHighRiskUseCase && riskScore < 65) {
    riskScore = 65;
  }

  // Clamp score to 0-100
  riskScore = Math.max(0, Math.min(100, riskScore));

  // Determine risk level based on score
  let riskLevel: RiskLevel;
  if (riskScore >= 65) {
    riskLevel = 'high';
  } else if (riskScore >= 35) {
    riskLevel = 'limited';
  } else {
    riskLevel = 'minimal';
  }

  const rationale = `Classification based on: ${riskFactors.join(', ')}. Risk score: ${riskScore}/100.`;

  return {
    riskLevel,
    riskScore,
    rationale,
    applicableArticles: ARTICLES_BY_RISK[riskLevel],
    obligations: OBLIGATIONS_BY_RISK[riskLevel],
    controlsRequired: CONTROLS_BY_RISK[riskLevel],
    reviewSchedule: getReviewSchedule(riskLevel),
  };
}

/**
 * Get recommended review schedule based on risk level
 */
function getReviewSchedule(
  riskLevel: RiskLevel
): 'annual' | 'biannual' | 'quarterly' | 'monthly' {
  switch (riskLevel) {
    case 'prohibited':
      return 'monthly'; // Should not be in use
    case 'high':
      return 'quarterly';
    case 'limited':
      return 'biannual';
    case 'minimal':
      return 'annual';
  }
}

/**
 * Get the risk classification questionnaire
 */
export function getRiskAssessmentQuestionnaire(): RiskClassificationQuestion[] {
  return [
    {
      id: 'use_case_category',
      question: 'What is the primary use case for this AI system?',
      hint: 'Select the category that best describes how the system will be used',
      type: 'select',
      options: [
        'general_purpose',
        'biometric_identification',
        'emotion_recognition',
        'employment_recruitment',
        'employment_evaluation',
        'creditworthiness_assessment',
        'criminal_risk_assessment',
        'law_enforcement',
        'border_control',
        'critical_infrastructure',
        'essential_services_management',
        'content_moderation',
        'recommendation_system',
        'other',
      ],
    },
    {
      id: 'is_high_risk',
      question: 'Does this system perform any of the high-risk functions listed in Annex III?',
      hint: 'Check if the system evaluates individuals for employment, credit, law enforcement, or similar decisions',
      type: 'yes_no',
    },
    {
      id: 'personal_data',
      question: 'Does this system process personal data?',
      hint: 'Personal data includes names, IDs, contact info, or any identifying information',
      type: 'yes_no',
    },
    {
      id: 'biometric_data',
      question: 'Does this system process biometric data (facial recognition, fingerprints, voice)?',
      hint: 'Biometric data is any data used to identify individuals by physical characteristics',
      type: 'yes_no',
    },
    {
      id: 'bias_mitigation',
      question: 'Does this system have documented bias testing and mitigation?',
      hint: 'Bias mitigation includes fairness testing, bias detection, and mitigation strategies',
      type: 'yes_no',
    },
    {
      id: 'human_oversight',
      question: 'Is there a human in the loop to review and approve decisions?',
      hint: 'Human oversight means a person can review decisions before they are final',
      type: 'yes_no',
    },
    {
      id: 'human_override',
      question: 'Can humans override or reject the AI system\'s decisions?',
      hint: 'Override capability means humans can change the system\'s decision',
      type: 'yes_no',
    },
    {
      id: 'transparency',
      question: 'Are users informed when they interact with an AI system?',
      hint: 'Users should know they are interacting with AI, not human decision-makers',
      type: 'yes_no',
    },
    {
      id: 'explainability',
      question: 'Can the system explain why it made a particular decision?',
      hint: 'Explainability means the system can provide reasons for its decisions',
      type: 'yes_no',
    },
    {
      id: 'large_population',
      question: 'Does this system affect a large population (1000+ individuals)?',
      hint: 'Large-scale deployment increases risk and compliance requirements',
      type: 'yes_no',
    },
    {
      id: 'autonomous_decisions',
      question: 'Does the system make autonomous decisions without human involvement?',
      hint: 'Autonomous means the system acts without prior human authorization for each decision',
      type: 'yes_no',
    },
    {
      id: 'vulnerable_groups',
      question: 'Does this system affect vulnerable groups (children, disabled, elderly, etc.)?',
      hint: 'Systems affecting vulnerable groups require additional safeguards',
      type: 'yes_no',
    },
  ];
}
