import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { cn, formatRelativeDate, formatAbsoluteDate } from '@/lib/utils';

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('a', 'b')).toBe('a b');
  });

  it('lets later Tailwind classes override earlier ones', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
  });

  it('handles conditional values', () => {
    expect(cn('a', false && 'b', undefined, null, 'c')).toBe('a c');
  });
});

describe('formatRelativeDate', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-09T12:00:00Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns em dash for null/undefined/empty', () => {
    expect(formatRelativeDate(null)).toBe('—');
    expect(formatRelativeDate(undefined)).toBe('—');
    expect(formatRelativeDate('')).toBe('—');
  });

  it('returns the raw string for unparseable dates', () => {
    expect(formatRelativeDate('not-a-date')).toBe('not-a-date');
  });

  it('returns "just now" for < 1 hour', () => {
    expect(formatRelativeDate('2026-07-09T11:30:00Z')).toBe('just now');
  });

  it('returns hours for < 24 hours', () => {
    expect(formatRelativeDate('2026-07-09T07:00:00Z')).toBe('5h ago');
  });

  it('returns days for < 7 days', () => {
    expect(formatRelativeDate('2026-07-06T12:00:00Z')).toBe('3d ago');
  });

  it('falls back to a locale date for >= 7 days', () => {
    const out = formatRelativeDate('2026-01-01T00:00:00Z');
    expect(out).toMatch(/2026/);
    expect(out).not.toMatch(/ago/);
  });
});

describe('formatAbsoluteDate', () => {
  it('returns em dash for null/undefined', () => {
    expect(formatAbsoluteDate(null)).toBe('—');
    expect(formatAbsoluteDate(undefined)).toBe('—');
  });

  it('returns the raw string for unparseable dates', () => {
    expect(formatAbsoluteDate('garbage')).toBe('garbage');
  });

  it('formats a valid ISO date', () => {
    expect(formatAbsoluteDate('2026-07-09T12:00:00Z')).toMatch(/2026/);
  });
});
