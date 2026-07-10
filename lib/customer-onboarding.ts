/**
 * DNA-GOV-015: Customer Onboarding
 *
 * Guide new customers through signup → first assessment → export flow.
 * Tracks progress through first-run wizard to understand drop-off points.
 *
 * Purpose: Reduce time-to-value and increase product adoption.
 */

export type OnboardingStep =
  | 'welcome'
  | 'company_setup'
  | 'framework_selection'
  | 'first_assessment'
  | 'export';

export interface OnboardingProgress {
  id: string;
  workspace_id: string;
  user_id: string;
  step: OnboardingStep;
  completed_at?: string;
  skipped_at?: string;
  data: Record<string, any>;
}

export interface OnboardingStepConfig {
  id: OnboardingStep;
  title: string;
  description: string;
  estimatedSeconds: number;
  skipAllowed: boolean;
  helpVideoUrl?: string;
}

export const ONBOARDING_STEPS: Record<OnboardingStep, OnboardingStepConfig> = {
  welcome: {
    id: 'welcome',
    title: 'Welcome to EURO AI Compliance',
    description: 'In the next 10 minutes, you will create your first compliance assessment.',
    estimatedSeconds: 30,
    skipAllowed: false,
  },
  company_setup: {
    id: 'company_setup',
    title: 'Tell us about your organization',
    description: 'This helps us customize compliance frameworks for your context.',
    estimatedSeconds: 120,
    skipAllowed: true,
  },
  framework_selection: {
    id: 'framework_selection',
    title: 'Select compliance frameworks',
    description: 'Choose the frameworks relevant to your organization.',
    estimatedSeconds: 60,
    skipAllowed: true,
  },
  first_assessment: {
    id: 'first_assessment',
    title: 'Create your first assessment',
    description: 'Start your first risk assessment for the selected framework.',
    estimatedSeconds: 300,
    skipAllowed: false,
  },
  export: {
    id: 'export',
    title: 'Export your first report',
    description: 'Generate and download your compliance report.',
    estimatedSeconds: 120,
    skipAllowed: false,
  },
};

export const ONBOARDING_SEQUENCE: OnboardingStep[] = [
  'welcome',
  'company_setup',
  'framework_selection',
  'first_assessment',
  'export',
];

/**
 * Get next step in onboarding flow
 */
export function getNextStep(currentStep: OnboardingStep): OnboardingStep | null {
  const index = ONBOARDING_SEQUENCE.indexOf(currentStep);
  if (index === -1 || index >= ONBOARDING_SEQUENCE.length - 1) {
    return null;
  }
  return ONBOARDING_SEQUENCE[index + 1];
}

/**
 * Get onboarding step config
 */
export function getStepConfig(step: OnboardingStep): OnboardingStepConfig {
  return ONBOARDING_STEPS[step];
}

/**
 * Calculate estimated time remaining
 */
export function getEstimatedTimeRemaining(
  currentStep: OnboardingStep,
  includeCurrentStep = true
): number {
  const startIndex = ONBOARDING_SEQUENCE.indexOf(currentStep);
  if (startIndex === -1) return 0;

  const endIndex = ONBOARDING_SEQUENCE.length;
  let totalSeconds = 0;

  for (let i = startIndex + (includeCurrentStep ? 0 : 1); i < endIndex; i++) {
    const step = ONBOARDING_SEQUENCE[i];
    totalSeconds += ONBOARDING_STEPS[step].estimatedSeconds;
  }

  return totalSeconds;
}

/**
 * Calculate completion percentage
 */
export function getCompletionPercentage(completedSteps: OnboardingStep[]): number {
  const totalSteps = ONBOARDING_SEQUENCE.length;
  const completed = completedSteps.filter((step) =>
    ONBOARDING_SEQUENCE.includes(step)
  ).length;

  return Math.round((completed / totalSteps) * 100);
}

/**
 * Record onboarding step completion
 */
export async function recordOnboardingStep(
  workspaceId: string,
  userId: string,
  step: OnboardingStep,
  data?: Record<string, any>
): Promise<boolean> {
  try {
    const response = await fetch('/api/onboarding/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspace_id: workspaceId,
        user_id: userId,
        step,
        data: data || {},
        completed_at: new Date().toISOString(),
      }),
    });

    return response.ok;
  } catch (err) {
    console.error('[customer-onboarding] Failed to record step:', err);
    return false;
  }
}

/**
 * Skip onboarding step
 */
export async function skipOnboardingStep(
  workspaceId: string,
  userId: string,
  step: OnboardingStep
): Promise<boolean> {
  const config = getStepConfig(step);
  if (!config.skipAllowed) {
    return false;
  }

  try {
    const response = await fetch('/api/onboarding/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspace_id: workspaceId,
        user_id: userId,
        step,
        skipped_at: new Date().toISOString(),
      }),
    });

    return response.ok;
  } catch (err) {
    console.error('[customer-onboarding] Failed to skip step:', err);
    return false;
  }
}

/**
 * Get current onboarding progress
 */
export async function getOnboardingProgress(
  workspaceId: string,
  userId: string
): Promise<OnboardingProgress[]> {
  try {
    const response = await fetch(
      `/api/onboarding/progress?workspace_id=${workspaceId}&user_id=${userId}`
    );

    if (!response.ok) return [];

    return response.json();
  } catch (err) {
    console.error('[customer-onboarding] Failed to get progress:', err);
    return [];
  }
}

/**
 * Check if onboarding is complete
 */
export async function isOnboardingComplete(
  workspaceId: string,
  userId: string
): Promise<boolean> {
  const progress = await getOnboardingProgress(workspaceId, userId);

  const completed = progress
    .filter((p) => p.completed_at)
    .map((p) => p.step);

  return (
    completed.includes('welcome') &&
    (completed.includes('company_setup') || completed.includes('framework_selection')) &&
    completed.includes('first_assessment') &&
    completed.includes('export')
  );
}

/**
 * Get first incomplete step
 */
export function getFirstIncompleteStep(completedSteps: OnboardingStep[]): OnboardingStep {
  for (const step of ONBOARDING_SEQUENCE) {
    if (!completedSteps.includes(step)) {
      return step;
    }
  }
  return ONBOARDING_SEQUENCE[0];
}

/**
 * Validate company setup data
 */
export interface CompanySetupData {
  company_name: string;
  industry?: string;
  team_size?: string;
}

export function validateCompanySetup(data: Partial<CompanySetupData>): string[] {
  const errors: string[] = [];

  if (!data.company_name || data.company_name.trim() === '') {
    errors.push('Company name is required');
  } else if (data.company_name.length > 255) {
    errors.push('Company name must be less than 255 characters');
  }

  if (data.industry && data.industry.length > 100) {
    errors.push('Industry must be less than 100 characters');
  }

  if (data.team_size && data.team_size.length > 50) {
    errors.push('Team size must be less than 50 characters');
  }

  return errors;
}
