import { test, expect } from '@playwright/test';
import { HISTORY_EMPTY, SEARCH_OK } from './fixtures.mjs';

test.describe('navigation & layout', () => {
  test('header nav navigates between search and history', async ({ page }) => {
    await page.route('**/api/history?*', (route) =>
      route.fulfill({ json: HISTORY_EMPTY })
    );
    await page.goto('/');
    await page
      .getByRole('navigation', { name: 'Main' })
      .getByRole('link', { name: 'History' })
      .click();
    await expect(page).toHaveURL(/\/history$/);
    await expect(
      page.getByRole('heading', { level: 1, name: 'Search History' })
    ).toBeVisible();
    // Client-side navigation announces the new page title to screen readers.
    await expect(page.locator('#__next-route-announcer__')).toHaveText(
      'Search History — NewsPulse AI'
    );

    await page
      .getByRole('navigation', { name: 'Main' })
      .getByRole('link', { name: 'Search' })
      .click();
    await expect(page.getByLabel('Search keyword')).toBeVisible();
  });

  test('error boundary renders with working buttons on server failure', async ({
    page,
  }) => {
    // No interception and no DB credentials → the detail page's server
    // component throws and the client error boundary must take over.
    await page.goto('/history/00000000-0000-4000-8000-000000000000');
    await expect(page.getByText('Something went wrong')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
    await page.getByRole('link', { name: 'Back home' }).click();
    await expect(page.getByLabel('Search keyword')).toBeVisible();
  });

  test('unknown routes render the 404 page with working links', async ({
    page,
  }) => {
    const res = await page.goto('/this-page-does-not-exist');
    expect(res?.status()).toBe(404);
    await expect(page.getByText('Page not found')).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Start a new search' })
    ).toHaveAttribute('href', '/');
    await expect(
      page.getByRole('link', { name: 'View history' })
    ).toHaveAttribute('href', '/history');
  });

  test.describe('responsive layout', () => {
    for (const path of ['/', '/history']) {
      test(`no horizontal overflow on ${path}`, async ({ page }) => {
        await page.route('**/api/history?*', (route) =>
          route.fulfill({ json: HISTORY_EMPTY })
        );
        await page.goto(path);
        const overflow = await page.evaluate(
          () =>
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth
        );
        expect(overflow).toBe(0);
      });
    }

    test('search results grid stays within the viewport', async ({ page }) => {
      await page.route('**/api/search', (route) =>
        route.fulfill({ json: SEARCH_OK })
      );
      await page.goto('/?q=ai');
      await expect(page.getByText('2 results for')).toBeVisible();
      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth
      );
      expect(overflow).toBe(0);
    });
  });
});
