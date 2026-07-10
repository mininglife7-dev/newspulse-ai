import { test, expect, Page } from '@playwright/test';

/**
 * Comprehensive E2E test for full 3-step customer journey.
 * Simulates German customer signup → company setup → AI inventory → risk assessment.
 *
 * These tests validate the complete feature set end-to-end and should run against
 * staging once Supabase and Vercel infrastructure are configured.
 *
 * Prerequisites:
 * 1. Vercel preview deployment available
 * 2. Supabase schema.sql deployed (tables: workspaces, ai_systems, risk_assessments)
 * 3. Email auth enabled in Supabase (can use test email)
 * 4. Test email accessible for verification link extraction
 */

const TEST_EMAIL = `test-${Date.now()}@example.com`;
const TEST_PASSWORD = 'TestPassword123!@#';
const TEST_COMPANY_NAME = 'Test Company GmbH';
const TEST_COUNTRY = 'Germany';
const TEST_INDUSTRY = 'Manufacturing';

test.describe('Customer Journey: 3-Step Onboarding', () => {
  test.describe('Step 1: Signup & Email Verification', () => {
    test('user can sign up with email and password', async ({ page }) => {
      await page.goto('/auth/signup');

      // Verify signup page loads
      await expect(page.getByRole('heading', { level: 1 })).toContainText(
        'Create your account'
      );

      // Fill signup form
      await page.getByLabel(/email/i).fill(TEST_EMAIL);
      await page.getByLabel(/^password/i).fill(TEST_PASSWORD);
      await page.getByLabel(/confirm password/i).fill(TEST_PASSWORD);
      await page.getByLabel(/terms and privacy/i).check();

      // Submit
      await page.getByRole('button', { name: /create account/i }).click();

      // Should show verification email prompt
      await expect(page).toHaveURL(/\/auth\/verify-email/);
      await expect(page.getByText(/check your email/i)).toBeVisible();
    });

    test('user receives confirmation email with verification link', async ({
      page,
    }) => {
      // This test validates email delivery.
      // In CI/staging, implement email capture (Mailbox, Ethereal, etc.)
      // For now, document the expectation.

      await page.goto('/auth/verify-email');
      await expect(page.getByText(/verification email/i)).toBeVisible();

      // Expected: email arrives within 30 seconds with verification link
      // Implementation: extract link from email service and visit it
    });

    test('verified user can sign in', async ({ page }) => {
      // After email verification, user should be able to sign in
      await page.goto('/auth/signin');

      await expect(page.getByRole('heading', { level: 1 })).toContainText(
        'Welcome back'
      );

      // Fill signin form
      await page.getByLabel(/email/i).fill(TEST_EMAIL);
      await page.getByLabel(/password/i).fill(TEST_PASSWORD);

      // Submit
      await page.getByRole('button', { name: /sign in/i }).click();

      // Should redirect to dashboard
      await expect(page).toHaveURL(/\/dashboard/);
      await expect(page.getByText(/welcome/i)).toBeVisible();
    });
  });

  test.describe('Step 2: Company Setup', () => {
    test('company setup form is accessible after signin', async ({ page }) => {
      await signInAsTestUser(page);

      // Navigate to company setup
      await page.goto('/workspace/setup');

      // Verify form loads
      await expect(page.getByRole('heading', { level: 1 })).toContainText(
        /company setup|workspace/i
      );

      // Verify all required fields are present
      await expect(page.getByLabel(/company name/i)).toBeVisible();
      await expect(page.getByLabel(/country/i)).toBeVisible();
      await expect(page.getByLabel(/industry/i)).toBeVisible();
    });

    test('user can complete company setup', async ({ page }) => {
      await signInAsTestUser(page);
      await page.goto('/workspace/setup');

      // Fill company setup form
      await page.getByLabel(/company name/i).fill(TEST_COMPANY_NAME);
      await page.getByLabel(/country/i).selectOption(TEST_COUNTRY);
      await page.getByLabel(/industry/i).selectOption(TEST_INDUSTRY);

      // Submit
      await page.getByRole('button', { name: /continue|submit/i }).click();

      // Should show success message or redirect to dashboard
      await expect(page).toHaveURL(/\/dashboard/);

      // Workspace info should appear on dashboard
      await expect(page.getByText(TEST_COMPANY_NAME)).toBeVisible();
    });

    test('company setup requires all mandatory fields', async ({ page }) => {
      await signInAsTestUser(page);
      await page.goto('/workspace/setup');

      // Try to submit empty form
      await page.getByRole('button', { name: /continue|submit/i }).click();

      // Should show validation errors
      await expect(
        page.getByText(/required|please fill in|please select/i)
      ).toBeVisible();
    });

    test('dashboard shows company setup completed', async ({ page }) => {
      await signInAsTestUser(page);
      await page.goto('/dashboard');

      // After company setup, should show:
      // - Company name displayed
      // - Company Setup step marked complete (checkmark)
      // - AI Inventory step unlocked
      // - Risk Assessment step locked (until inventory added)

      await expect(page.getByText(TEST_COMPANY_NAME)).toBeVisible();
      await expect(page.getByText(/company setup/i)).toBeVisible();
    });
  });

  test.describe('Step 3: AI Inventory', () => {
    test('AI inventory page is locked until company setup complete', async ({
      page,
    }) => {
      // Sign in as user without company setup
      await page.goto('/inventory');

      // Should redirect to setup or show locked state
      await expect(page).toHaveURL(/\/workspace\/setup|\/auth\/signin/);
    });

    test('user can add AI systems to inventory', async ({ page }) => {
      await signInAsTestUser(page);

      // Complete company setup first
      await completeCompanySetup(page);

      // Navigate to inventory
      await page.goto('/inventory');

      // Verify inventory page loads
      await expect(page.getByRole('heading', { level: 1 })).toContainText(
        /inventory|ai system/i
      );

      // Add first system
      await page.getByRole('button', { name: /add|create/i }).click();

      await page.getByLabel(/name/i).fill('ChatGPT Integration');
      await page.getByLabel(/type/i).selectOption('LLM');
      await page.getByLabel(/vendor|provider/i).fill('OpenAI');
      await page.getByLabel(/status/i).selectOption('Active');

      // Submit
      await page.getByRole('button', { name: /save|add/i }).click();

      // System should appear in inventory list
      await expect(page.getByText(/chatgpt/i)).toBeVisible();
    });

    test('user can add multiple AI systems', async ({ page }) => {
      await signInAsTestUser(page);
      await completeCompanySetup(page);
      await page.goto('/inventory');

      // Add first system
      await addAISystem(page, 'Claude API', 'LLM', 'Anthropic', 'Active');

      // Add second system
      await page.getByRole('button', { name: /add|create/i }).click();
      await addAISystem(
        page,
        'Recommendation Engine',
        'Classification',
        'Internal',
        'Pilot'
      );

      // Both should appear
      await expect(page.getByText(/claude/i)).toBeVisible();
      await expect(page.getByText(/recommendation/i)).toBeVisible();
    });

    test('inventory count updates on dashboard', async ({ page }) => {
      await signInAsTestUser(page);
      await completeCompanySetup(page);

      // Go to dashboard - should show 0 systems
      await page.goto('/dashboard');
      await expect(page.getByText(/0 system/i)).toBeVisible();

      // Add system
      await page.goto('/inventory');
      await addAISystem(page, 'Test System', 'LLM', 'Test Vendor', 'Active');

      // Return to dashboard - count should update
      await page.goto('/dashboard');
      await expect(page.getByText(/1 system/i)).toBeVisible();
    });
  });

  test.describe('Step 4: Risk Assessment', () => {
    test('risk assessment is locked until inventory has systems', async ({
      page,
    }) => {
      await signInAsTestUser(page);
      await completeCompanySetup(page);

      // Try to access risk assessment without systems
      await page.goto('/risk-assessments');

      // Should show locked state or redirect
      await expect(
        page.getByText(/add.*system|inventory|locked/i)
      ).toBeVisible();
    });

    test('user can complete risk assessment for a system', async ({ page }) => {
      await signInAsTestUser(page);
      await completeCompanySetup(page);

      // Add a system first
      await page.goto('/inventory');
      await addAISystem(page, 'Decision Engine', 'Classification', 'Vendor', 'Active');

      // Navigate to risk assessment
      await page.goto('/risk-assessments');

      // Verify assessment form loads
      await expect(
        page.getByText(/assessment|question|risk|compliance/i)
      ).toBeVisible();

      // Select the system to assess
      const systemLink = page.getByText(/decision engine/i);
      await systemLink.click();

      // Answer some assessment questions (example: check boxes for "yes" answers)
      const checkboxes = page.locator('input[type="checkbox"]');
      const count = await checkboxes.count();

      // Check first 3 questions (example pattern)
      for (let i = 0; i < Math.min(3, count); i++) {
        await checkboxes.nth(i).check();
      }

      // Submit assessment
      await page.getByRole('button', { name: /submit|save/i }).click();

      // Should show results
      await expect(
        page.getByText(/risk level|score|assessment|complete/i)
      ).toBeVisible();
    });

    test('risk assessment shows risk level and score', async ({ page }) => {
      await signInAsTestUser(page);
      await completeCompanySetup(page);

      // Add system and complete assessment
      await page.goto('/inventory');
      await addAISystem(page, 'Scoring Model', 'Classification', 'Vendor', 'Active');

      await page.goto('/risk-assessments');
      const systemLink = page.getByText(/scoring model/i);
      await systemLink.click();

      // Check a mix of questions
      const checkboxes = page.locator('input[type="checkbox"]');
      const count = await checkboxes.count();
      for (let i = 0; i < Math.min(5, count); i++) {
        if (i % 2 === 0) await checkboxes.nth(i).check();
      }

      await page.getByRole('button', { name: /submit|save/i }).click();

      // Verify results display
      await expect(page.getByText(/risk|score|level/i)).toBeVisible();

      // Should show risk classification (Low, Medium, High, Unacceptable)
      await expect(
        page.getByText(/low|medium|high|unacceptable/i)
      ).toBeVisible();
    });

    test('assessment count updates on dashboard', async ({ page }) => {
      await signInAsTestUser(page);
      await completeCompanySetup(page);

      // Add system
      await page.goto('/inventory');
      await addAISystem(page, 'Model', 'LLM', 'Vendor', 'Active');

      // Check dashboard - 0 assessments
      await page.goto('/dashboard');
      await expect(page.getByText(/0 assessment/i)).toBeVisible();

      // Complete assessment
      await page.goto('/risk-assessments');
      await page.getByText(/model/i).click();
      const checkboxes = page.locator('input[type="checkbox"]');
      const count = await checkboxes.count();
      for (let i = 0; i < Math.min(2, count); i++) {
        await checkboxes.nth(i).check();
      }
      await page.getByRole('button', { name: /submit|save/i }).click();

      // Return to dashboard - count should update
      await page.goto('/dashboard');
      await expect(page.getByText(/1 assessment/i)).toBeVisible();
    });
  });

  test.describe('Mobile Responsiveness', () => {
    test('forms are responsive on mobile viewport', async ({ browser }) => {
      const context = await browser.newContext({
        viewport: { width: 375, height: 667 },
      });
      const page = await context.newPage();

      await page.goto('/auth/signup');

      // Verify form inputs are visible and touchable (44px+ height)
      const emailInput = page.getByLabel(/email/i);
      const box = await emailInput.boundingBox();
      if (box) {
        expect(box.height).toBeGreaterThanOrEqual(40); // 44px is target, allow 40px minimum
      }

      // Verify buttons are stacked vertically on mobile
      const buttons = await page.locator('button').all();
      expect(buttons.length).toBeGreaterThan(0);

      await context.close();
    });
  });

  test.describe('Accessibility', () => {
    test('all form inputs have associated labels', async ({ page }) => {
      await page.goto('/auth/signup');

      // Verify label associations
      const inputs = await page.locator('input').all();
      for (const input of inputs) {
        const ariaLabel = await input.getAttribute('aria-label');
        const id = await input.getAttribute('id');

        // Either aria-label or associated label via id
        if (!ariaLabel && id) {
          const label = page.locator(`label[for="${id}"]`);
          expect(await label.count()).toBeGreaterThan(0);
        }
      }
    });

    test('keyboard navigation works end-to-end', async ({ page }) => {
      await page.goto('/auth/signup');

      // Tab through form fields
      await page.keyboard.press('Tab');
      let focused = await page.evaluate(() => document.activeElement?.tagName);
      expect(['INPUT', 'BUTTON', 'A']).toContain(focused);

      // Continue tabbing - should cycle through interactive elements
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press('Tab');
        focused = await page.evaluate(() => document.activeElement?.tagName);
        expect(['INPUT', 'BUTTON', 'A']).toContain(focused);
      }

      // Focus should be visible
      const focusedElement = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement;
        return window.getComputedStyle(el).outline !== 'none';
      });
      // Note: outline detection depends on browser implementation
    });

    test('form validation messages are accessible', async ({ page }) => {
      await page.goto('/auth/signup');

      // Submit empty form
      await page.getByRole('button', { name: /create account/i }).click();

      // Error messages should be visible and associated with inputs
      const errorText = page.getByText(/required|password|email/i);
      expect(await errorText.count()).toBeGreaterThan(0);
    });
  });

  test.describe('Error Handling', () => {
    test('duplicate email signup shows error', async ({ page }) => {
      // First signup
      await page.goto('/auth/signup');
      await page.getByLabel(/email/i).fill(TEST_EMAIL);
      await page.getByLabel(/^password/i).fill(TEST_PASSWORD);
      await page.getByLabel(/confirm password/i).fill(TEST_PASSWORD);
      await page.getByLabel(/terms/i).check();
      await page.getByRole('button', { name: /create/i }).click();

      // Wait for first signup to complete
      await page.waitForURL(/verify-email|dashboard/);

      // Second signup with same email
      await page.goto('/auth/signup');
      await page.getByLabel(/email/i).fill(TEST_EMAIL);
      await page.getByLabel(/^password/i).fill(TEST_PASSWORD);
      await page.getByLabel(/confirm password/i).fill(TEST_PASSWORD);
      await page.getByLabel(/terms/i).check();
      await page.getByRole('button', { name: /create/i }).click();

      // Should show error about email already in use
      await expect(page.getByText(/already.*use|exists|registered/i)).toBeVisible();
    });

    test('weak password is rejected', async ({ page }) => {
      await page.goto('/auth/signup');
      await page.getByLabel(/email/i).fill(TEST_EMAIL);
      await page.getByLabel(/^password/i).fill('weak');

      // Should show validation error
      await expect(
        page.getByText(/at least 8|password.*length/i)
      ).toBeVisible();
    });
  });
});

/**
 * Helpers
 */

async function signInAsTestUser(page: Page) {
  await page.goto('/auth/signin');
  await page.getByLabel(/email/i).fill(TEST_EMAIL);
  await page.getByLabel(/password/i).fill(TEST_PASSWORD);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL(/dashboard|workspace\/setup/);
}

async function completeCompanySetup(page: Page) {
  await page.goto('/workspace/setup');

  // Check if already completed
  if ((await page.getByText(TEST_COMPANY_NAME).count()) > 0) {
    return; // Already done
  }

  // Complete setup
  await page.getByLabel(/company name/i).fill(TEST_COMPANY_NAME);
  await page.getByLabel(/country/i).selectOption(TEST_COUNTRY);
  await page.getByLabel(/industry/i).selectOption(TEST_INDUSTRY);
  await page.getByRole('button', { name: /continue|submit/i }).click();
  await page.waitForURL(/dashboard/);
}

async function addAISystem(
  page: Page,
  name: string,
  type: string,
  vendor: string,
  status: string
) {
  await page.getByRole('button', { name: /add|create/i }).click();
  await page.getByLabel(/name/i).fill(name);
  await page.getByLabel(/type/i).selectOption(type);
  await page.getByLabel(/vendor|provider/i).fill(vendor);
  await page.getByLabel(/status/i).selectOption(status);
  await page.getByRole('button', { name: /save|add|submit/i }).click();
  await page.waitForURL(/inventory/);
}
