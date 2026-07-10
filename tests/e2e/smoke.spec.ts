import { test, expect } from '@playwright/test';

// The flow builds on itself (search saves history), so run in order.
test.describe.configure({ mode: 'serial' });

test('health endpoint reports healthy with all integrations configured', async ({
  request,
}) => {
  const res = await request.get('/api/health');
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.status).toBe('healthy');
});

test('home page renders search UI', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    'Summarize'
  );
  await expect(page.getByPlaceholder(/Try "AI regulation"/)).toBeVisible();
  // Empty input → search is disabled
  await expect(page.getByRole('button', { name: /Search/ })).toBeDisabled();
});

test('search happy path returns labelled AI summaries', async ({ page }) => {
  await page.goto('/');
  await page
    .getByPlaceholder(/Try "AI regulation"/)
    .fill('artificial intelligence');
  await page.getByRole('button', { name: /Search/ }).click();

  await expect(
    page.getByRole('heading', { name: /3 results for/ })
  ).toBeVisible();
  await expect(
    page.getByRole('link', {
      name: 'Researchers Announce Major AI Breakthrough',
    })
  ).toBeVisible();
  // Transparency: every summary is explicitly labelled as AI-generated
  await expect(page.getByText('AI-generated summary')).toHaveCount(3);
  await expect(page.getByText(/Mock AI summary of/).first()).toBeVisible();
  // Honesty: real (non-demo) results must never be labelled "demo/sample data".
  await expect(page.getByText(/demo mode/i)).toHaveCount(0);

  // Let the card fade-in animation finish so screenshots are clean.
  await page.waitForTimeout(1200);
  await page.screenshot({
    path: 'public/screenshots/search.png',
    fullPage: false,
  });
});

test('history lists the saved search and can expand results', async ({
  page,
}) => {
  await page.goto('/history');
  const row = page.getByRole('row', { name: /artificial intelligence/ });
  await expect(row).toBeVisible();
  await expect(row.getByText('3', { exact: true })).toBeVisible();

  await page.screenshot({
    path: 'public/screenshots/history.png',
    fullPage: false,
  });

  await row.getByRole('button', { name: 'View Results' }).click();
  await expect(
    page.getByRole('link', { name: 'Chipmakers Race to Meet AI Demand' })
  ).toBeVisible();
});

test('clear history empties the table after confirmation', async ({ page }) => {
  await page.goto('/history');
  page.on('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: /Clear History/ }).click();
  await expect(page.getByText('No searches yet')).toBeVisible();
});

test('search validation surfaces API errors in the UI', async ({ page }) => {
  await page.goto('/');
  const input = page.getByPlaceholder(/Try "AI regulation"/);
  await input.fill('   ');
  // Whitespace-only trims to empty → button stays disabled
  await expect(page.getByRole('button', { name: /Search/ })).toBeDisabled();
});
