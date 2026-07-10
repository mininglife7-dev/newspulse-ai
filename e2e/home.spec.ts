import { test, expect, type Page } from '@playwright/test';
import { SEARCH_OK, SEARCH_UNSAVED, SEARCH_EMPTY } from './fixtures';

// Next.js injects an always-present, empty route announcer with role=alert;
// filter to alerts that actually say something.
const errorAlert = (page: Page) =>
  page.getByRole('alert').filter({ hasText: /\S/ });

test.describe('search dashboard (/)', () => {
  test('renders hero, nav, search form and suggestions', async ({ page }) => {
    await page.goto('/');
    await expect(
      page.getByRole('heading', { level: 1, name: /Search\. Scrape\./ })
    ).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible();
    await expect(page.getByLabel('Search keyword')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Tesla' })).toBeVisible();
  });

  test('search renders results labeled with the searched query', async ({
    page,
  }) => {
    await page.route('**/api/search', (route) =>
      route.fulfill({ json: SEARCH_OK })
    );
    await page.goto('/');
    await page.getByLabel('Search keyword').fill('ai');
    await page.getByRole('button', { name: /^Search$/ }).click();

    await expect(page.getByText('2 results for')).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'AI regulation moves forward in the EU' })
    ).toBeVisible();
    // Persistence succeeded — no save warning.
    await expect(page.getByText(/couldn't be saved/)).toBeHidden();

    // Retyping without searching must NOT relabel the results.
    await page.getByLabel('Search keyword').fill('something else');
    await expect(page.getByText('2 results for')).toBeVisible();
    await expect(page.getByText('"ai"')).toBeVisible();
  });

  test('shows a persistence warning when history save failed', async ({
    page,
  }) => {
    await page.route('**/api/search', (route) =>
      route.fulfill({ json: SEARCH_UNSAVED })
    );
    await page.goto('/');
    await page.getByLabel('Search keyword').fill('ai');
    await page.getByRole('button', { name: /^Search$/ }).click();

    await expect(page.getByRole('status')).toContainText(
      /couldn't be saved to your history/
    );
    // Results are still shown — save failure never hides real data.
    await expect(page.getByText('2 results for')).toBeVisible();
  });

  test('zero results renders a neutral empty state, not an error', async ({
    page,
  }) => {
    await page.route('**/api/search', (route) =>
      route.fulfill({ json: SEARCH_EMPTY })
    );
    await page.goto('/');
    await page.getByLabel('Search keyword').fill('zzz');
    await page.getByRole('button', { name: /^Search$/ }).click();

    await expect(page.getByText('No results for "zzz"')).toBeVisible();
    await expect(errorAlert(page)).toBeHidden();
  });

  test('a real API failure surfaces an honest error banner', async ({
    page,
  }) => {
    // No interception: the credential-less server returns a real 500.
    await page.goto('/');
    await page.getByLabel('Search keyword').fill('anything');
    await page.getByRole('button', { name: /^Search$/ }).click();

    await expect(errorAlert(page)).toBeVisible();
    await expect(page.getByText(/results? for/)).toBeHidden();
  });

  test('suggestion chips run the search immediately', async ({ page }) => {
    let requestedKeyword: string | undefined;
    await page.route('**/api/search', async (route) => {
      requestedKeyword = route.request().postDataJSON()?.keyword;
      await route.fulfill({ json: { ...SEARCH_OK, keyword: 'Tesla' } });
    });
    await page.goto('/');
    await page.getByRole('button', { name: 'Tesla' }).click();

    await expect(page.getByText('2 results for')).toBeVisible();
    expect(requestedKeyword).toBe('Tesla');
  });

  test('?q= deep link auto-runs the search once', async ({ page }) => {
    let calls = 0;
    await page.route('**/api/search', (route) => {
      calls++;
      return route.fulfill({ json: SEARCH_OK });
    });
    await page.goto('/?q=ai');
    await expect(page.getByText('2 results for')).toBeVisible();
    expect(calls).toBe(1);
  });

  test('no CSP violations while exercising the app', async ({ page }) => {
    const violations: string[] = [];
    page.on('console', (msg) => {
      if (/Content.Security.Policy|Refused to/i.test(msg.text())) {
        violations.push(msg.text());
      }
    });
    await page.route('**/api/search', (route) =>
      route.fulfill({ json: SEARCH_OK })
    );
    await page.goto('/');
    // Interactivity proves hydration ran — scripts were not blocked.
    await page.getByLabel('Search keyword').fill('ai');
    await page.getByRole('button', { name: /^Search$/ }).click();
    await expect(page.getByText('2 results for')).toBeVisible();
    expect(violations).toEqual([]);
  });

  test('skip link is the first tab stop on pages without autofocus', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'keyboard navigation is a desktop concern');
    // The search page intentionally autofocuses its input (keyboard users
    // land directly in main content), so exercise the skip link on /history.
    await page.route('**/api/history?*', (route) =>
      route.fulfill({ json: { ok: true, count: 0, history: [] } })
    );
    await page.goto('/history');
    await page.keyboard.press('Tab');
    await expect(
      page.getByRole('link', { name: 'Skip to content' })
    ).toBeFocused();
  });
});
