import { describe, expect, it } from 'vitest';
import { cn, formatAbsoluteDate, formatRelativeDate } from '@/lib/utils';

describe('cn', () => {
  it('joins truthy class values', () => {
    expect(cn('a', 'b')).toBe('a b');
  });

  it('drops falsy values', () => {
    expect(cn('a', false, undefined, null, 'b')).toBe('a b');
  });

  it('lets later Tailwind classes win over conflicting earlier ones', () => {
    // twMerge should collapse conflicting padding utilities to the last one.
    expect(cn('p-2', 'p-4')).toBe('p-4');
  });
});

describe('formatRelativeDate', () => {
  it('returns an em dash for empty input', () => {
    expect(formatRelativeDate(null)).toBe('—');
    expect(formatRelativeDate(undefined)).toBe('—');
  });

  it('returns the raw string when the date is unparseable', () => {
    expect(formatRelativeDate('not-a-date')).toBe('not-a-date');
  });

  it('formats sub-hour differences as "just now"', () => {
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    expect(formatRelativeDate(tenMinAgo)).toBe('just now');
  });

  it('formats hour differences', () => {
    const threeHoursAgo = new Date(
      Date.now() - 3 * 60 * 60 * 1000
    ).toISOString();
    expect(formatRelativeDate(threeHoursAgo)).toBe('3h ago');
  });

  it('formats day differences under a week', () => {
    const twoDaysAgo = new Date(
      Date.now() - 2 * 24 * 60 * 60 * 1000
    ).toISOString();
    expect(formatRelativeDate(twoDaysAgo)).toBe('2d ago');
  });

  it('falls back to an absolute date beyond a week', () => {
    const longAgo = new Date(
      Date.now() - 30 * 24 * 60 * 60 * 1000
    ).toISOString();
    const out = formatRelativeDate(longAgo);
    expect(out).not.toMatch(/ago|just now/);
    expect(out.length).toBeGreaterThan(0);
  });
});

describe('formatAbsoluteDate', () => {
  it('returns an em dash for empty input', () => {
    expect(formatAbsoluteDate(null)).toBe('—');
  });

  it('returns the raw string when unparseable', () => {
    expect(formatAbsoluteDate('nope')).toBe('nope');
  });

  it('renders a real date to a non-empty string containing the year', () => {
    const out = formatAbsoluteDate('2025-03-14T12:00:00.000Z');
    expect(out).toContain('2025');
  });
});
