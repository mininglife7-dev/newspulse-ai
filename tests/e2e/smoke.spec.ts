import { test, expect } from '@playwright/test';

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

test('unauthenticated visit to /dashboard redirects to sign-in', async ({
  page,
}) => {
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/auth\/signin\?redirect=%2Fdashboard/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    'Welcome back'
  );
});

test('unauthenticated visit to /workspace/setup redirects to sign-in', async ({
  page,
}) => {
  await page.goto('/workspace/setup');
  await expect(page).toHaveURL(/\/auth\/signin/);
});

test('unauthenticated POST /api/workspace returns 401 JSON, not a redirect', async ({
  request,
}) => {
  const res = await request.post('/api/workspace', {
    data: {
      companyName: 'Acme GmbH',
      country: 'Germany',
      industry: 'Manufacturing',
    },
  });
  expect(res.status()).toBe(401);
  const body = await res.json();
  expect(body.ok).toBe(false);
});

test('auth pages render for signed-out visitors', async ({ page }) => {
  await page.goto('/auth/signup');
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    'Create your account'
  );
  // The consent checkbox must link to the real legal pages, not dead anchors —
  // users are agreeing to terms they must be able to read. Scope to the form
  // (main) so the footer's own legal links don't create an ambiguous match.
  const main = page.getByRole('main');
  await expect(
    main.getByRole('link', { name: 'Terms of Service' })
  ).toHaveAttribute('href', '/terms');
  await expect(
    main.getByRole('link', { name: 'Privacy Policy' })
  ).toHaveAttribute('href', '/privacy');

  await page.goto('/auth/signin');
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    'Welcome back'
  );
});
