import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

/**
 * Accessibility regression guard. Every page a prospective customer can reach
 * without signing in is scanned with axe-core against WCAG 2.1 A/AA. For an
 * EU AI Act compliance product, an inaccessible marketing/onboarding surface
 * is both a bad first impression and a compliance own-goal — so we keep these
 * pages clean by test, not by hope.
 *
 * axe-core is injected into the page rather than imported so it runs in the
 * real browser DOM. Playwright runs from the repo root, so the source path is
 * resolved relative to cwd.
 */
const AXE_SOURCE = readFileSync('node_modules/axe-core/axe.min.js', 'utf8');

const PAGES: Array<[string, string]> = [
  ['/', 'landing'],
  ['/auth/signin', 'sign in'],
  ['/auth/signup', 'sign up'],
  ['/auth/reset', 'password-reset request'],
  ['/auth/reset-password', 'set-new-password'],
  ['/auth/verify-email?email=e2e%40example.com', 'verify email'],
  ['/privacy', 'privacy'],
  ['/terms', 'terms'],
];

for (const [path, name] of PAGES) {
  test(`${name} page has no WCAG 2.1 A/AA accessibility violations`, async ({
    page,
  }) => {
    await page.goto(path, { waitUntil: 'networkidle' });
    await page.addScriptTag({ content: AXE_SOURCE });

    const violations = await page.evaluate(async () => {
      const axe = (window as any).axe;
      const results = await axe.run(document, {
        runOnly: {
          type: 'tag',
          values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'],
        },
      });
      return results.violations.map((v: any) => ({
        id: v.id,
        impact: v.impact,
        help: v.help,
        nodes: v.nodes.map((n: { target: string[] }) => n.target.join(' ')),
      }));
    });

    // Attach details so a failure names the exact rule + element.
    expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
  });
}
