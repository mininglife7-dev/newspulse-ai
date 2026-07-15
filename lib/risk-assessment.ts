/**
 * Risk Assessment Engine
 * EU AI Act compliance risk classification
 *
 * Based on EU AI Act Annex III (high-risk AI systems)
 * Classifies systems into four tiers:
 * - unacceptable: Prohibited under EU AI Act
 * - high: Significant risk to fundamental rights
 * - medium: Some risk, transparency requirements
 * - low: Minimal risk or general-purpose AI
 */

export type RiskLevel = 'unacceptable' | 'high' | 'medium' | 'low';
export type RiskCategory =
  | 'biometric-identification'
  | 'emotion-recognition'
  | 'social-scoring'
  | 'credit-scoring'
  | 'recruitment'
  | 'education'
  | 'employment'
  | 'law-enforcement'
  | 'critical-infrastructure'
  | 'general-purpose'
  | 'other';

export interface AssessmentAnswer {
  questionId: string;
  value: boolean | string | number | string[];
  riskWeight?: number;
}

export interface RiskAssessmentResult {
  riskLevel: RiskLevel;
  riskScore: number; // 0-100
  score: {
    prohibitedIndicators: number;
    highRiskIndicators: number;
    mediumRiskIndicators: number;
  };
  reasoning: string[];
  affectedCategories: RiskCategory[];
  recommendations: string[];
  timestamp: string;
}

// ---------------------------------------------------------------
// Question Definitions
// ---------------------------------------------------------------

export interface AssessmentQuestion {
  id: string;
  category: string;
  question: string;
  description?: string;
  type: 'yes-no' | 'multiple-choice' | 'text' | 'select';
  options?: string[];
  riskWeight?: number; // 0-1, impact on risk score
  showIf?: (answers: Map<string, any>) => boolean; // Conditional display
  prohibitedIndicator?: boolean; // Does 'yes' make system prohibited?
  highRiskIndicator?: boolean; // Does 'yes' make system high-risk?
}

const ASSESSMENT_QUESTIONS: AssessmentQuestion[] = [
  // Prohibited uses
  {
    id: 'q1-prohibited-biometric',
    category: 'Prohibited Uses',
    question:
      'Does the system perform real-time remote biometric identification?',
    description:
      'Real-time remote biometric identification (e.g., facial recognition in public spaces) is prohibited unless in specific law enforcement scenarios.',
    type: 'yes-no',
    riskWeight: 1.0,
    prohibitedIndicator: true,
  },
  {
    id: 'q2-emotion-recognition',
    category: 'Prohibited Uses',
    question: 'Does the system use emotion recognition in sensitive contexts?',
    description:
      'Emotion recognition in workplaces, educational institutions, or law enforcement is prohibited.',
    type: 'yes-no',
    riskWeight: 0.95,
    prohibitedIndicator: true,
  },
  {
    id: 'q3-social-scoring',
    category: 'Prohibited Uses',
    question:
      'Does the system create or use social credit scores to restrict rights or opportunities?',
    description:
      'Social credit systems that penalize individuals or restrict opportunities are prohibited.',
    type: 'yes-no',
    riskWeight: 0.95,
    prohibitedIndicator: true,
  },

  // High-risk indicators
  {
    id: 'q4-credit-decision',
    category: 'High-Risk Areas',
    question:
      'Does the system make decisions affecting creditworthiness or access to finance?',
    description:
      'Credit scoring, loan approval, insurance pricing based on AI are high-risk applications.',
    type: 'yes-no',
    riskWeight: 0.85,
    highRiskIndicator: true,
  },
  {
    id: 'q5-recruitment',
    category: 'High-Risk Areas',
    question:
      'Does the system screen, filter, or make decisions in recruitment or employment?',
    description:
      'AI used for candidate screening, resume parsing, or hiring decisions is high-risk.',
    type: 'yes-no',
    riskWeight: 0.8,
    highRiskIndicator: true,
  },
  {
    id: 'q6-education',
    category: 'High-Risk Areas',
    question:
      'Does the system make decisions affecting educational access or outcomes?',
    description:
      'AI that determines student placement, eligibility, or evaluation is high-risk.',
    type: 'yes-no',
    riskWeight: 0.8,
    highRiskIndicator: true,
  },
  {
    id: 'q7-law-enforcement',
    category: 'High-Risk Areas',
    question:
      'Is the system used by law enforcement for profiling, risk assessment, or investigation?',
    description:
      'AI used for predictive policing, criminal risk assessment, or suspect profiling is high-risk.',
    type: 'yes-no',
    riskWeight: 0.85,
    highRiskIndicator: true,
  },
  {
    id: 'q8-critical-infrastructure',
    category: 'High-Risk Areas',
    question: 'Does the system control or monitor critical infrastructure?',
    description:
      'AI managing energy, water, transport, or other critical systems is high-risk.',
    type: 'yes-no',
    riskWeight: 0.8,
    highRiskIndicator: true,
  },
  {
    id: 'q9-fundamental-rights',
    category: 'High-Risk Areas',
    question:
      'Does the system have the potential to significantly affect fundamental rights (privacy, dignity, non-discrimination)?',
    description:
      'Any system that could impact core human rights is considered high-risk.',
    type: 'yes-no',
    riskWeight: 0.75,
    highRiskIndicator: true,
  },

  // Data processing
  {
    id: 'q10-personal-data',
    category: 'Data Processing',
    question: 'Does the system process personal data?',
    type: 'yes-no',
    riskWeight: 0.4,
    showIf: (answers) =>
      !answers.has('q10-personal-data') || answers.get('q10-personal-data'),
  },
  {
    id: 'q11-sensitive-data',
    category: 'Data Processing',
    question:
      'Does the system process special categories of data (race, ethnicity, religion, health, biometric, genetic)?',
    type: 'yes-no',
    riskWeight: 0.7,
    showIf: (answers) => answers.get('q10-personal-data') === true,
  },
  {
    id: 'q12-vulnerable-groups',
    category: 'Data Processing',
    question:
      'Does the system process data of vulnerable groups (children, elderly, persons with disabilities)?',
    type: 'yes-no',
    riskWeight: 0.65,
    showIf: (answers) => answers.get('q10-personal-data') === true,
  },

  // Scale & Scope
  {
    id: 'q13-scale',
    category: 'Scale & Scope',
    question: 'How many individuals does the system affect?',
    type: 'select',
    options: [
      'Fewer than 100',
      '100-1,000',
      '1,000-10,000',
      '10,000-100,000',
      'More than 100,000',
    ],
    riskWeight: 0.5,
  },
  {
    id: 'q14-geographic-scope',
    category: 'Scale & Scope',
    question: 'What is the geographic scope of deployment?',
    type: 'select',
    options: ['Single country', 'EU member states', 'International', 'Global'],
    riskWeight: 0.3,
  },

  // Transparency & Explainability
  {
    id: 'q15-transparency',
    category: 'Transparency',
    question:
      'Can the system explain its decisions to affected individuals in human-understandable terms?',
    type: 'yes-no',
    riskWeight: 0.4,
  },
  {
    id: 'q16-oversight',
    category: 'Transparency',
    question:
      'Is there human oversight and ability to override system decisions?',
    type: 'yes-no',
    riskWeight: 0.45,
  },

  // Safety & Testing
  {
    id: 'q17-testing',
    category: 'Safety & Testing',
    question:
      'Has the system undergone conformity assessment and testing for bias?',
    type: 'yes-no',
    riskWeight: 0.35,
  },
  {
    id: 'q18-monitoring',
    category: 'Safety & Testing',
    question:
      'Is there ongoing monitoring and documentation of system performance?',
    type: 'yes-no',
    riskWeight: 0.4,
  },
];

// ---------------------------------------------------------------
// Risk Classification Logic
// ---------------------------------------------------------------

export function getAssessmentQuestions(): AssessmentQuestion[] {
  return ASSESSMENT_QUESTIONS;
}

export function classifyRisk(answers: Map<string, any>): RiskAssessmentResult {
  const reasoning: string[] = [];
  const affectedCategories: RiskCategory[] = [];
  const recommendations: string[] = [];

  let prohibitedCount = 0;
  let highRiskCount = 0;
  let mediumRiskCount = 0;
  let riskScore = 0;

  // Which prohibited practice each question maps to. Previously every
  // prohibited trigger was reported as 'biometric-identification', which
  // mislabels emotion-recognition and social-scoring assessments.
  const PROHIBITED_CATEGORY: Record<string, RiskCategory> = {
    'q1-prohibited-biometric': 'biometric-identification',
    'q2-emotion-recognition': 'emotion-recognition',
    'q3-social-scoring': 'social-scoring',
  };

  // Check for prohibited uses (triggers UNACCEPTABLE classification)
  const prohibitedQuestions = ASSESSMENT_QUESTIONS.filter(
    (q) => q.prohibitedIndicator
  );
  for (const q of prohibitedQuestions) {
    const answer = answers.get(q.id);
    if (answer === true || answer === 'yes') {
      prohibitedCount++;
      reasoning.push(`Prohibited indicator: ${q.question}`);
      riskScore = Math.min(100, riskScore + 30);
      affectedCategories.push(PROHIBITED_CATEGORY[q.id] ?? 'other');
    }
  }

  // If any prohibited indicator, classification is UNACCEPTABLE
  if (prohibitedCount > 0) {
    const prohibitedCategories = Array.from(new Set(affectedCategories));
    recommendations.push(
      'System uses prohibited AI practices. Deployment is not allowed under EU AI Act.',
      'Immediately discontinue use or fundamentally redesign to avoid prohibited practices.'
    );

    return {
      riskLevel: 'unacceptable',
      riskScore: 100,
      score: {
        prohibitedIndicators: prohibitedCount,
        highRiskIndicators: 0,
        mediumRiskIndicators: 0,
      },
      reasoning,
      affectedCategories:
        prohibitedCategories.length > 0 ? prohibitedCategories : ['other'],
      recommendations,
      timestamp: new Date().toISOString(),
    };
  }

  // Check for high-risk indicators
  const highRiskQuestions = ASSESSMENT_QUESTIONS.filter(
    (q) => q.highRiskIndicator
  );
  for (const q of highRiskQuestions) {
    const answer = answers.get(q.id);
    if (answer === true || answer === 'yes') {
      highRiskCount++;
      reasoning.push(`High-risk indicator: ${q.question}`);
      riskScore += 35;

      // Map to categories
      if (q.id.includes('credit') || q.id.includes('finance')) {
        affectedCategories.push('credit-scoring');
      } else if (q.id.includes('recruitment') || q.id.includes('employment')) {
        affectedCategories.push('recruitment');
      } else if (q.id.includes('education')) {
        affectedCategories.push('education');
      } else if (q.id.includes('law-enforcement')) {
        affectedCategories.push('law-enforcement');
      } else if (q.id.includes('critical')) {
        affectedCategories.push('critical-infrastructure');
      }
    }
  }

  // Check for medium-risk indicators (personal/sensitive data processing)
  if (answers.get('q10-personal-data') === true) {
    mediumRiskCount++;
    riskScore += 20;
    reasoning.push('System processes personal data');

    if (answers.get('q11-sensitive-data') === true) {
      mediumRiskCount++;
      riskScore += 25;
      reasoning.push(
        'System processes special categories of personal data (sensitive)'
      );
    }

    if (answers.get('q12-vulnerable-groups') === true) {
      mediumRiskCount++;
      riskScore += 20;
      reasoning.push('System processes data of vulnerable groups');
    }
  }

  // Scale impact on risk score
  const scaleAnswer = answers.get('q13-scale');
  const scaleWeights: Record<string, number> = {
    'Fewer than 100': 0,
    '100-1,000': 5,
    '1,000-10,000': 10,
    '10,000-100,000': 15,
    'More than 100,000': 20,
  };
  if (scaleAnswer && scaleWeights[scaleAnswer] !== undefined) {
    riskScore += scaleWeights[scaleAnswer];
  }

  // Transparency & oversight reduce risk (only meaningful for high-risk systems)
  if (answers.get('q15-transparency') === true) {
    riskScore -= 5;
    recommendations.push(
      'Strong transparency in decision-making is positive. Maintain this.'
    );
  } else if (answers.get('q15-transparency') === false && highRiskCount > 0) {
    riskScore += 5;
    reasoning.push('Lack of transparency increases risk for high-risk systems');
  }

  if (answers.get('q16-oversight') === true) {
    riskScore -= 5;
    recommendations.push(
      'Human oversight is in place. Continue to monitor and document decisions.'
    );
  } else if (answers.get('q16-oversight') === false && highRiskCount > 0) {
    riskScore += 5;
    reasoning.push(
      'Lack of human oversight increases risk for high-risk systems'
    );
  }

  // Testing & monitoring reduce risk (meaningful for high/medium-risk systems)
  if (answers.get('q17-testing') === true) {
    riskScore -= 4;
    recommendations.push(
      'Testing and conformity assessment have been completed.'
    );
  } else if (
    answers.get('q17-testing') === false &&
    (highRiskCount > 0 || mediumRiskCount > 0)
  ) {
    riskScore += 4;
    reasoning.push('No documented testing or conformity assessment');
  }

  if (answers.get('q18-monitoring') === true) {
    riskScore -= 4;
    recommendations.push(
      'Ongoing monitoring is in place. Maintain documentation.'
    );
  } else if (
    answers.get('q18-monitoring') === false &&
    (highRiskCount > 0 || mediumRiskCount > 0)
  ) {
    riskScore += 4;
    reasoning.push('No ongoing monitoring or performance documentation');
  }

  // Clamp risk score 0-100
  riskScore = Math.max(0, Math.min(100, riskScore));

  // Determine risk level based on indicators and score
  let riskLevel: RiskLevel;

  // Any high-risk indicator makes it high-risk
  if (highRiskCount >= 1) {
    riskLevel = 'high';
    if (recommendations.length === 0) {
      recommendations.push(
        'System meets high-risk criteria under EU AI Act.',
        'Implement comprehensive conformity assessment.',
        'Establish human oversight and documentation procedures.',
        'Conduct regular bias and performance testing.'
      );
    }
  } else if (mediumRiskCount >= 1 || riskScore >= 40) {
    riskLevel = 'medium';
    if (recommendations.length === 0) {
      recommendations.push(
        'System has medium-risk characteristics.',
        'Ensure transparency in decision-making.',
        'Implement basic monitoring and documentation.',
        'Regular performance review recommended.'
      );
    }
  } else {
    riskLevel = 'low';
    recommendations.push('System appears to be low-risk.');
    if (mediumRiskCount === 0 && highRiskCount === 0) {
      recommendations.push(
        'Continue normal development and deployment practices.'
      );
    }
  }

  // Remove duplicates from affected categories
  const uniqueCategories = Array.from(new Set(affectedCategories));

  return {
    riskLevel,
    riskScore,
    score: {
      prohibitedIndicators: prohibitedCount,
      highRiskIndicators: highRiskCount,
      mediumRiskIndicators: mediumRiskCount,
    },
    reasoning,
    affectedCategories:
      uniqueCategories.length > 0 ? uniqueCategories : ['other'],
    recommendations,
    timestamp: new Date().toISOString(),
  };
}

// Map risk level to color for UI
export function getRiskLevelColor(
  riskLevel: RiskLevel
): 'red' | 'orange' | 'amber' | 'green' {
  switch (riskLevel) {
    case 'unacceptable':
      return 'red';
    case 'high':
      return 'orange';
    case 'medium':
      return 'amber';
    case 'low':
      return 'green';
  }
}

// Map risk level to readable label
export function getRiskLevelLabel(riskLevel: RiskLevel): string {
  switch (riskLevel) {
    case 'unacceptable':
      return 'Prohibited';
    case 'high':
      return 'High-Risk';
    case 'medium':
      return 'Medium-Risk';
    case 'low':
      return 'Low-Risk';
  }
}
