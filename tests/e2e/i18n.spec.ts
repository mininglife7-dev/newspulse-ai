import { test, expect } from '@playwright/test';

/**
 * German customer journey. A browser advertising `de-DE` must auto-render the
 * UI in German (no manual toggle), and the explicit switcher must flip it back
 * to English. This is the core "a German customer would confidently use it"
 * guarantee, verified in a real browser.
 */
test.describe('German localization', () => {
  test.use({ locale: 'de-DE' });

  test('auto-detects German from the browser and localizes the home page', async ({
    page,
  }) => {
    await page.goto('/');

    // Hero headline localized (auto-detected, no interaction).
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      'Zusammenfassen'
    );
    // <html lang> reflects the active locale for assistive tech + SEO.
    await expect(page.locator('html')).toHaveAttribute('lang', 'de');
    // Nav is translated.
    await expect(
      page.getByRole('link', { name: 'Verlauf' })
    ).toBeVisible();
    // The German switcher button is the active one.
    await expect(page.getByRole('button', { name: 'Deutsch' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });

  test('switching to English updates the UI and html lang', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'English' }).click();

    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      'Summarize'
    );
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });
});
