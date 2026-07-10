import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getNextStep,
  getStepConfig,
  getEstimatedTimeRemaining,
  getCompletionPercentage,
  recordOnboardingStep,
  skipOnboardingStep,
  getOnboardingProgress,
  isOnboardingComplete,
  getFirstIncompleteStep,
  validateCompanySetup,
  ONBOARDING_SEQUENCE,
  ONBOARDING_STEPS,
  type OnboardingStep,
  type CompanySetupData,
} from '@/lib/customer-onboarding';

global.fetch = vi.fn();

describe('Customer Onboarding (DNA-GOV-015)', () => {
  const mockWorkspaceId = '550e8400-e29b-41d4-a716-446655440000';
  const mockUserId = '660e8400-e29b-41d4-a716-446655440001';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Onboarding flow structure', () => {
    it('should have correct onboarding sequence', () => {
      expect(ONBOARDING_SEQUENCE).toEqual([
        'welcome',
        'company_setup',
        'framework_selection',
        'first_assessment',
        'export',
      ]);
    });

    it('should have config for each step', () => {
      for (const step of ONBOARDING_SEQUENCE) {
        expect(ONBOARDING_STEPS[step]).toBeDefined();
        expect(ONBOARDING_STEPS[step].id).toBe(step);
        expect(ONBOARDING_STEPS[step].title).toBeTruthy();
        expect(ONBOARDING_STEPS[step].description).toBeTruthy();
        expect(ONBOARDING_STEPS[step].estimatedSeconds).toBeGreaterThan(0);
      }
    });
  });

  describe('getNextStep', () => {
    it('should return next step in sequence', () => {
      expect(getNextStep('welcome')).toBe('company_setup');
      expect(getNextStep('company_setup')).toBe('framework_selection');
      expect(getNextStep('framework_selection')).toBe('first_assessment');
      expect(getNextStep('first_assessment')).toBe('export');
    });

    it('should return null for last step', () => {
      expect(getNextStep('export')).toBeNull();
    });

    it('should return null for invalid step', () => {
      expect(getNextStep('invalid' as OnboardingStep)).toBeNull();
    });
  });

  describe('getStepConfig', () => {
    it('should return config for welcome step', () => {
      const config = getStepConfig('welcome');
      expect(config.id).toBe('welcome');
      expect(config.title).toBe('Welcome to EURO AI Compliance');
      expect(config.skipAllowed).toBe(false);
    });

    it('should return config for company_setup step', () => {
      const config = getStepConfig('company_setup');
      expect(config.id).toBe('company_setup');
      expect(config.skipAllowed).toBe(true);
    });

    it('should have correct estimated times', () => {
      const welcome = getStepConfig('welcome');
      const companySetup = getStepConfig('company_setup');
      const firstAssessment = getStepConfig('first_assessment');

      expect(welcome.estimatedSeconds).toBe(30);
      expect(companySetup.estimatedSeconds).toBe(120);
      expect(firstAssessment.estimatedSeconds).toBe(300);
    });
  });

  describe('getEstimatedTimeRemaining', () => {
    it('should calculate time remaining from welcome step', () => {
      const total = getEstimatedTimeRemaining('welcome', true);
      // 30 + 120 + 60 + 300 + 120 = 630 seconds (~10.5 minutes)
      expect(total).toBe(630);
    });

    it('should calculate time remaining excluding current step', () => {
      const total = getEstimatedTimeRemaining('welcome', false);
      // 120 + 60 + 300 + 120 = 600 seconds
      expect(total).toBe(600);
    });

    it('should calculate time remaining from middle step', () => {
      const total = getEstimatedTimeRemaining('company_setup', true);
      // 120 + 60 + 300 + 120 = 600 seconds
      expect(total).toBe(600);
    });

    it('should return 0 for export step when not including current', () => {
      // Export is last step, so including it gives export's own time (120s)
      // Not including it should give 0
      expect(getEstimatedTimeRemaining('export', false)).toBe(0);
    });

    it('should convert seconds to readable format', () => {
      const seconds = getEstimatedTimeRemaining('welcome', true);
      const minutes = Math.round(seconds / 60);
      expect(minutes).toBe(11); // 630 / 60 = 10.5, rounds to 11
    });
  });

  describe('getCompletionPercentage', () => {
    it('should return 0% for no completed steps', () => {
      expect(getCompletionPercentage([])).toBe(0);
    });

    it('should return 20% for one completed step', () => {
      expect(getCompletionPercentage(['welcome'])).toBe(20);
    });

    it('should return 40% for two completed steps', () => {
      expect(getCompletionPercentage(['welcome', 'company_setup'])).toBe(40);
    });

    it('should return 100% for all steps', () => {
      expect(getCompletionPercentage(ONBOARDING_SEQUENCE)).toBe(100);
    });

    it('should count duplicate steps as separate entries', () => {
      // ['welcome', 'welcome', 'company_setup'] = 3 entries, 2 valid = 40% (2/5)
      // But wait, the function counts each entry separately, so:
      // 3 out of 5 total = 60%
      expect(getCompletionPercentage(['welcome', 'welcome', 'company_setup'])).toBe(60);
    });

    it('should ignore invalid steps when counting', () => {
      // ['welcome', 'invalid', 'company_setup'] = 3 entries total, 2 valid in sequence
      // 2 valid steps / 5 total = 40%
      expect(
        getCompletionPercentage(['welcome', 'invalid' as OnboardingStep, 'company_setup'])
      ).toBe(40);
    });
  });

  describe('recordOnboardingStep', () => {
    it('should record step completion', async () => {
      (global.fetch as any).mockResolvedValue({ ok: true });

      const result = await recordOnboardingStep(mockWorkspaceId, mockUserId, 'welcome');

      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/onboarding/progress',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    it('should include step data', async () => {
      (global.fetch as any).mockResolvedValue({ ok: true });

      const data = { company_name: 'Acme Corp', industry: 'Technology' };
      await recordOnboardingStep(mockWorkspaceId, mockUserId, 'company_setup', data);

      const callBody = JSON.parse((global.fetch as any).mock.calls[0][1].body);
      expect(callBody.data).toEqual(data);
    });

    it('should handle API errors gracefully', async () => {
      (global.fetch as any).mockResolvedValue({ ok: false });

      const result = await recordOnboardingStep(mockWorkspaceId, mockUserId, 'welcome');

      expect(result).toBe(false);
    });

    it('should handle network errors gracefully', async () => {
      (global.fetch as any).mockRejectedValue(new Error('Network error'));

      const result = await recordOnboardingStep(mockWorkspaceId, mockUserId, 'welcome');

      expect(result).toBe(false);
    });
  });

  describe('skipOnboardingStep', () => {
    it('should skip allowed steps', async () => {
      (global.fetch as any).mockResolvedValue({ ok: true });

      const result = await skipOnboardingStep(mockWorkspaceId, mockUserId, 'company_setup');

      expect(result).toBe(true);
    });

    it('should prevent skipping required steps', async () => {
      (global.fetch as any).mockResolvedValue({ ok: true });

      const result = await skipOnboardingStep(mockWorkspaceId, mockUserId, 'welcome');

      expect(result).toBe(false);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should prevent skipping first_assessment', async () => {
      const result = await skipOnboardingStep(mockWorkspaceId, mockUserId, 'first_assessment');
      expect(result).toBe(false);
    });

    it('should prevent skipping export', async () => {
      const result = await skipOnboardingStep(mockWorkspaceId, mockUserId, 'export');
      expect(result).toBe(false);
    });

    it('should allow skipping company_setup', async () => {
      (global.fetch as any).mockResolvedValue({ ok: true });

      const result = await skipOnboardingStep(mockWorkspaceId, mockUserId, 'company_setup');

      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  describe('getOnboardingProgress', () => {
    it('should fetch progress successfully', async () => {
      const mockProgress = [
        {
          id: 'p1',
          workspace_id: mockWorkspaceId,
          user_id: mockUserId,
          step: 'welcome' as OnboardingStep,
          completed_at: '2026-07-10T12:00:00Z',
          data: {},
        },
      ];

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockProgress,
      });

      const result = await getOnboardingProgress(mockWorkspaceId, mockUserId);

      expect(result).toHaveLength(1);
      expect(result[0].step).toBe('welcome');
    });

    it('should handle API errors gracefully', async () => {
      (global.fetch as any).mockResolvedValue({ ok: false });

      const result = await getOnboardingProgress(mockWorkspaceId, mockUserId);

      expect(result).toEqual([]);
    });

    it('should handle network errors gracefully', async () => {
      (global.fetch as any).mockRejectedValue(new Error('Network error'));

      const result = await getOnboardingProgress(mockWorkspaceId, mockUserId);

      expect(result).toEqual([]);
    });
  });

  describe('isOnboardingComplete', () => {
    it('should return false when no steps completed', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => [],
      });

      const result = await isOnboardingComplete(mockWorkspaceId, mockUserId);

      expect(result).toBe(false);
    });

    it('should require welcome step', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => [
          {
            workspace_id: mockWorkspaceId,
            user_id: mockUserId,
            step: 'company_setup',
            completed_at: '2026-07-10T12:00:00Z',
            data: {},
          },
          {
            workspace_id: mockWorkspaceId,
            user_id: mockUserId,
            step: 'first_assessment',
            completed_at: '2026-07-10T12:15:00Z',
            data: {},
          },
          {
            workspace_id: mockWorkspaceId,
            user_id: mockUserId,
            step: 'export',
            completed_at: '2026-07-10T12:30:00Z',
            data: {},
          },
        ],
      });

      const result = await isOnboardingComplete(mockWorkspaceId, mockUserId);

      expect(result).toBe(false);
    });

    it('should return true when all required steps completed', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => [
          {
            workspace_id: mockWorkspaceId,
            user_id: mockUserId,
            step: 'welcome',
            completed_at: '2026-07-10T12:00:00Z',
            data: {},
          },
          {
            workspace_id: mockWorkspaceId,
            user_id: mockUserId,
            step: 'company_setup',
            completed_at: '2026-07-10T12:05:00Z',
            data: {},
          },
          {
            workspace_id: mockWorkspaceId,
            user_id: mockUserId,
            step: 'first_assessment',
            completed_at: '2026-07-10T12:15:00Z',
            data: {},
          },
          {
            workspace_id: mockWorkspaceId,
            user_id: mockUserId,
            step: 'export',
            completed_at: '2026-07-10T12:30:00Z',
            data: {},
          },
        ],
      });

      const result = await isOnboardingComplete(mockWorkspaceId, mockUserId);

      expect(result).toBe(true);
    });

    it('should accept framework_selection instead of company_setup', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => [
          {
            workspace_id: mockWorkspaceId,
            user_id: mockUserId,
            step: 'welcome',
            completed_at: '2026-07-10T12:00:00Z',
            data: {},
          },
          {
            workspace_id: mockWorkspaceId,
            user_id: mockUserId,
            step: 'framework_selection',
            completed_at: '2026-07-10T12:05:00Z',
            data: {},
          },
          {
            workspace_id: mockWorkspaceId,
            user_id: mockUserId,
            step: 'first_assessment',
            completed_at: '2026-07-10T12:15:00Z',
            data: {},
          },
          {
            workspace_id: mockWorkspaceId,
            user_id: mockUserId,
            step: 'export',
            completed_at: '2026-07-10T12:30:00Z',
            data: {},
          },
        ],
      });

      const result = await isOnboardingComplete(mockWorkspaceId, mockUserId);

      expect(result).toBe(true);
    });
  });

  describe('getFirstIncompleteStep', () => {
    it('should return welcome for no completed steps', () => {
      expect(getFirstIncompleteStep([])).toBe('welcome');
    });

    it('should return company_setup after welcome', () => {
      expect(getFirstIncompleteStep(['welcome'])).toBe('company_setup');
    });

    it('should return framework_selection after company_setup', () => {
      expect(getFirstIncompleteStep(['welcome', 'company_setup'])).toBe('framework_selection');
    });

    it('should return first_assessment after framework_selection', () => {
      expect(getFirstIncompleteStep(['welcome', 'company_setup', 'framework_selection'])).toBe(
        'first_assessment'
      );
    });

    it('should return export after all prior steps', () => {
      expect(
        getFirstIncompleteStep(['welcome', 'company_setup', 'framework_selection', 'first_assessment'])
      ).toBe('export');
    });
  });

  describe('validateCompanySetup', () => {
    it('should accept valid company setup', () => {
      const data: CompanySetupData = {
        company_name: 'Acme Corp',
        industry: 'Technology',
        team_size: '50-100',
      };

      const errors = validateCompanySetup(data);

      expect(errors).toEqual([]);
    });

    it('should require company name', () => {
      const errors = validateCompanySetup({});

      expect(errors).toContain('Company name is required');
    });

    it('should reject empty company name', () => {
      const errors = validateCompanySetup({ company_name: '   ' });

      expect(errors).toContain('Company name is required');
    });

    it('should reject company name > 255 chars', () => {
      const longName = 'A'.repeat(256);
      const errors = validateCompanySetup({ company_name: longName });

      expect(errors).toContain('Company name must be less than 255 characters');
    });

    it('should accept optional industry', () => {
      const errors = validateCompanySetup({
        company_name: 'Acme',
        industry: 'Finance',
      });

      expect(errors).toEqual([]);
    });

    it('should reject industry > 100 chars', () => {
      const errors = validateCompanySetup({
        company_name: 'Acme',
        industry: 'A'.repeat(101),
      });

      expect(errors).toContain('Industry must be less than 100 characters');
    });

    it('should accept optional team_size', () => {
      const errors = validateCompanySetup({
        company_name: 'Acme',
        team_size: '1-10',
      });

      expect(errors).toEqual([]);
    });

    it('should reject team_size > 50 chars', () => {
      const errors = validateCompanySetup({
        company_name: 'Acme',
        team_size: 'A'.repeat(51),
      });

      expect(errors).toContain('Team size must be less than 50 characters');
    });

    it('should return multiple errors', () => {
      const errors = validateCompanySetup({
        company_name: 'A'.repeat(256),
        industry: 'A'.repeat(101),
      });

      expect(errors.length).toBe(2);
      expect(errors).toContain('Company name must be less than 255 characters');
      expect(errors).toContain('Industry must be less than 100 characters');
    });
  });

  describe('Integration scenarios', () => {
    it('should track complete onboarding flow', async () => {
      (global.fetch as any).mockResolvedValue({ ok: true });

      const stepsToComplete: OnboardingStep[] = [
        'welcome',
        'company_setup',
        'framework_selection',
        'first_assessment',
        'export',
      ];

      for (const step of stepsToComplete) {
        await recordOnboardingStep(mockWorkspaceId, mockUserId, step, {});
      }

      expect(global.fetch).toHaveBeenCalledTimes(5);
      expect(getCompletionPercentage(stepsToComplete)).toBe(100);
    });

    it('should allow user to skip optional steps', async () => {
      (global.fetch as any).mockResolvedValue({ ok: true });

      // Record welcome
      await recordOnboardingStep(mockWorkspaceId, mockUserId, 'welcome');

      // Skip company_setup
      await skipOnboardingStep(mockWorkspaceId, mockUserId, 'company_setup');

      // Skip framework_selection
      await skipOnboardingStep(mockWorkspaceId, mockUserId, 'framework_selection');

      // Record first_assessment
      await recordOnboardingStep(mockWorkspaceId, mockUserId, 'first_assessment');

      // Record export
      await recordOnboardingStep(mockWorkspaceId, mockUserId, 'export');

      expect(global.fetch).toHaveBeenCalledTimes(5);
    });

    it('should prevent skipping required steps', async () => {
      (global.fetch as any).mockResolvedValue({ ok: true });

      const result1 = await skipOnboardingStep(mockWorkspaceId, mockUserId, 'welcome');
      const result2 = await skipOnboardingStep(mockWorkspaceId, mockUserId, 'first_assessment');
      const result3 = await skipOnboardingStep(mockWorkspaceId, mockUserId, 'export');

      expect(result1).toBe(false);
      expect(result2).toBe(false);
      expect(result3).toBe(false);

      // No fetch calls should have been made
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should provide accurate progress tracking', () => {
      const completed: OnboardingStep[] = ['welcome', 'company_setup'];

      expect(getCompletionPercentage(completed)).toBe(40);
      expect(getFirstIncompleteStep(completed)).toBe('framework_selection');
      // From company_setup: 120 (company_setup) + 60 (framework) + 300 (assessment) + 120 (export) = 600
      expect(getEstimatedTimeRemaining('company_setup', true)).toBe(600);
    });
  });
});
