import { test, expect } from '@playwright/test';
import { cn, formatRelativeDate, formatAbsoluteDate } from '../lib/utils';
import { extractDomain, extractPublishedDate } from '../lib/firecrawl';

/**
 * Unit coverage for pure lib helpers, run through the Playwright test
 * runner (native TS, no extra deps, no browser needed). These edge cases
 * are unreachable from the UI-level e2e specs.
 */

test.describe('lib/utils', () => {
  test('formatRelativeDate buckets past timestamps', () => {
    const now = Date.now();
    expect(formatRelativeDate(new Date(now - 10 * 60_000).toISOString())).toBe(
      'just now'
    );
    expect(
      formatRelativeDate(new Date(now - 3 * 3_600_000).toISOString())
    ).toBe('3h ago');
    expect(
      formatRelativeDate(new Date(now - 2 * 86_400_000).toISOString())
    ).toBe('2d ago');
    // A week or older falls back to an absolute date (contains the year).
    const old = formatRelativeDate(
      new Date(now - 30 * 86_400_000).toISOString()
    );
    expect(old).toMatch(/\d{4}/);
    expect(old).not.toMatch(/ago|just now/);
  });

  test('formatRelativeDate never claims a future date is "just now"', () => {
    const future = new Date(Date.now() + 2 * 86_400_000).toISOString();
    const label = formatRelativeDate(future);
    expect(label).not.toBe('just now');
    expect(label).toMatch(/\d{4}/);
  });

  test('formatRelativeDate handles missing and invalid input', () => {
    expect(formatRelativeDate(null)).toBe('—');
    expect(formatRelativeDate(undefined)).toBe('—');
    expect(formatRelativeDate('')).toBe('—');
    // Unparseable input is surfaced verbatim, never fabricated.
    expect(formatRelativeDate('not-a-date')).toBe('not-a-date');
  });

  test('formatAbsoluteDate formats and degrades honestly', () => {
    expect(formatAbsoluteDate('2026-07-01T10:30:00.000Z')).toMatch(/2026/);
    expect(formatAbsoluteDate(null)).toBe('—');
    expect(formatAbsoluteDate('garbage')).toBe('garbage');
  });

  test('cn merges conflicting Tailwind classes (later wins)', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
    expect(cn('text-red-300', false && 'hidden', 'font-bold')).toBe(
      'text-red-300 font-bold'
    );
  });
});

test.describe('lib/firecrawl helpers', () => {
  test('extractDomain strips www and survives invalid URLs', () => {
    expect(extractDomain('https://www.bbc.com/news/article')).toBe('bbc.com');
    expect(extractDomain('https://example.org/x?y=1')).toBe('example.org');
    // Invalid input is returned verbatim rather than throwing mid-render.
    expect(extractDomain('not a url')).toBe('not a url');
  });

  test('extractPublishedDate normalizes to ISO and rejects garbage', () => {
    expect(
      extractPublishedDate({
        url: 'https://a.com',
        metadata: { publishedTime: '2026-07-01T10:00:00Z' },
      })
    ).toBe('2026-07-01T10:00:00.000Z');
    expect(
      extractPublishedDate({
        url: 'https://a.com',
        metadata: { 'article:published_time': '2026-07-02T08:00:00Z' },
      })
    ).toBe('2026-07-02T08:00:00.000Z');
    expect(
      extractPublishedDate({
        url: 'https://a.com',
        metadata: { publishedTime: 'yesterday-ish' },
      })
    ).toBeNull();
    expect(extractPublishedDate({ url: 'https://a.com' })).toBeNull();
  });
});
