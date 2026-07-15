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
  await page.goto('/auth/signin');
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    'Welcome back'
  );
});

test('API rate limiting returns 429 with headers once the write budget is exceeded', async ({
  request,
}) => {
  // The write budget is 20/min per IP. Fire enough to exceed it and confirm
  // the middleware starts rejecting with 429 + Retry-After, protecting the
  // workspace-creation endpoint from abuse.
  let sawRateLimit = false;
  let retryAfter: string | null = null;
  for (let i = 0; i < 30; i++) {
    const res = await request.post('/api/workspace', {
      data: { companyName: 'Flood GmbH', country: 'Germany', industry: 'Tech' },
    });
    if (res.status() === 429) {
      sawRateLimit = true;
      retryAfter = res.headers()['retry-after'];
      const body = await res.json();
      expect(body.ok).toBe(false);
      expect(res.headers()['x-ratelimit-limit']).toBe('20');
      break;
    }
    // Before the limit trips, unauthenticated requests are 401 (not 429).
    expect(res.status()).toBe(401);
  }
  expect(sawRateLimit).toBe(true);
  expect(retryAfter).toBeTruthy();
});
