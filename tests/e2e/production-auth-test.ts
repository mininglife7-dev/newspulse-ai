import { test, expect } from '@playwright/test';

const PROD_URL = 'https://newspulse-ai-eight.vercel.app';

test.describe('Production Authentication Configuration Audit', () => {
  test('Check production landing page accessibility', async ({ page }) => {
    try {
      await page.goto(PROD_URL, { waitUntil: 'networkidle', timeout: 15000 });
      console.log(`✓ Production URL accessible: ${PROD_URL}`);
      console.log(`  Status: ${page.url()}`);
    } catch (error) {
      console.error(`✗ Cannot reach production URL: ${error}`);
      throw error;
    }
  });

  test('Inspect signup form and network calls', async ({ page, context }) => {
    // Navigate to signup
    await page.goto(`${PROD_URL}/auth/signup`, { waitUntil: 'networkidle' });

    // Capture network activity
    const networkErrors: any[] = [];
    page.on('response', (response) => {
      if (!response.ok()) {
        networkErrors.push({
          url: response.url(),
          status: response.status(),
          statusText: response.statusText(),
        });
      }
    });

    // Try to fill signup form (don't submit yet)
    const emailInput = page.locator('input[name="email"]');
    const passwordInput = page.locator('input[name="password"]');
    const firstNameInput = page.locator('input[name="firstName"]');
    const lastNameInput = page.locator('input[name="lastName"]');

    if (await emailInput.isVisible({ timeout: 5000 })) {
      console.log('✓ Signup form elements visible');

      // Get form element to check if form submission is configured
      const form = page.locator('form');
      const formAction = await form.getAttribute('action');
      console.log(`  Form action: ${formAction || 'none (client-side)'}`);
    } else {
      console.log('✗ Signup form NOT visible');
    }

    // Check for API route calls that would happen
    await page.fill('input[name="firstName"]', 'Test');
    await page.fill('input[name="lastName"]', 'User');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.fill('input[name="confirmPassword"]', 'TestPassword123!');
    await page.check('input[type="checkbox"]');

    // DO NOT SUBMIT - just verify form is ready
    const submitBtn = page.locator('button:has-text("Create account")');
    if (await submitBtn.isVisible()) {
      console.log('✓ Submit button visible');
    } else {
      console.log('✗ Submit button NOT visible');
    }

    if (networkErrors.length > 0) {
      console.log('Network errors detected:');
      networkErrors.forEach((err) => {
        console.log(`  ${err.status} ${err.url}`);
      });
    }
  });

  test('Check Supabase connectivity from production', async ({ page }) => {
    // Navigate to production
    await page.goto(PROD_URL, { waitUntil: 'networkidle' });

    // Check console for Supabase initialization errors
    const consoleMessages: any[] = [];
    page.on('console', (msg) => {
      if (
        msg.type() === 'error' ||
        msg.text().includes('Supabase') ||
        msg.text().includes('Error')
      ) {
        consoleMessages.push({
          type: msg.type(),
          text: msg.text(),
          location: msg.location(),
        });
      }
    });

    await page.waitForTimeout(2000); // Give time for any async errors

    if (consoleMessages.length > 0) {
      console.log('Console errors/warnings:');
      consoleMessages.forEach((msg) => {
        console.log(`  [${msg.type}] ${msg.text}`);
      });
    } else {
      console.log('✓ No Supabase-related console errors');
    }
  });

  test('Verify production API endpoints are working', async ({ request }) => {
    // Test health endpoint
    const healthResponse = await request.get(`${PROD_URL}/api/health`);
    console.log(
      `Health endpoint: ${healthResponse.status()} ${healthResponse.statusText()}`
    );
    if (healthResponse.ok()) {
      const data = await healthResponse.json();
      console.log(`  Response:`, JSON.stringify(data, null, 2));
    }

    // Test readiness endpoint
    const readinessResponse = await request.get(`${PROD_URL}/api/readiness`);
    console.log(
      `Readiness endpoint: ${readinessResponse.status()} ${readinessResponse.statusText()}`
    );
    if (readinessResponse.ok() || readinessResponse.status() === 503) {
      const data = await readinessResponse.json();
      console.log(`  Response:`, JSON.stringify(data, null, 2));
    }
  });

  test('Check auth configuration via page metadata', async ({ page }) => {
    await page.goto(PROD_URL, { waitUntil: 'networkidle' });

    // Check if there are any meta tags or script tags indicating Supabase config
    const scripts = await page.locator('script').count();
    console.log(`Total scripts on page: ${scripts}`);

    // Look for Supabase client initialization
    const pageContent = await page.content();
    const hasSupabaseConfig = pageContent.includes('NEXT_PUBLIC_SUPABASE');
    console.log(`Supabase config in page: ${hasSupabaseConfig ? 'Yes' : 'No'}`);

    // Check for error indicators
    const errorIndicators = pageContent.match(
      /error|Error|ERROR|failed|Failed/gi
    );
    if (errorIndicators && errorIndicators.length > 5) {
      console.log(
        `⚠️ High error keyword frequency detected (${errorIndicators.length} matches)`
      );
    }
  });
});
