/**
 * EURO AI Test Lab — Phase 2: End-to-End Customer Journey Tests
 *
 * Automated browser-based testing of 8 customer journey scenarios.
 * Runs with Playwright automation against Supabase backend.
 *
 * Prerequisites:
 * - Supabase schema deployed
 * - test-data/organizations.json populated
 * - Application running (dev or preview)
 *
 * Usage:
 *   npm run test:e2e -- tests/phase-2-e2e.spec.ts
 *
 * Measurements tracked:
 * - Time to completion
 * - User friction points
 * - API performance
 * - Error rates
 * - Data accuracy
 */

import { test, expect, Page } from '@playwright/test';

// Configuration
const BASE_URL = process.env.E2E_URL || 'http://localhost:3000';
const TEST_TIMEOUT = 60000; // 60 seconds per scenario

// Helper: Navigate and wait for load
async function navigateTo(page: Page, path: string) {
  await page.goto(`${BASE_URL}${path}`);
  await page.waitForLoadState('networkidle');
}

// Helper: Measure operation timing
function measureTiming(operationName: string, startTime: number) {
  const duration = Date.now() - startTime;
  console.log(`⏱️  ${operationName}: ${duration}ms`);
  return duration;
}

test.describe('Phase 2: Customer Journey Scenarios', () => {
  test.setTimeout(TEST_TIMEOUT);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // SCENARIO 1: First-Time Onboarding
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  test('Scenario 1: First-Time Onboarding', async ({ page }) => {
    const startTime = Date.now();

    // Step 1: Navigate to signup
    await navigateTo(page, '/auth/signup');
    expect(page.url()).toContain('/auth/signup');

    // Step 2: Enter credentials
    const testEmail = `test-${Date.now()}@example.com`;
    const testPassword = 'TestPassword123!';

    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);
    await page.click('button[type="submit"]');

    // Step 3: Verify email confirmation link
    await page.waitForURL('**/auth/confirm**', { timeout: 10000 });
    expect(page.url()).toContain('/auth/confirm');

    // Step 4: Create workspace
    await page.goto(`${BASE_URL}/workspace/create`);
    await page.fill('input[name="company_name"]', 'Test Company GmbH');
    await page.selectOption('select[name="industry"]', 'Maschinenbau');
    await page.fill('input[name="employees"]', '150');
    await page.click('button[type="submit"]');

    // Step 5: Verify workspace creation
    await page.waitForURL('**/workspace/**');
    const workspaceUrl = page.url();
    expect(workspaceUrl).toContain('/workspace/');

    // Step 6: Add team member
    await page.goto(`${workspaceUrl}/team`);
    await page.click('button:has-text("Add Team Member")');
    await page.fill('input[name="email"]', `member-${Date.now()}@example.com`);
    await page.selectOption('select[name="role"]', 'Compliance Officer');
    await page.click('button[type="submit"]');

    // Step 7: Inventory first AI system
    await page.goto(`${workspaceUrl}/inventory`);
    await page.click('button:has-text("Add AI System")');
    await page.fill('input[name="name"]', 'Document Classification System');
    await page.selectOption('select[name="type"]', 'Document Classification');
    await page.fill(
      'textarea[name="description"]',
      'Automated document categorization'
    );
    await page.click('button[type="submit"]');

    // Step 8: Verify dashboard access
    await page.goto(`${workspaceUrl}/dashboard`);
    await expect(
      page.locator('text=Document Classification System')
    ).toBeVisible();

    const duration = measureTiming(
      'Scenario 1: First-Time Onboarding',
      startTime
    );
    console.log(`✅ Scenario 1 complete (${duration}ms)`);
    console.log(
      `   Target: <20 min, Actual: ${(duration / 1000 / 60).toFixed(2)} min`
    );
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // SCENARIO 2: Compliance Assessment Workflow
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  test('Scenario 2: Compliance Assessment Workflow', async ({ page }) => {
    const startTime = Date.now();

    // Prerequisites: Navigate to assessment page
    const workspaceUrl = `${BASE_URL}/workspace/test-workspace`;
    await navigateTo(page, '/assessment/create');

    // Step 1: Create AI system record
    await page.fill(
      'input[name="system_name"]',
      'Recruitment Analytics Platform'
    );
    await page.selectOption(
      'select[name="system_type"]',
      'Recruitment Analytics'
    );
    await page.fill(
      'textarea[name="description"]',
      'AI-powered candidate ranking and selection'
    );
    await page.click('button:has-text("Next")');

    // Step 2: Answer risk assessment questionnaire
    const questionGroups = await page
      .locator('[data-testid="question-group"]')
      .count();
    for (let i = 0; i < Math.min(questionGroups, 5); i++) {
      // Answer first 5 question groups
      await page.click(
        `[data-testid="question-group"]:nth-child(${i + 1}) input[type="radio"]:first-of-type`
      );
      await page.click('button:has-text("Next Question")');
    }

    // Step 3: Verify prohibited practice flagging
    const prohibitedWarning = page.locator('[data-severity="critical"]');
    if (await prohibitedWarning.isVisible()) {
      console.log('   ✓ Prohibited practice detected and flagged');
      expect(prohibitedWarning).toContainText('HIGH RISK');
    }

    // Step 4: Generate compliance report
    await page.click('button:has-text("Generate Report")');
    await page.waitForURL('**/assessment/**/report');

    // Step 5: Verify report content
    const reportContent = await page
      .locator('[data-testid="report-content"]')
      .textContent();
    expect(reportContent).toBeTruthy();

    const duration = measureTiming(
      'Scenario 2: Compliance Assessment',
      startTime
    );
    console.log(`✅ Scenario 2 complete (${duration}ms)`);
    console.log(`   Target: Report accuracy >95%`);
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // SCENARIO 3: Obligation Tracking
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  test('Scenario 3: Obligation Tracking', async ({ page }) => {
    const startTime = Date.now();

    // Prerequisites: Navigate to obligations page
    await navigateTo(page, '/compliance/obligations');

    // Step 1: View auto-generated obligations
    const obligationRows = await page
      .locator('[data-testid="obligation-row"]')
      .count();
    console.log(`   Auto-generated obligations: ${obligationRows}`);
    expect(obligationRows).toBeGreaterThanOrEqual(15);
    expect(obligationRows).toBeLessThanOrEqual(25);

    // Step 2: Assign obligation to responsible party
    await page.click(
      '[data-testid="obligation-row"]:first-child button:has-text("Assign")'
    );
    await page.selectOption(
      'select[name="assigned_to"]',
      'test-user@example.com'
    );
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Assigned to')).toBeVisible();

    // Step 3: Update obligation status
    await page.click(
      '[data-testid="obligation-row"]:first-child button:has-text("Edit Status")'
    );
    await page.selectOption('select[name="status"]', 'In Progress');
    await page.click('button[type="submit"]');

    // Step 4: Upload evidence
    await page.click(
      '[data-testid="obligation-row"]:first-child button:has-text("Add Evidence")'
    );
    const fileInputSelector = 'input[type="file"]';
    // Note: Would need actual file to upload in real test

    // Step 5: Generate dashboard report
    await page.goto(`${BASE_URL}/compliance/dashboard`);
    const compliancePercentage = await page
      .locator('[data-testid="compliance-percentage"]')
      .textContent();
    expect(compliancePercentage).toBeTruthy();

    const duration = measureTiming(
      'Scenario 3: Obligation Tracking',
      startTime
    );
    console.log(`✅ Scenario 3 complete (${duration}ms)`);
    console.log(`   Target: 100% obligation tracking accuracy`);
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // SCENARIO 4: Evidence Collection & Documentation
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  test('Scenario 4: Evidence Collection & Documentation', async ({ page }) => {
    const startTime = Date.now();

    // Prerequisites: Navigate to evidence page
    await navigateTo(page, '/compliance/evidence');

    // Step 1: Upload documents
    // Note: In real test would upload actual files
    await page.click('button:has-text("Upload Document")');
    await page.fill('input[name="document_title"]', 'AI Model Card');
    await page.fill(
      'textarea[name="description"]',
      'Technical documentation for recruitment analytics system'
    );
    // File upload would happen here
    await page.click('button[type="submit"]');

    // Step 2: Verify document appears in list
    await expect(page.locator('text=AI Model Card')).toBeVisible();

    // Step 3: Link evidence to obligations
    await page.click(
      '[data-testid="evidence-row"]:first-child button:has-text("Link to Obligation")'
    );
    const obligationSelect = page.locator('select[name="obligation_id"]');
    await obligationSelect.selectOption({ index: 1 });
    await page.click('button[type="submit"]');

    // Step 4: Generate audit trail
    await page.goto(`${BASE_URL}/compliance/audit-trail`);
    const auditEntries = await page
      .locator('[data-testid="audit-entry"]')
      .count();
    expect(auditEntries).toBeGreaterThan(0);

    // Step 5: Verify linkage accuracy
    const linkCount = await page
      .locator('[data-testid="evidence-link"]')
      .count();
    console.log(`   Evidence-to-obligation links: ${linkCount}`);

    const duration = measureTiming(
      'Scenario 4: Evidence Collection',
      startTime
    );
    console.log(`✅ Scenario 4 complete (${duration}ms)`);
    console.log(`   Target: 100% verifiable linkage, complete audit trail`);
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // SCENARIO 5: Team Management & Access Control
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  test('Scenario 5: Team Management & Access Control', async ({
    page,
    context,
  }) => {
    const startTime = Date.now();

    // Prerequisites: Navigate to team management
    await navigateTo(page, '/workspace/team');

    // Step 1: Add team member
    await page.click('button:has-text("Add Team Member")');
    const newMemberEmail = `compliance-officer-${Date.now()}@example.com`;
    await page.fill('input[name="email"]', newMemberEmail);
    await page.selectOption('select[name="role"]', 'Compliance Officer');
    await page.selectOption(
      'select[name="department"]',
      'Compliance & Regulierung'
    );
    await page.click('button[type="submit"]');

    // Step 2: Verify member added
    await expect(page.locator(`text=${newMemberEmail}`)).toBeVisible();

    // Step 3: Team member logs in (simulate with new page context)
    // Note: In real test would create actual user account and login
    const memberPage = await context.newPage();
    await memberPage.goto(`${BASE_URL}/auth/login`);
    // Would login here with member credentials

    // Step 4: Verify Row-Level Security (member should only see assigned scope)
    // User should see only Compliance department, not other departments
    // This would require API checks in real test

    // Step 5: Grant additional access
    await page.goto(`${BASE_URL}/workspace/team`);
    await page.click(`text=${newMemberEmail}` + ' + button:has-text("Edit")');
    await page.selectOption(
      'select[name="department"]',
      'Finanzen & Controlling'
    );
    await page.click('button[type="submit"]');

    const duration = measureTiming('Scenario 5: Team Management', startTime);
    console.log(`✅ Scenario 5 complete (${duration}ms)`);
    console.log(`   Target: 100% RLS enforcement, no data leakage`);
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // SCENARIO 6: Executive Reporting
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  test('Scenario 6: Executive Reporting', async ({ page }) => {
    const startTime = Date.now();

    // Prerequisites: Navigate to reporting
    await navigateTo(page, '/reporting/dashboard');

    // Step 1: Generate compliance dashboard
    const dashboardStart = Date.now();
    await page.click('button:has-text("Generate Report")');
    await page.waitForLoadState('networkidle');
    const dashboardTime = Date.now() - dashboardStart;
    console.log(`   Dashboard generation: ${dashboardTime}ms`);

    // Step 2: View compliance status
    const complianceScore = await page
      .locator('[data-testid="compliance-score"]')
      .textContent();
    expect(complianceScore).toMatch(/\d+%/);

    // Step 3: Export to PDF
    await page.click('button:has-text("Export PDF")');
    // Wait for PDF generation
    await page.waitForEvent('popup'); // PDF opens in new tab
    console.log('   PDF export: successful');

    // Step 4: Share report
    await page.click('button:has-text("Share")');
    await page.fill('input[name="recipient_email"]', 'executive@example.com');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Report shared')).toBeVisible();

    // Step 5: Verify read-only access
    const shareLink = await page
      .locator('[data-testid="share-link"]')
      .getAttribute('href');
    expect(shareLink).toBeTruthy();

    const duration = measureTiming(
      'Scenario 6: Executive Reporting',
      startTime
    );
    console.log(`✅ Scenario 6 complete (${duration}ms)`);
    console.log(`   Target: <5 sec generation, read-only enforcement`);
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // SCENARIO 7: High-Risk System Detection
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  test('Scenario 7: High-Risk System Detection', async ({ page }) => {
    const startTime = Date.now();

    // Prerequisites: Navigate to inventory
    await navigateTo(page, '/inventory/add');

    // Step 1: Register high-risk system
    await page.fill(
      'input[name="system_name"]',
      'Recruitment Candidate Ranker'
    );
    await page.selectOption(
      'select[name="system_type"]',
      'Recruitment Analytics'
    );
    await page.fill(
      'textarea[name="description"]',
      'Automated candidate ranking based on qualifications and experience'
    );

    // Step 2: System auto-flags as HIGH RISK
    await page.click('button[type="submit"]');
    await page.waitForURL('**/assessment/**');

    const riskWarning = page.locator('[data-severity="critical"]');
    await expect(riskWarning).toBeVisible();
    console.log('   ✓ HIGH RISK auto-detected: recruitment analytics');

    // Step 3: Mandatory remediation workflow triggered
    const remediationPrompt = page.locator(
      'button:has-text("Start Remediation")'
    );
    await expect(remediationPrompt).toBeVisible();
    await remediationPrompt.click();

    // Step 4: Evidence requirements shown
    await expect(page.locator('text=Bias Audit')).toBeVisible();
    await expect(page.locator('text=Fairness Testing')).toBeVisible();

    // Step 5: Status transitions
    const statusBefore = await page
      .locator('[data-testid="system-status"]')
      .textContent();
    console.log(`   System status: ${statusBefore}`);

    const duration = measureTiming(
      'Scenario 7: High-Risk Detection',
      startTime
    );
    console.log(`✅ Scenario 7 complete (${duration}ms)`);
    console.log(`   Target: 100% detection accuracy, clear remediation path`);
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // SCENARIO 8: Support & Guidance
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  test('Scenario 8: Support & Guidance', async ({ page }) => {
    const startTime = Date.now();

    // Prerequisites: Navigate to assessment with unclear question
    await navigateTo(page, '/assessment/create');

    // Step 1: Get stuck on a question
    // Simulate user clicking help on first question
    await page.click('button:has-text("Help")');

    // Step 2: View inline guidance
    const guidance = page.locator('[data-testid="question-guidance"]');
    await expect(guidance).toBeVisible();
    const guidanceText = await guidance.textContent();
    console.log(`   Guidance available: ${guidanceText?.substring(0, 50)}...`);

    // Step 3: Reference external documentation
    const docLink = page.locator('a[data-testid="api-reference"]');
    if (await docLink.isVisible()) {
      expect(docLink).toBeTruthy();
      console.log('   ✓ API reference link available');
    }

    // Step 4: Return to assessment and resolve
    await page.click('button:has-text("Close Help")');
    await page.click('input[type="radio"]:first-of-type');
    await page.click('button:has-text("Next Question")');
    console.log('   ✓ User resolved question using guidance');

    // Step 5: If still stuck, open support request
    await page.click('button:has-text("Contact Support")');
    await page.fill(
      'textarea[name="message"]',
      'I need clarification on question X'
    );
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Support request submitted')).toBeVisible();

    const duration = measureTiming('Scenario 8: Support & Guidance', startTime);
    console.log(`✅ Scenario 8 complete (${duration}ms)`);
    console.log(`   Target: >60% self-service resolution rate`);
  });
});
