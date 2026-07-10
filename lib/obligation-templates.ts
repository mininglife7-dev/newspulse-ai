/**
 * Obligation Templates
 * Pre-defined compliance obligations by risk level under EU AI Act
 * Teams can import these as starting points for their systems
 */

export type RiskLevel = 'unacceptable' | 'high' | 'medium' | 'low';

export interface ObligationTemplate {
  title: string;
  description: string;
  source: 'EU_AI_ACT';
  priority: 'critical' | 'high' | 'medium' | 'low';
}

export const OBLIGATION_TEMPLATES: Record<RiskLevel, ObligationTemplate[]> = {
  unacceptable: [
    {
      title: 'Discontinue prohibited AI system',
      description:
        'Systems performing prohibited uses under EU AI Act (real-time remote biometric identification, emotion recognition in sensitive contexts, social scoring) must be discontinued and removed from operation.',
      source: 'EU_AI_ACT',
      priority: 'critical',
    },
    {
      title: 'Notify regulatory authorities of prohibited system',
      description:
        'Notify relevant EU regulatory authorities about the prohibited AI system and provide evidence of discontinuation.',
      source: 'EU_AI_ACT',
      priority: 'critical',
    },
    {
      title: 'Conduct impact assessment for affected individuals',
      description:
        'Assess and document impacts on fundamental rights and freedoms of individuals affected by the prohibited system during its operation period.',
      source: 'EU_AI_ACT',
      priority: 'high',
    },
  ],

  high: [
    {
      title: 'Establish AI governance framework',
      description:
        'Implement organizational governance structure with clear roles, responsibilities, and accountability for high-risk AI systems management.',
      source: 'EU_AI_ACT',
      priority: 'critical',
    },
    {
      title: 'Conduct conformity assessment',
      description:
        'Perform comprehensive conformity assessment demonstrating compliance with EU AI Act requirements for high-risk systems.',
      source: 'EU_AI_ACT',
      priority: 'critical',
    },
    {
      title: 'Implement risk management system',
      description:
        'Establish systematic risk management procedures to identify, analyze, and mitigate risks throughout the AI system lifecycle.',
      source: 'EU_AI_ACT',
      priority: 'critical',
    },
    {
      title: 'Create technical documentation',
      description:
        'Document system architecture, algorithms, training data, testing procedures, and performance metrics.',
      source: 'EU_AI_ACT',
      priority: 'high',
    },
    {
      title: 'Establish data governance practices',
      description:
        'Document and manage training, validation, and testing data quality, characteristics, and completeness.',
      source: 'EU_AI_ACT',
      priority: 'high',
    },
    {
      title: 'Implement human oversight mechanisms',
      description:
        'Establish processes for human review and override of system decisions, especially for decisions affecting fundamental rights.',
      source: 'EU_AI_ACT',
      priority: 'high',
    },
    {
      title: 'Conduct bias and fairness testing',
      description:
        'Perform testing to detect and mitigate bias, discrimination, and unfair outcomes, particularly for vulnerable populations.',
      source: 'EU_AI_ACT',
      priority: 'high',
    },
    {
      title: 'Provide transparency information to users',
      description:
        'Inform users that they are interacting with an AI system and provide explanations of system decisions in accessible terms.',
      source: 'EU_AI_ACT',
      priority: 'high',
    },
    {
      title: 'Implement performance monitoring',
      description:
        'Establish system for ongoing monitoring of AI system performance, including detection of performance degradation.',
      source: 'EU_AI_ACT',
      priority: 'high',
    },
    {
      title: 'Maintain audit trail and logging',
      description:
        'Keep comprehensive logs of AI system decisions, user interactions, and system modifications for compliance verification.',
      source: 'EU_AI_ACT',
      priority: 'high',
    },
    {
      title: 'Plan for incident response and remediation',
      description:
        'Develop procedures for detecting, reporting, and remediating serious incidents or malfunctions.',
      source: 'EU_AI_ACT',
      priority: 'high',
    },
  ],

  medium: [
    {
      title: 'Document AI system purpose and scope',
      description:
        'Clearly document the intended purpose, use cases, and scope of the AI system to ensure appropriate use.',
      source: 'EU_AI_ACT',
      priority: 'high',
    },
    {
      title: 'Implement transparency measures',
      description:
        'Provide clear information to users about data processing, system limitations, and when automated decisions are made.',
      source: 'EU_AI_ACT',
      priority: 'high',
    },
    {
      title: 'Establish data quality standards',
      description:
        'Define and maintain data quality standards for training and operational data used in the AI system.',
      source: 'EU_AI_ACT',
      priority: 'medium',
    },
    {
      title: 'Implement basic performance monitoring',
      description:
        'Monitor system performance and maintain records of model evaluation results and any detected issues.',
      source: 'EU_AI_ACT',
      priority: 'medium',
    },
    {
      title: 'Document data retention and deletion policies',
      description:
        'Establish and document policies for retention, archiving, and secure deletion of training and operational data.',
      source: 'EU_AI_ACT',
      priority: 'medium',
    },
    {
      title: 'Provide user recourse mechanisms',
      description:
        'Establish processes for users to contest automated decisions and seek human review when affected.',
      source: 'EU_AI_ACT',
      priority: 'medium',
    },
  ],

  low: [
    {
      title: 'Document system overview',
      description: 'Maintain basic documentation of the AI system, including its purpose and primary use cases.',
      source: 'EU_AI_ACT',
      priority: 'low',
    },
    {
      title: 'Maintain system change log',
      description:
        'Keep records of significant changes and updates made to the AI system over time.',
      source: 'EU_AI_ACT',
      priority: 'low',
    },
    {
      title: 'Monitor for data quality issues',
      description:
        'Periodically review data used by the system for obvious quality problems or anomalies.',
      source: 'EU_AI_ACT',
      priority: 'low',
    },
  ],
};

/**
 * Get templates for a specific risk level
 */
export function getTemplatesForRiskLevel(riskLevel: RiskLevel): ObligationTemplate[] {
  return OBLIGATION_TEMPLATES[riskLevel] || [];
}

/**
 * Get all templates across all risk levels
 */
export function getAllTemplates(): Record<RiskLevel, ObligationTemplate[]> {
  return OBLIGATION_TEMPLATES;
}
