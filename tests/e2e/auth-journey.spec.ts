import { test, expect } from '@playwright/test';

/**
 * Authenticated customer journey. Drives the real sign-in UI against the
 * mocked Supabase GoTrue endpoints, so the whole cookie-session path exercises
 * for real: @supabase/ssr persists the session, the middleware validates it via
 * getUser(), and the server-rendered dashboard reads the authenticated user.
 *
 * Proof of success: the dashboard greets the user by the name carried in their
 * validated session ("Welcome, Lalit") instead of redirecting back to sign-in.
 */
test('sign-in establishes a session that reaches the protected dashboard', async ({
  page,
}) => {
  await page.goto('/auth/signin');
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    'Welcome back'
  );

  await page.getByLabel('Email').fill('founder@acme.example');
  await page.getByLabel('Password').fill('correct-horse-battery');
  await page.getByRole('button', { name: 'Sign in' }).click();

  // Middleware must let the now-authenticated request through to /dashboard,
  // and the server component must render the greeting from the session.
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    'Welcome, Lalit'
  );
});

test('an authenticated user visiting an auth page is sent to the dashboard', async ({
  page,
}) => {
  // Establish a session first.
  await page.goto('/auth/signin');
  await page.getByLabel('Email').fill('founder@acme.example');
  await page.getByLabel('Password').fill('correct-horse-battery');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  // Middleware redirects signed-in users away from auth screens.
  await page.goto('/auth/signin');
  await expect(page).toHaveURL(/\/dashboard$/);
});
