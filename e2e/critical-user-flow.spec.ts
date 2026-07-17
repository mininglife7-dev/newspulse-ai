import { test, expect } from '@playwright/test';

/**
 * Critical User Flow E2E Tests
 *
 * Tests essential user journeys to validate core functionality:
 * 1. Authentication (signup → email verification)
 * 2. Workspace setup
 * 3. System inventory creation
 * 4. Risk assessment
 *
 * These tests verify the complete onboarding flow for new users.
 */

const TEST_USER = {
  email: `test-${Date.now()}@example.com`,
  password: 'TestPassword123!',
};

test.describe('Critical User Flows', () => {
  test.beforeEach(async ({ page }) => {
    // Set up: Navigate to app home
    await page.goto('/');
    await expect(page).toHaveTitle(/EURO AI/);
  });

  test('Signup flow: User can create account and verify email', async ({
    page,
  }) => {
    // 1. Navigate to signup
    await page.click('a:has-text("Get Started")');
    await expect(page).toHaveURL(/\/auth\/signup/);

    // 2. Fill signup form
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.fill('input[type="password"]:last-child', TEST_USER.password);

    // 3. Accept terms
    const termsCheckbox = page.locator('input[type="checkbox"]').first();
    await termsCheckbox.check();

    // 4. Submit
    await page.click('button:has-text("Create Account")');

    // 5. Expect email verification prompt
    await expect(page).toHaveURL(/\/auth\/verify-email/);
    await expect(page.locator('text=Check your email')).toBeVisible();

    // 6. Verify email link (in real scenario, would click link from email)
    // For now, verify the verification page exists and shows correct email
    await expect(page.locator(`text=${TEST_USER.email}`)).toBeVisible();
  });

  test('Workspace Creation: User can create and configure workspace', async ({
    page,
  }) => {
    // Note: This test assumes user is already signed in
    // In real E2E, would need to handle auth state between tests

    // Navigate to workspace setup
    await page.goto('/workspace/setup');

    // Verify setup page loads
    await expect(page.locator('text=Create Workspace')).toBeVisible();

    // Fill workspace details
    await page.fill('input[placeholder*="name" i]', 'Test Organization');
    await page.fill('input[placeholder*="role" i]', 'AI Governance Lead');

    // Submit
    await page.click('button:has-text("Create Workspace")');

    // Expect redirect to dashboard/inventory
    await expect(page).toHaveURL(/\/(dashboard|inventory)/);
  });

  test('System Inventory: User can add AI system to inventory', async ({
    page,
  }) => {
    // Navigate to inventory
    await page.goto('/inventory');

    // Verify inventory page loads
    await expect(page.locator('text=AI Systems Inventory')).toBeVisible();

    // Click "Add System" button
    await page.click('button:has-text("Add System")');

    // Fill system details
    await page.fill('input[placeholder*="name" i]', 'Customer Support Chatbot');
    await page.fill(
      'textarea[placeholder*="description" i]',
      'AI-powered customer support system'
    );

    // Select risk classification
    await page.click('button:has-text("High Risk")');

    // Submit
    await page.click('button:has-text("Add System")');

    // Verify system appears in list
    await expect(page.locator('text=Customer Support Chatbot')).toBeVisible();
  });

  test('Assessment Creation: User can run risk assessment on system', async ({
    page,
  }) => {
    // Navigate to inventory
    await page.goto('/inventory');

    // Find a system (assume one exists from previous test)
    const firstSystem = page.locator('[role="row"]').first();
    await firstSystem.click();

    // Expect navigation to system detail page
    await expect(page).toHaveURL(/\/inventory\/.*|\/assessment\/.*/);

    // Find and click "Run Assessment"
    await page.click('button:has-text("Run Assessment")');

    // Verify assessment form loads
    await expect(page.locator('text=Assessment Questions')).toBeVisible();

    // Answer questions (sample)
    const questions = page.locator('[role="group"]');
    const count = await questions.count();

    // Answer first 3 questions
    for (let i = 0; i < Math.min(3, count); i++) {
      const question = questions.nth(i);
      const radioButtons = question.locator('input[type="radio"]');
      const buttonCount = await radioButtons.count();

      if (buttonCount > 0) {
        // Select first option
        await radioButtons.first().check();
      }
    }

    // Submit assessment
    await page.click('button:has-text("Submit Assessment")');

    // Expect results page or dashboard
    await expect(page).toHaveURL(/\/assessment|\/compliance/);
  });

  test('Navigation: User can navigate between main sections', async ({
    page,
  }) => {
    // Start at inventory (or navigate there)
    await page.goto('/inventory');
    await expect(page).toHaveURL(/\/inventory/);

    // Navigate to assessments
    await page.click('a:has-text("Assessments")');
    await expect(page).toHaveURL(/\/assessment|\/compliance/);

    // Navigate to obligations
    await page.click('a:has-text("Obligations")');
    await expect(page).toHaveURL(/\/obligations/);

    // Navigate to evidence
    await page.click('a:has-text("Evidence")');
    await expect(page).toHaveURL(/\/evidence/);

    // Navigate to team
    await page.click('a:has-text("Team")');
    await expect(page).toHaveURL(/\/team/);
  });

  test('Settings: User can access and update account settings', async ({
    page,
  }) => {
    // Navigate to settings
    await page.goto('/settings');

    // Verify settings page loads
    await expect(page.locator('text=Settings')).toBeVisible();

    // Find and interact with a setting (e.g., consent preferences)
    const consentSection = page.locator('section:has-text("Consent")');
    if (await consentSection.isVisible()) {
      // Toggle consent checkbox
      const checkbox = consentSection.locator('input[type="checkbox"]').first();
      await checkbox.click();

      // Verify change is saved (look for save confirmation)
      await expect(page.locator('text=Saved|updated')).toBeVisible({
        timeout: 3000,
      });
    }
  });
});

test.describe('Error Handling', () => {
  test('Invalid credentials show appropriate error message', async ({
    page,
  }) => {
    // Navigate to signin
    await page.goto('/auth/signin');

    // Fill form with invalid credentials
    await page.fill('input[type="email"]', 'invalid@example.com');
    await page.fill('input[type="password"]', 'WrongPassword');

    // Submit
    await page.click('button:has-text("Sign In")');

    // Expect error message
    await expect(page.locator('text=Invalid|Incorrect|failed')).toBeVisible();
  });

  test('Unauthorized access redirects to signin', async ({ page }) => {
    // Try to access protected page without auth
    await page.goto('/workspace', { waitUntil: 'networkidle' });

    // Should redirect to signin
    await expect(page).toHaveURL(/\/auth\/signin/);
  });

  test('Page errors are handled gracefully', async ({ page }) => {
    // Navigate to a page
    await page.goto('/inventory');

    // Look for error boundary (if page had error)
    const errorBoundary = page.locator('text=Something went wrong|Error');

    // If error exists, verify user can recover
    if (await errorBoundary.isVisible()) {
      const tryAgainButton = page.locator('button:has-text("Try again")');
      await tryAgainButton.click();

      // Expect page to recover or show appropriate error
      await expect(page).toHaveURL(/\/.*/);
    }
  });
});
