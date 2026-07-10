/**
 * EU AI Act risk screening.
 *
 * A simplified, honest first-pass classification into the AI Act's four risk
 * tiers based on yes/no screening questions. It is informational tooling for
 * prioritization — not a conformity assessment and not legal advice (see
 * /terms). The questions mirror the Act's structure: Article 5 prohibited
 * practices, Annex III high-risk areas, and transparency-risk systems.
 */

export type RiskLevel = 'unacceptable' | 'high' | 'medium' | 'low';

export interface ScreeningQuestion {
  id: string;
  tier: 'prohibited' | 'high' | 'transparency';
  text: string;
}

export const SCREENING_QUESTIONS: ScreeningQuestion[] = [
  // — Article 5: prohibited practices —
  {
    id: 'social_scoring',
    tier: 'prohibited',
    text: 'Does it score or classify people based on social behavior or personal traits, leading to detrimental treatment?',
  },
  {
    id: 'manipulation',
    tier: 'prohibited',
    text: 'Does it use subliminal or purposefully manipulative techniques that materially distort behavior and may cause harm?',
  },
  {
    id: 'realtime_biometric_public',
    tier: 'prohibited',
    text: 'Does it perform real-time remote biometric identification in publicly accessible spaces?',
  },
  {
    id: 'emotion_work_school',
    tier: 'prohibited',
    text: 'Does it infer emotions of people in workplaces or educational institutions?',
  },
  // — Annex III: high-risk areas —
  {
    id: 'biometric_id',
    tier: 'high',
    text: 'Does it perform biometric identification or categorization of people (outside the prohibited cases)?',
  },
  {
    id: 'critical_infrastructure',
    tier: 'high',
    text: 'Is it a safety component in critical infrastructure (energy, water, transport, digital networks)?',
  },
  {
    id: 'education',
    tier: 'high',
    text: 'Does it determine access to education or evaluate learning outcomes?',
  },
  {
    id: 'employment',
    tier: 'high',
    text: 'Is it used in recruitment, promotion, termination, task allocation, or monitoring of workers?',
  },
  {
    id: 'essential_services',
    tier: 'high',
    text: 'Does it decide eligibility for essential services (credit scoring, insurance, public benefits)?',
  },
  {
    id: 'law_migration_justice',
    tier: 'high',
    text: 'Is it used in law enforcement, migration/border control, or the administration of justice?',
  },
  // — Transparency-risk systems —
  {
    id: 'interacts_humans',
    tier: 'transparency',
    text: 'Does it interact with people who might not know they are talking to an AI (e.g. chatbots)?',
  },
  {
    id: 'generates_content',
    tier: 'transparency',
    text: 'Does it generate synthetic audio, image, video, or text content?',
  },
];

export const QUESTION_IDS = SCREENING_QUESTIONS.map((q) => q.id);

const OBLIGATIONS: Record<RiskLevel, string[]> = {
  unacceptable: [
    'Prohibited practice under EU AI Act Article 5 — this system must not be placed on the EU market or put into service.',
    'Stop deployment planning and seek qualified legal counsel immediately.',
  ],
  high: [
    'Establish a risk management system across the lifecycle (Art. 9)',
    'Data governance: training/validation/testing data quality (Art. 10)',
    'Technical documentation before placing on the market (Art. 11)',
    'Automatic record-keeping / logging (Art. 12)',
    'Transparency and instructions for deployers (Art. 13)',
    'Effective human oversight (Art. 14)',
    'Accuracy, robustness and cybersecurity (Art. 15)',
    'Conformity assessment and CE marking; registration in the EU database',
  ],
  medium: [
    'Disclose that people are interacting with an AI system',
    'Label AI-generated or manipulated content (incl. deepfakes) as such',
  ],
  low: [
    'No mandatory AI Act obligations — voluntary codes of conduct recommended',
    'General law (GDPR, consumer protection, product safety) still applies',
  ],
};

export interface ClassificationResult {
  riskLevel: RiskLevel;
  riskScore: number;
  matched: string[]; // question ids that drove the classification
  obligations: string[];
  rationale: string;
}

const SCORES: Record<RiskLevel, number> = {
  unacceptable: 100,
  high: 75,
  medium: 40,
  low: 10,
};

/** Classify from answers: map of question id → boolean. Unknown ids are ignored. */
export function classify(answers: Record<string, boolean>): ClassificationResult {
  const yes = (tier: ScreeningQuestion['tier']) =>
    SCREENING_QUESTIONS.filter((q) => q.tier === tier && answers[q.id] === true).map(
      (q) => q.id
    );

  const prohibited = yes('prohibited');
  if (prohibited.length > 0) {
    return {
      riskLevel: 'unacceptable',
      riskScore: SCORES.unacceptable,
      matched: prohibited,
      obligations: OBLIGATIONS.unacceptable,
      rationale:
        'One or more answers indicate a practice prohibited by EU AI Act Article 5.',
    };
  }

  const high = yes('high');
  if (high.length > 0) {
    return {
      riskLevel: 'high',
      riskScore: SCORES.high,
      matched: high,
      obligations: OBLIGATIONS.high,
      rationale:
        'The system falls into one or more Annex III high-risk areas of the EU AI Act.',
    };
  }

  const transparency = yes('transparency');
  if (transparency.length > 0) {
    return {
      riskLevel: 'medium',
      riskScore: SCORES.medium,
      matched: transparency,
      obligations: OBLIGATIONS.medium,
      rationale:
        'The system carries transparency risk (limited-risk tier): people must be able to know AI is involved.',
    };
  }

  return {
    riskLevel: 'low',
    riskScore: SCORES.low,
    matched: [],
    obligations: OBLIGATIONS.low,
    rationale:
      'No prohibited, high-risk, or transparency-risk indicators — minimal-risk tier.',
  };
}
