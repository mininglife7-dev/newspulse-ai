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

test('home page renders landing page with governance messaging', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    'AI Governance'
  );
  // Check for CTA buttons
  await expect(page.getByRole('link', { name: /Start Free Trial/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /Learn More/ })).toBeVisible();
});
