import { test, expect } from '@playwright/test';
import {
  HISTORY_OK,
  HISTORY_EMPTY,
  HISTORY_ERROR,
  HISTORY_ROWS,
} from './fixtures';

test.describe('history dashboard (/history)', () => {
  test('renders rows with counts derived from saved results, not the stored column', async ({
    page,
  }) => {
    await page.route('**/api/history?*', (route) =>
      route.fulfill({ json: HISTORY_OK })
    );
    await page.goto('/history');

    const firstRow = page.getByRole('row', {
      name: /artificial intelligence/,
    });
    await expect(firstRow).toBeVisible();
    // Fixture stores result_count=99 but only 2 results — the badge must say 2.
    await expect(firstRow.getByText('2', { exact: true })).toBeVisible();
    await expect(firstRow.getByText('99', { exact: true })).toBeHidden();
  });

  test('expanding a row reveals its saved articles', async ({ page }) => {
    await page.route('**/api/history?*', (route) =>
      route.fulfill({ json: HISTORY_OK })
    );
    await page.goto('/history');

    const expand = page.getByRole('button', {
      name: 'Expand results for "artificial intelligence"',
    });
    await expect(expand).toHaveAttribute('aria-expanded', 'false');
    await expand.click();
    await expect(
      page.getByRole('button', {
        name: 'Collapse results for "artificial intelligence"',
      })
    ).toHaveAttribute('aria-expanded', 'true');
    await expect(
      page.getByRole('link', { name: 'AI regulation moves forward in the EU' })
    ).toBeVisible();
  });

  test('keyword links to the saved-search detail page', async ({ page }) => {
    await page.route('**/api/history?*', (route) =>
      route.fulfill({ json: HISTORY_OK })
    );
    await page.goto('/history');
    await expect(
      page.getByRole('link', { name: 'artificial intelligence' })
    ).toHaveAttribute('href', `/history/${HISTORY_ROWS[0].id}`);
  });

  test('per-row delete removes the row after confirmation', async ({
    page,
  }) => {
    await page.route('**/api/history?*', (route) =>
      route.fulfill({ json: HISTORY_OK })
    );
    await page.route(`**/api/history/${HISTORY_ROWS[0].id}`, (route) =>
      route.fulfill({ json: { ok: true, deleted: HISTORY_ROWS[0].id } })
    );
    page.on('dialog', (dialog) => dialog.accept());
    await page.goto('/history');

    await page
      .getByRole('button', {
        name: 'Delete saved search "artificial intelligence"',
      })
      .click();
    await expect(
      page.getByRole('row', { name: /artificial intelligence/ })
    ).toBeHidden();
    // The other row survives.
    await expect(
      page.getByRole('row', { name: /quantum computing/ })
    ).toBeVisible();
  });

  test('an API failure shows an error — never a fake empty state', async ({
    page,
  }) => {
    await page.route('**/api/history?*', (route) =>
      route.fulfill({ status: 500, json: HISTORY_ERROR })
    );
    await page.goto('/history');

    await expect(
      page.getByRole('alert').filter({ hasText: /\S/ })
    ).toContainText(/Failed to load search history/);
    await expect(page.getByText('No searches yet')).toBeHidden();
  });

  test('a confirmed-empty history shows the empty state with CTA', async ({
    page,
  }) => {
    await page.route('**/api/history?*', (route) =>
      route.fulfill({ json: HISTORY_EMPTY })
    );
    await page.goto('/history');

    await expect(page.getByText('No searches yet')).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Start searching' })
    ).toHaveAttribute('href', '/');
    // Clear History must be disabled with nothing to clear.
    await expect(
      page.getByRole('button', { name: 'Clear History' })
    ).toBeDisabled();
  });
});
