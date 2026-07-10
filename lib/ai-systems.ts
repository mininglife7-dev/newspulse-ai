/** Shared vocabulary for the AI systems inventory. */

export const SYSTEM_TYPES = [
  'large_language_model',
  'generative_ai',
  'classification_system',
  'recommendation_system',
  'computer_vision',
  'biometric_system',
  'decision_support',
  'other',
] as const;

export type SystemType = (typeof SYSTEM_TYPES)[number];

export const SYSTEM_STATUSES = ['active', 'pilot', 'deprecated'] as const;
export type SystemStatus = (typeof SYSTEM_STATUSES)[number];
