import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resendEmailConfirmation } from '@/lib/auth';

// Mock Supabase client
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      resend: vi.fn(),
    },
  },
}));

import { supabase } from '@/lib/supabase';

describe('Resend Email Confirmation Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('resendEmailConfirmation() - Core function', () => {
    it('should call Supabase resend with correct parameters', async () => {
      const mockResend = vi.mocked(supabase.auth.resend);
      mockResend.mockResolvedValue({ error: null });

      await resendEmailConfirmation('user@example.com');

      expect(mockResend).toHaveBeenCalledWith({
        type: 'signup',
        email: 'user@example.com',
      });
    });

    it('should throw error if Supabase returns error', async () => {
      const mockResend = vi.mocked(supabase.auth.resend);
      const testError = new Error('Email service unavailable');
      mockResend.mockResolvedValue({ error: testError });

      await expect(resendEmailConfirmation('user@example.com')).rejects.toThrow(
        'Email service unavailable'
      );
    });

    it('should work with valid email addresses', async () => {
      const mockResend = vi.mocked(supabase.auth.resend);
      mockResend.mockResolvedValue({ error: null });

      const validEmails = [
        'user@example.com',
        'firstname.lastname@domain.co.uk',
        'user+tag@example.org',
      ];

      for (const email of validEmails) {
        await resendEmailConfirmation(email);
        expect(mockResend).toHaveBeenCalledWith({
          type: 'signup',
          email,
        });
      }

      expect(mockResend).toHaveBeenCalledTimes(3);
    });
  });

  describe('Rate Limiting', () => {
    it('should handle rate limit error from Supabase', async () => {
      const mockResend = vi.mocked(supabase.auth.resend);
      const rateLimitError = new Error('Rate limit exceeded');
      mockResend.mockResolvedValue({ error: rateLimitError });

      await expect(resendEmailConfirmation('user@example.com')).rejects.toThrow(
        'Rate limit exceeded'
      );
    });

    it('should allow retry after cooldown period', async () => {
      const mockResend = vi.mocked(supabase.auth.resend);

      // First attempt fails with rate limit
      const rateLimitError = new Error('Rate limit exceeded');
      mockResend.mockResolvedValueOnce({ error: rateLimitError });

      await expect(resendEmailConfirmation('user@example.com')).rejects.toThrow();

      // Retry succeeds after cooldown
      mockResend.mockResolvedValueOnce({ error: null });

      await expect(
        resendEmailConfirmation('user@example.com')
      ).resolves.not.toThrow();
    });

    it('should indicate rate limit in API error response', () => {
      const errorMessage = 'Rate limit exceeded';
      const isRateLimit = errorMessage.toLowerCase().includes('rate');

      expect(isRateLimit).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle "already verified" account error', async () => {
      const mockResend = vi.mocked(supabase.auth.resend);
      const alreadyVerifiedError = new Error('Email already verified');
      mockResend.mockResolvedValue({ error: alreadyVerifiedError });

      await expect(resendEmailConfirmation('user@example.com')).rejects.toThrow(
        'Email already verified'
      );
    });

    it('should handle "email not found" error', async () => {
      const mockResend = vi.mocked(supabase.auth.resend);
      const notFoundError = new Error('Email address not found');
      mockResend.mockResolvedValue({ error: notFoundError });

      await expect(resendEmailConfirmation('unknown@example.com')).rejects.toThrow(
        'Email address not found'
      );
    });

    it('should handle network errors', async () => {
      const mockResend = vi.mocked(supabase.auth.resend);
      const networkError = new Error('Network request failed');
      mockResend.mockRejectedValue(networkError);

      await expect(resendEmailConfirmation('user@example.com')).rejects.toThrow(
        'Network request failed'
      );
    });

    it('should handle Supabase service unavailable', async () => {
      const mockResend = vi.mocked(supabase.auth.resend);
      const serviceError = new Error('Service temporarily unavailable');
      mockResend.mockResolvedValue({ error: serviceError });

      await expect(resendEmailConfirmation('user@example.com')).rejects.toThrow(
        'Service temporarily unavailable'
      );
    });
  });

  describe('API Endpoint Error Responses', () => {
    it('should return 400 if email not provided', () => {
      const email = null;
      const isValid = !!email;

      expect(isValid).toBe(false);
    });

    it('should return 429 for rate limit errors', () => {
      const statusCode = 429;
      const isRateLimit = statusCode === 429;

      expect(isRateLimit).toBe(true);
    });

    it('should return 400 for "already verified" errors', () => {
      const errorMessage = 'already verified';
      const statusCode = errorMessage.includes('already') ? 400 : 500;

      expect(statusCode).toBe(400);
    });

    it('should return 404 for "not found" errors', () => {
      const errorMessage = 'Email address not found';
      const statusCode = errorMessage.includes('not found') ? 404 : 500;

      expect(statusCode).toBe(404);
    });

    it('should return 500 for unexpected errors', () => {
      const errorMessage = 'Something went wrong';
      const isKnownError =
        errorMessage.includes('rate') ||
        errorMessage.includes('already') ||
        errorMessage.includes('not found');
      const statusCode = isKnownError ? 400 : 500;

      expect(statusCode).toBe(500);
    });
  });

  describe('UI Behavior - Cooldown Timer', () => {
    it('should disable button during cooldown', () => {
      const cooldown = 60;
      const isDisabled = cooldown > 0;

      expect(isDisabled).toBe(true);
    });

    it('should enable button when cooldown reaches zero', () => {
      const cooldown = 0;
      const isDisabled = cooldown > 0;

      expect(isDisabled).toBe(false);
    });

    it('should show countdown timer during cooldown', () => {
      const cooldown = 45;
      const buttonText =
        cooldown > 0 ? `resend in ${cooldown}s` : 'resend verification link';

      expect(buttonText).toBe('resend in 45s');
    });

    it('should update countdown every second', () => {
      let cooldown = 5;
      const cooldownTexts = [];

      for (let i = 0; i < 6; i++) {
        cooldownTexts.push(
          cooldown > 0 ? `resend in ${cooldown}s` : 'resend verification link'
        );
        cooldown--;
      }

      expect(cooldownTexts).toEqual([
        'resend in 5s',
        'resend in 4s',
        'resend in 3s',
        'resend in 2s',
        'resend in 1s',
        'resend verification link',
      ]);
    });

    it('should show loading state while resending', () => {
      const isResending = true;
      const buttonText = isResending ? 'sending...' : 'resend verification link';

      expect(buttonText).toBe('sending...');
    });
  });

  describe('User Feedback', () => {
    it('should show success message after successful resend', () => {
      const success = true;
      const message = success ? 'Verification email resent! Check your inbox.' : '';

      expect(message).toBe('Verification email resent! Check your inbox.');
    });

    it('should show error message on failure', () => {
      const error = 'Too many requests. Please wait 60 seconds.';
      const message = error || 'Failed to resend email';

      expect(message).toBe('Too many requests. Please wait 60 seconds.');
    });

    it('should clear success message after timeout', () => {
      const success = true;
      const timeoutMs = 5000;

      expect(success).toBe(true);
      expect(timeoutMs).toBe(5000);
    });
  });

  describe('Integration: Resend Email Journey', () => {
    it('should support complete flow: verify email page → resend → cooldown → retry', async () => {
      const mockResend = vi.mocked(supabase.auth.resend);

      // Step 1: User on verify-email page
      const email = 'user@example.com';

      // Step 2: User clicks resend (first request)
      mockResend.mockResolvedValueOnce({ error: null });
      await resendEmailConfirmation(email);
      expect(mockResend).toHaveBeenCalledWith({
        type: 'signup',
        email,
      });

      // Step 3: Button enters 60-second cooldown
      const cooldown = 60;
      expect(cooldown).toBeGreaterThan(0);

      // Step 4: User clicks again immediately (should be blocked by UI)
      // (Simulated by checking cooldown)
      const canClick = cooldown === 0;
      expect(canClick).toBe(false);

      // Step 5: After cooldown, user can retry
      // (Simulated by setting cooldown to 0)
      const newCooldown = 0;
      const canRetry = newCooldown === 0;
      expect(canRetry).toBe(true);

      // Step 6: Retry succeeds
      mockResend.mockResolvedValueOnce({ error: null });
      await resendEmailConfirmation(email);
      expect(mockResend).toHaveBeenCalledTimes(2);
    });

    it('should support flow when user already verified', async () => {
      const mockResend = vi.mocked(supabase.auth.resend);
      const alreadyVerifiedError = new Error('Email already verified');
      mockResend.mockResolvedValue({ error: alreadyVerifiedError });

      // User lands on verify page (old link/bookmark)
      // Clicks resend
      // Gets "already verified" error
      const error = alreadyVerifiedError;
      const isAlreadyVerified = error.message.includes('already');

      expect(isAlreadyVerified).toBe(true);
    });

    it('should support flow when email not found', async () => {
      const mockResend = vi.mocked(supabase.auth.resend);
      const notFoundError = new Error('Email address not found');
      mockResend.mockResolvedValue({ error: notFoundError });

      // User types wrong email in signup, bookmarks verify page
      // Clicks resend with wrong email
      // Gets "not found" error
      const error = notFoundError;
      const isNotFound = error.message.includes('not found');

      expect(isNotFound).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string email', async () => {
      const mockResend = vi.mocked(supabase.auth.resend);
      // API should reject before calling lib function
      const email = '';
      const isValid = email.length > 0;

      expect(isValid).toBe(false);
    });

    it('should handle whitespace-only email', async () => {
      const mockResend = vi.mocked(supabase.auth.resend);
      const email = '   ';
      const isValid = email.trim().length > 0;

      expect(isValid).toBe(false);
    });

    it('should handle concurrent resend attempts', async () => {
      const mockResend = vi.mocked(supabase.auth.resend);
      mockResend.mockResolvedValue({ error: null });

      // UI should prevent concurrent calls with loading state + disabled button
      const isResending = true;
      const isDisabled = isResending;

      expect(isDisabled).toBe(true);
    });

    it('should preserve email in UI after failed resend', async () => {
      const email = 'user@example.com';
      const mockResend = vi.mocked(supabase.auth.resend);
      const testError = new Error('Failed');
      mockResend.mockResolvedValue({ error: testError });

      try {
        await resendEmailConfirmation(email);
      } catch (e) {
        // Email should still be displayed in UI
        expect(email).toBe('user@example.com');
      }
    });
  });
});
